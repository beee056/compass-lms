"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import {
  AuthorizationError,
  ValidationError,
  assertActiveTenant,
  assertMentor,
  assertStudentAccess,
  getOwnStudentProfileId,
  toClientError
} from "../authz";

// 演習記録のソフトデリート（非表示）。物理削除はしない。
// 生徒: 自分の記録のみ / メンター: 自テナントの生徒の記録のみ
export async function setPracticeRecordArchived(recordId: string, archived: boolean) {
  try {
    const user = await getCurrentUser();
    const record = await prisma.practiceRecord.findUnique({
      where: { id: recordId },
      include: { studentProfile: { select: { id: true, tenantId: true } } }
    });
    if (!record || record.studentProfile.tenantId !== user.tenantId) {
      throw new AuthorizationError("対象の記録が見つかりません");
    }
    if (user.role === "STUDENT") {
      const ownId = await getOwnStudentProfileId(user);
      if (record.studentProfileId !== ownId) {
        throw new AuthorizationError();
      }
    }

    await prisma.practiceRecord.update({
      where: { id: record.id },
      data: { isArchived: archived }
    });

    revalidatePath(`/students/${record.studentProfileId}`);
    revalidatePath(`/portal`);
    return { success: true };
  } catch (error) {
    console.error("Failed to archive practice record:", error);
    return { success: false, error: toClientError(error, "記録の操作に失敗しました") };
  }
}

// 問題バンクの問題を生徒の課題（タスク）として割り当てる（メンター専用）。
// 生徒がその問題で添削を提出すると自動で完了になる。
export async function assignPracticeTask(studentId: string, questionId: string, dueDate?: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);
    await assertActiveTenant(user);

    const question = await prisma.questionBank.findFirst({
      where: {
        id: questionId,
        status: "ACTIVE",
        OR: [{ tenantId: null }, { tenantId: user.tenantId }]
      },
      select: { id: true, title: true, category: true }
    });
    if (!question) throw new ValidationError("割り当てる問題が見つかりません");

    // 同じ問題の未完了課題があれば重複割当しない
    const existing = await prisma.task.findFirst({
      where: { studentProfileId: studentId, questionBankId: question.id, completed: false },
      select: { id: true }
    });
    if (existing) throw new ValidationError("この問題は既に未完了の課題として割当済みです");

    const parsedDueDate = dueDate ? new Date(`${dueDate}T00:00:00+09:00`) : null;
    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      throw new ValidationError("期限の日付が不正です");
    }

    await prisma.task.create({
      data: {
        studentProfileId: studentId,
        title: `【演習】${question.category}: ${question.title}`,
        type: "TODO",
        dueDate: parsedDueDate,
        questionBankId: question.id
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/portal`);
    return { success: true };
  } catch (error) {
    console.error("Failed to assign practice task:", error);
    return { success: false, error: toClientError(error, "課題の割当に失敗しました") };
  }
}

// 良かった生徒答案を、その問題の模範解答（参考答案）として採用する（メンター専用）。
// 生徒名は含めない。共通問題には登録できない（コピーして編集で自テナント版を作る）。
export async function adoptAnswerAsModelAnswer(recordId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const record = await prisma.practiceRecord.findUnique({
      where: { id: recordId },
      include: { studentProfile: { select: { tenantId: true } } }
    });
    if (!record || record.studentProfile.tenantId !== user.tenantId) {
      throw new AuthorizationError("対象の記録が見つかりません");
    }
    if (!record.questionBankId) {
      throw new ValidationError("この記録は問題バンクの問題に紐づいていません");
    }

    const question = await prisma.questionBank.findFirst({
      where: { id: record.questionBankId, tenantId: user.tenantId },
      select: { id: true, modelAnswer: true }
    });
    if (!question) {
      throw new ValidationError("共通問題には参考答案を登録できません。「コピーして編集」で自テナント版を作成してから採用してください");
    }

    const referenceBlock = `【参考答案（採点${record.score ?? "-"}点の答案より採用）】\n${record.answer.trim()}`;
    const modelAnswer = question.modelAnswer?.trim()
      ? `${question.modelAnswer.trim()}\n\n${referenceBlock}`
      : referenceBlock;

    await prisma.questionBank.update({
      where: { id: question.id },
      data: { modelAnswer }
    });

    revalidatePath("/settings/question-bank");
    return { success: true };
  } catch (error) {
    console.error("Failed to adopt answer as model answer:", error);
    return { success: false, error: toClientError(error, "参考答案の登録に失敗しました") };
  }
}
