"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// APIキーを環境変数から取得（なければエラー）
// .env または Vercel Dashboard に GOOGLE_GENERATIVE_AI_API_KEY を設定している想定

const rubricPrompt = `
あなたは大学受験の総合型選抜（旧AO入試）の専門プロ指導者です。
生徒が提出した小論文または志望理由書を、以下のルーブリックに基づいて厳しく、かつ建設的に添削してください。

【評価観点（各100点満点）】
1. 論理的思考力・一貫性 (Logical Thinking): 結論と根拠が明確か。論理の飛躍がないか。
2. 問題意識・独自性 (Originality): 当事者意識があり、独自の視点や深い洞察があるか。
3. 表現力・形式 (Expression): 誤字脱字、主語述語のねじれがないか。語彙が適切か。

生徒の回答を読み、各観点のスコア（0-100）、各観点に対するコメント、そして全体的なフィードバックと具体的な改善アクションを提案してください。
`;

const evaluationSchema = z.object({
  scores: z.object({
    logicalThinking: z.number().describe("論理的思考力・一貫性のスコア (0-100)"),
    originality: z.number().describe("問題意識・独自性のスコア (0-100)"),
    expression: z.number().describe("表現力・形式のスコア (0-100)"),
  }),
  comments: z.object({
    logicalThinking: z.string().describe("論理的思考力・一貫性に対する具体的なコメント"),
    originality: z.string().describe("問題意識・独自性に対する具体的なコメント"),
    expression: z.string().describe("表現力・形式に対する具体的なコメント"),
  }),
  overallFeedback: z.string().describe("全体的な評価と講評"),
  actionableAdvice: z.array(z.string()).describe("次に生徒が取るべき具体的な改善アクション（3つ程度）")
});

export async function evaluatePractice(studentId: string, type: string, promptText: string, answer: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // 生徒情報を確認
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId }
    });
    if (!student) throw new Error("Student not found");

    // AIで添削を実行
    const { object: evaluation } = await generateObject({
      model: google("gemini-1.5-pro"),
      schema: evaluationSchema,
      system: rubricPrompt,
      prompt: `
【問題/設問】
${promptText}

【生徒の解答】
${answer}
      `
    });

    // 総合スコア（平均）を計算
    const totalScore = Math.round(
      (evaluation.scores.logicalThinking + 
       evaluation.scores.originality + 
       evaluation.scores.expression) / 3
    );

    // データベースに保存
    const record = await prisma.practiceRecord.create({
      data: {
        id: `prac-${Date.now()}`, // UUIDではなくシンプルなプレフィックス
        studentProfileId: studentId,
        type,
        prompt: promptText,
        answer,
        score: totalScore,
        feedback: JSON.stringify(evaluation)
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/portal`);

    return { success: true, recordId: record.id };
  } catch (error: any) {
    console.error("AI Evaluation failed:", error);
    return { success: false, error: error.message || "添削の実行に失敗しました" };
  }
}

export async function getPracticeRecords(studentId: string) {
  try {
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
