"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertMentor, toClientError, ValidationError } from "../authz";
import { FIELD_CATEGORIES } from "../field-category";
import {
  containsInterviewCharacterLimit,
  countCharacters,
  getInterviewMainQuestion,
  hasMultipleInterviewQuestions
} from "../practice-evaluation";

// -----------------------------------------------------------------------------
// 問題バンク管理（メンター専用）
// ルール:
//   - 共通問題（tenantId=null）は編集・状態変更不可。「コピーして編集」のみ
//   - 削除は物理削除せず status="ARCHIVED"（演習記録は設問文を自前保存しているため影響なし）
// -----------------------------------------------------------------------------

const MANAGED_STATUSES = new Set(["ACTIVE", "PENDING", "ARCHIVED"]);
const MAX_PROMPT_CHARS = 4000;

export interface QuestionBankEditInput {
  title: string;
  prompt: string;
  fieldCategory: string | null;
  university: string | null;
  modelAnswer: string | null;
  followUpQuestions: string | null;
}

function validateEditInput(category: string, input: QuestionBankEditInput) {
  if (!input.title?.trim()) throw new ValidationError("タイトルを入力してください");
  if (input.title.trim().length > 60) throw new ValidationError("タイトルは60字以内で入力してください");
  if (!input.prompt?.trim()) throw new ValidationError("設問本文を入力してください");
  if (countCharacters(input.prompt) > MAX_PROMPT_CHARS) {
    throw new ValidationError(`設問は${MAX_PROMPT_CHARS}字以内で入力してください`);
  }
  if (input.fieldCategory && !(FIELD_CATEGORIES as readonly string[]).includes(input.fieldCategory)) {
    throw new ValidationError("系統ラベルが不正です");
  }
  if (input.university && input.university.length > 100) {
    throw new ValidationError("大学・学部名は100字以内で入力してください");
  }
  if (category === "面接") {
    const mainQuestion = getInterviewMainQuestion(input.prompt);
    if (hasMultipleInterviewQuestions(input.prompt)) {
      throw new ValidationError("面接は一問一答です。主質問を1問だけにしてください（深掘りは深掘り欄へ）");
    }
    if (containsInterviewCharacterLimit(mainQuestion)) {
      throw new ValidationError("面接の主質問に文字数指定は付けられません");
    }
  } else if (input.followUpQuestions?.trim()) {
    throw new ValidationError("深掘り質問は面接のみ設定できます");
  }
}

export async function getQuestionBankAdminList() {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const questions = await prisma.questionBank.findMany({
      where: { OR: [{ tenantId: null }, { tenantId: user.tenantId }] },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 1000,
      select: {
        id: true,
        tenantId: true,
        category: true,
        title: true,
        prompt: true,
        source: true,
        status: true,
        university: true,
        fieldCategory: true,
        followUpQuestions: true,
        difficulty: true,
        modelAnswer: true,
        createdByUserId: true,
        createdAt: true
      }
    });
    return { success: true, questions: JSON.parse(JSON.stringify(questions)) };
  } catch (error) {
    console.error("Failed to list question bank:", error);
    return { success: false, questions: [], error: toClientError(error, "問題一覧の取得に失敗しました") };
  }
}

// テナント所有の問題のみ編集できる（共通問題はコピーして編集）
export async function updateQuestionBankEntry(questionId: string, input: QuestionBankEditInput) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const question = await prisma.questionBank.findFirst({
      where: { id: questionId, tenantId: user.tenantId },
      select: { id: true, category: true }
    });
    if (!question) {
      throw new ValidationError("編集できるのは自テナントの問題だけです。共通問題は「コピーして編集」を使ってください");
    }
    validateEditInput(question.category, input);

    await prisma.questionBank.update({
      where: { id: question.id },
      data: {
        title: input.title.trim(),
        prompt: input.prompt.trim(),
        fieldCategory: input.fieldCategory || null,
        university: input.university?.trim() || null,
        modelAnswer: input.modelAnswer?.trim() || null,
        followUpQuestions: input.followUpQuestions?.trim() || null
      }
    });

    revalidatePath("/settings/question-bank");
    revalidatePath("/portal");
    revalidatePath("/materials");
    return { success: true };
  } catch (error) {
    console.error("Failed to update question:", error);
    return { success: false, error: toClientError(error, "問題の更新に失敗しました") };
  }
}

// 承認（PENDING→ACTIVE）・アーカイブ・復元。テナント所有の問題のみ
export async function setQuestionBankStatus(questionId: string, status: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    if (!MANAGED_STATUSES.has(status)) throw new ValidationError("不正な状態です");

    const question = await prisma.questionBank.findFirst({
      where: { id: questionId, tenantId: user.tenantId },
      select: { id: true }
    });
    if (!question) {
      throw new ValidationError("状態を変更できるのは自テナントの問題だけです");
    }

    await prisma.questionBank.update({ where: { id: question.id }, data: { status } });

    revalidatePath("/settings/question-bank");
    revalidatePath("/portal");
    revalidatePath("/materials");
    return { success: true };
  } catch (error) {
    console.error("Failed to set question status:", error);
    return { success: false, error: toClientError(error, "状態の変更に失敗しました") };
  }
}

// 共通問題（またはテナント問題）を自テナストへ複製し、編集可能にする
export async function copyQuestionBankEntry(questionId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const source = await prisma.questionBank.findFirst({
      where: { id: questionId, OR: [{ tenantId: null }, { tenantId: user.tenantId }] }
    });
    if (!source) throw new ValidationError("コピー元の問題が見つかりません");

    const created = await prisma.questionBank.create({
      data: {
        tenantId: user.tenantId,
        category: source.category,
        title: `${source.title}（コピー）`.slice(0, 60),
        prompt: source.prompt,
        source: "CUSTOM",
        status: "ACTIVE",
        university: source.university,
        fieldCategory: source.fieldCategory,
        followUpQuestions: source.followUpQuestions,
        difficulty: source.difficulty,
        modelAnswer: source.modelAnswer,
        createdByUserId: user.id
      }
    });

    revalidatePath("/settings/question-bank");
    return { success: true, questionId: created.id };
  } catch (error) {
    console.error("Failed to copy question:", error);
    return { success: false, error: toClientError(error, "問題のコピーに失敗しました") };
  }
}
