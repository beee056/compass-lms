"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import {
  AuthorizationError,
  ValidationError,
  assertMentor,
  assertStudentAccess,
  toClientError
} from "../authz";
import { startOfDayJST } from "../dates";

// 授業・面談記録（講師記入）。旧スプレッドシート「授業記録」タブに対応。
// 生徒は閲覧のみ、作成・編集・削除はメンター専用。

export interface LessonLogInput {
  lessonDate: string; // "2026-07-19"
  startTime?: string;
  endTime?: string;
  content: string;
  homework?: string;
  nextPlan?: string;
  memo?: string;
}

const MAX_TEXT = 5000;

function validate(input: LessonLogInput): Date {
  if (!input.lessonDate) throw new ValidationError("授業日を入力してください");
  const date = startOfDayJST(input.lessonDate);
  if (!date || Number.isNaN(date.getTime())) throw new ValidationError("授業日の形式が正しくありません");
  if (!input.content?.trim()) throw new ValidationError("「授業でやったこと」を入力してください");
  for (const [label, value] of [
    ["授業でやったこと", input.content],
    ["宿題", input.homework],
    ["次回授業", input.nextPlan],
    ["メモ", input.memo]
  ] as const) {
    if (value && value.length > MAX_TEXT) throw new ValidationError(`${label}は${MAX_TEXT}字以内で入力してください`);
  }
  const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;
  for (const [label, value] of [["開始時間", input.startTime], ["終了時間", input.endTime]] as const) {
    if (value && !timePattern.test(value)) throw new ValidationError(`${label}は HH:MM 形式で入力してください`);
  }
  return date;
}

export async function getLessonLogs(studentId: string) {
  try {
    const user = await getCurrentUser();
    await assertStudentAccess(user, studentId);
    const logs = await prisma.lessonLog.findMany({
      where: { studentProfileId: studentId },
      orderBy: { lessonDate: "desc" },
      take: 200
    });
    return { success: true, logs: JSON.parse(JSON.stringify(logs)) };
  } catch (error) {
    console.error("Failed to fetch lesson logs:", error);
    return { success: false, logs: [], error: toClientError(error, "授業記録の取得に失敗しました") };
  }
}

export async function createLessonLog(studentId: string, input: LessonLogInput) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);
    const lessonDate = validate(input);

    await prisma.lessonLog.create({
      data: {
        studentProfileId: studentId,
        authorUserId: user.id,
        authorName: user.name,
        lessonDate,
        startTime: input.startTime?.trim() || null,
        endTime: input.endTime?.trim() || null,
        content: input.content.trim(),
        homework: input.homework?.trim() || null,
        nextPlan: input.nextPlan?.trim() || null,
        memo: input.memo?.trim() || null
      }
    });

    await prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        studentProfileId: studentId,
        action: "LESSON_LOGGED",
        details: `${user.name}が授業記録を追加しました`
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    console.error("Failed to create lesson log:", error);
    return { success: false, error: toClientError(error, "授業記録の保存に失敗しました") };
  }
}

async function findAuthorizedLessonLog(userTenantId: string, logId: string) {
  const log = await prisma.lessonLog.findUnique({
    where: { id: logId },
    include: { studentProfile: { select: { id: true, tenantId: true } } }
  });
  if (!log || log.studentProfile.tenantId !== userTenantId) {
    throw new AuthorizationError("対象の授業記録が見つかりません");
  }
  return log;
}

export async function updateLessonLog(logId: string, input: LessonLogInput) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const log = await findAuthorizedLessonLog(user.tenantId, logId);
    const lessonDate = validate(input);

    await prisma.lessonLog.update({
      where: { id: log.id },
      data: {
        lessonDate,
        startTime: input.startTime?.trim() || null,
        endTime: input.endTime?.trim() || null,
        content: input.content.trim(),
        homework: input.homework?.trim() || null,
        nextPlan: input.nextPlan?.trim() || null,
        memo: input.memo?.trim() || null
      }
    });

    revalidatePath(`/students/${log.studentProfileId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    console.error("Failed to update lesson log:", error);
    return { success: false, error: toClientError(error, "授業記録の更新に失敗しました") };
  }
}

export async function deleteLessonLog(logId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const log = await findAuthorizedLessonLog(user.tenantId, logId);
    await prisma.lessonLog.delete({ where: { id: log.id } });

    revalidatePath(`/students/${log.studentProfileId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lesson log:", error);
    return { success: false, error: toClientError(error, "授業記録の削除に失敗しました") };
  }
}
