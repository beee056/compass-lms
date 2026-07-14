"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { generateObject } from "ai";
import { z } from "zod";
import { getCurrentUser } from "../actions";
import { assertMentor, assertStudentAccess, toClientError, ValidationError } from "../authz";
import { getAIModel } from "../ai-model";
import { RUBRICS, computeTotalScore, LEVEL_LABEL, type PracticeKind } from "../rubrics";

// -----------------------------------------------------------------------------
// AI添削（ルーブリック方式）
// PIVOT&QUEST ルーブリック評価表（共通5軸 + 種別固有軸、レベル1-4）に基づき、
// 総合点 = 共通60% + 固有40%（4=1.0, 3=0.75, 2=0.5, 1=0.25換算）で採点する。
// -----------------------------------------------------------------------------

const MAX_PROMPT_CHARS = 4000;
const MAX_ANSWER_CHARS = 10000;

function resolveKind(type: string): PracticeKind {
  if (type === "小論文") return "小論文";
  if (type === "面接") return "面接";
  // 「志望理由書」「自己PR」等は志望理由書ルーブリックで評価
  return "志望理由書";
}

function buildAxisSchema(labels: { key: string; label: string }[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const a of labels) {
    shape[a.key] = z.object({
      level: z.number().int().min(1).max(4).describe(`「${a.label}」のレベル判定 (1=未達, 2=要改善, 3=良好, 4=優秀)`),
      comment: z.string().describe(`「${a.label}」の判定根拠。解答からの具体的な引用や箇所の指摘を含めること`)
    });
  }
  return z.object(shape);
}

export async function evaluateWithRubric(
  studentId: string,
  type: string,
  promptText: string,
  answer: string,
  options?: { universityName?: string; charLimit?: number; questionId?: string }
) {
  try {
    // 生徒は自分自身、メンターは自テナントの生徒のみ添削可能
    const user = await getCurrentUser();
    await assertStudentAccess(user, studentId);

    if (!promptText.trim() || !answer.trim()) {
      throw new ValidationError("設問と解答を入力してください");
    }
    if (promptText.length > MAX_PROMPT_CHARS || answer.length > MAX_ANSWER_CHARS) {
      throw new ValidationError(`入力が長すぎます（設問${MAX_PROMPT_CHARS}字・解答${MAX_ANSWER_CHARS}字以内）`);
    }

    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) throw new Error("Student not found");

    // 問題バンクから選択された場合は模範解答の要点を採点参照に使う（テナントスコープで取得）
    let modelAnswerRef: string | null = null;
    if (options?.questionId) {
      const q = await prisma.questionBank.findFirst({
        where: {
          id: options.questionId,
          OR: [{ tenantId: null }, { tenantId: user.tenantId }]
        },
        select: { modelAnswer: true }
      });
      modelAnswerRef = q?.modelAnswer ?? null;
    }

    const kind = resolveKind(type);
    const rubric = RUBRICS[kind];
    const evaluableAxes = [...rubric.commonAxes, ...rubric.specificAxes].filter((a) => a.aiEvaluable);

    // ルーブリックをプロンプトに展開
    const axisText = evaluableAxes
      .map(
        (a) =>
          `■ ${a.label}（${a.focus}）\n` +
          `  Lv.4(優秀): ${a.levels["4"]}\n` +
          `  Lv.3(良好): ${a.levels["3"]}\n` +
          `  Lv.2(要改善): ${a.levels["2"]}\n` +
          `  Lv.1(未達): ${a.levels["1"]}`
      )
      .join("\n\n");

    const notesText = rubric.gradingNotes.map((n) => `- ${n}`).join("\n");

    const systemPrompt = `あなたは大学受験の総合型選抜（旧AO入試）の専門プロ指導者です。
生徒が提出した「${kind}」の演習を、以下のルーブリックに基づいて厳しく、かつ建設的に添削してください。

【評価軸とレベル基準（各軸をLv.1〜4で判定）】
${axisText}

【評価上の注意】
${notesText}
${options?.universityName ? `\n【志望大学・学部】${options.universityName}（この大学の求める人材像・出題意図との一致度も講評に含めること）` : ""}
${options?.charLimit ? `\n【規定字数】${options.charLimit}字（解答は${answer.length}字。8割未満は「字数・完成度」等で減点対象）` : `\n【参考】解答の文字数: ${answer.length}字`}
${modelAnswerRef ? `\n【模範解答の要点・採点ポイント（参照用・生徒には非公開）】\n${modelAnswerRef}` : ""}

判定は甘くしないこと。レベル4は「模範的」水準にのみ与え、根拠には必ず解答内の具体的な記述を引用すること。
コメント・講評はすべて日本語で、生徒本人に語りかける丁寧な文体で書くこと。`;

    const schema = z.object({
      axes: buildAxisSchema(evaluableAxes.map((a) => ({ key: a.key, label: a.label }))),
      strengths: z.array(z.string()).describe("強み・評価点（2〜3個。解答の具体箇所を根拠に）"),
      improvements: z.array(z.string()).describe("改善点・課題（2〜3個。最も点数が伸びる順に）"),
      nextActions: z.array(z.string()).describe("具体的な次アクション（2〜3個。「〜を書き直す」等、今日から実行できる粒度で）"),
      overallFeedback: z.string().describe("総評（4〜6文。まず良い点、次に最重要の改善点、最後に励まし）"),
      ...(kind === "小論文"
        ? {
            deductions: z
              .array(
                z.object({
                  severity: z.enum(["大幅", "小幅"]).describe("減点の程度"),
                  item: z.string().describe("減点項目（例: 文体の混在、設問趣旨とのズレ）"),
                  detail: z.string().describe("該当箇所の指摘")
                })
              )
              .describe("小論文評価観点シートに基づく減点事項（該当がなければ空配列）")
          }
        : {}),
      ...(kind === "志望理由書"
        ? {
            checklist: z
              .array(
                z.object({
                  category: z.string().describe("要点カテゴリ名"),
                  coverage: z.enum(["十分", "部分的", "不足"]).describe("カバー状況"),
                  comment: z.string().describe("一言コメント")
                })
              )
              .describe(`志望理由書要点ガイドの大項目ごとのカバレッジ判定。カテゴリ: ${rubric.checklistCategories?.join(" / ")}`)
          }
        : {})
    });

    const { object: evaluation } = await generateObject({
      model: getAIModel(),
      schema,
      system: systemPrompt,
      prompt: `【設問/テーマ】\n${promptText}\n\n【生徒の解答】\n${answer}`
    });

    // レベル → 総合点（共通60% + 固有40%）
    const levels: Record<string, number> = {};
    for (const [key, v] of Object.entries(evaluation.axes as Record<string, { level: number }>)) {
      levels[key] = v.level;
    }
    const totalScore = computeTotalScore(rubric, levels);

    // 保存形式 v2（UIはversionで新旧を判別）
    const feedbackPayload = {
      version: 2,
      kind,
      universityName: options?.universityName || null,
      axes: (
        [...rubric.commonAxes, ...rubric.specificAxes]
      ).map((a) => {
        const result = (evaluation.axes as Record<string, { level: number; comment: string }>)[a.key];
        return {
          key: a.key,
          label: a.label,
          focus: a.focus,
          group: rubric.commonAxes.some((c) => c.key === a.key) ? "common" : "specific",
          aiEvaluable: a.aiEvaluable,
          level: result?.level ?? null,
          levelLabel: result ? LEVEL_LABEL[result.level] : null,
          comment: result?.comment ?? (a.aiEvaluable ? null : "対面演習でメンターが評価する項目です")
        };
      }),
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      nextActions: evaluation.nextActions,
      overallFeedback: evaluation.overallFeedback,
      deductions: (evaluation as any).deductions ?? null,
      checklist: (evaluation as any).checklist ?? null
    };

    const record = await prisma.practiceRecord.create({
      data: {
        id: `prac-${randomUUID()}`,
        studentProfileId: studentId,
        type,
        prompt: promptText,
        answer,
        score: totalScore,
        feedback: JSON.stringify(feedbackPayload)
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/portal`);

    return { success: true, recordId: record.id };
  } catch (error: any) {
    console.error("AI Evaluation failed:", error);
    return { success: false, error: toClientError(error, "添削の実行に失敗しました。時間をおいて再度お試しください") };
  }
}

// 旧APIの互換ラッパー（既存の呼び出し箇所が残っていても動くように）
export async function evaluatePractice(studentId: string, type: string, promptText: string, answer: string) {
  return evaluateWithRubric(studentId, type, promptText, answer);
}

// -----------------------------------------------------------------------------
// 問題生成（過去問の出題傾向を踏まえたAI生成。メンター専用）
// 生成された問題は QuestionBank に保存され、テナント内の演習で利用できる。
// ※実際の過去問の複製ではなく「出題傾向を踏まえたオリジナル問題」であることをUIで明示する。
// -----------------------------------------------------------------------------

export async function generatePracticeQuestion(params: {
  kind: string;
  universityName?: string;
  theme?: string;
  charLimit?: number;
}) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const kind = resolveKind(params.kind);
    if (params.theme && params.theme.length > 200) {
      throw new ValidationError("テーマは200字以内で入力してください");
    }
    if (params.universityName && params.universityName.length > 100) {
      throw new ValidationError("大学名は100字以内で入力してください");
    }

    const uni = params.universityName?.trim();
    const theme = params.theme?.trim();
    const charLimit = params.charLimit && params.charLimit > 0 ? params.charLimit : kind === "小論文" ? 800 : 800;

    const kindInstruction =
      kind === "面接"
        ? `面接の想定質問セットを作成してください。基本質問から深掘り質問まで5問程度を、実際の面接の流れ（導入→志望動機→深掘り→時事/学問関心→逆質問誘導）に沿って構成してください。`
        : kind === "小論文"
          ? `小論文の設問を1問作成してください。課題文の要約（3〜5文）+ 設問文（「〜についてあなたの考えを${charLimit}字以内で述べなさい」形式）の構成にしてください。`
          : `志望理由書の演習お題を1問作成してください。「あなたが本学を志望する理由と入学後に取り組みたいことを${charLimit}字で述べなさい」を基本形に、指定条件を織り込んでください。`;

    const schema = z.object({
      title: z.string().describe("問題の短いタイトル（一覧表示用、30字以内）"),
      prompt: z.string().describe("設問本文（生徒に表示する完全な問題文）"),
      modelAnswerOutline: z.string().describe("模範解答の要点・構成例（採点時の参照用。箇条書き5〜8項目）"),
      gradingFocus: z.string().describe("この問題で特に見るべき採点ポイント（2〜3文）")
    });

    const { object: q } = await generateObject({
      model: getAIModel(),
      schema,
      system: `あなたは大学受験の総合型選抜（旧AO入試）の出題・指導のプロです。日本語で出力してください。
${uni ? `対象は「${uni}」です。この大学・学部の実際の出題傾向（テーマの傾向・形式・字数）とアドミッション・ポリシーを踏まえた、過去問に近い形式のオリジナル問題を作成してください。実在の過去問をそのまま複製してはいけません。` : "特定の大学を想定しない汎用的な良問を作成してください。"}`,
      prompt: `${kindInstruction}${theme ? `\n\n【扱うテーマ・分野】${theme}` : ""}`
    });

    const created = await prisma.questionBank.create({
      data: {
        tenantId: user.tenantId,
        category: kind,
        title: uni ? `【${uni}】${q.title}` : q.title,
        prompt: q.prompt,
        source: "AI_GENERATED",
        university: uni || null,
        modelAnswer: `${q.modelAnswerOutline}\n\n【採点ポイント】\n${q.gradingFocus}`
      }
    });

    revalidatePath(`/students`);
    revalidatePath(`/portal`);

    return { success: true, questionId: created.id, title: created.title };
  } catch (error: any) {
    console.error("Question generation failed:", error);
    return { success: false, error: toClientError(error, "問題の生成に失敗しました。時間をおいて再度お試しください") };
  }
}

export async function getPracticeRecords(studentId: string) {
  try {
    const user = await getCurrentUser();
    await assertStudentAccess(user, studentId);

    const records = await prisma.practiceRecord.findMany({
      where: { studentProfileId: studentId },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, records };
  } catch (error: any) {
    console.error("Failed to fetch practice records:", error);
    return { success: false, records: [] };
  }
}
