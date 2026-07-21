"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertMentor, findAuthorizedUniversity, toClientError, ValidationError } from "../authz";
import { startOfDayJST } from "../dates";
import type { Prisma } from "@prisma/client";
import {
  PROGRESS_STATUSES,
  DECLINE_POLICIES,
  DEADLINE_TYPES,
  type AdmissionInput
} from "../admissions-constants";

// 出願管理（旧管理シート「入試状況」タブに対応）。
// 大学ごとの出願実務（要否書類・期限・進捗）を記録する。生徒は閲覧のみ、編集はメンター専用。

const MAX_TEXT = 2000;

function parseOptionalDate(value?: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = startOfDayJST(value);
  if (!date) throw new ValidationError("日付の形式が正しくありません");
  return date;
}

function validate(input: AdmissionInput) {
  if (input.declinePolicy !== undefined && !DECLINE_POLICIES.includes(input.declinePolicy as any)) {
    throw new ValidationError("辞退可否の値が不正です");
  }
  if (input.deadlineType !== undefined && !DEADLINE_TYPES.includes(input.deadlineType as any)) {
    throw new ValidationError("期限区分の値が不正です");
  }
  if (input.progressStatus !== undefined && !PROGRESS_STATUSES.includes(input.progressStatus as any)) {
    throw new ValidationError("進捗状況の値が不正です");
  }
  for (const [label, value] of [
    ["出願条件", input.applicationRequirements],
    ["その他必要書類", input.otherDocuments],
    ["進捗メモ", input.progressNote]
  ] as const) {
    if (value && value.length > MAX_TEXT) throw new ValidationError(`${label}は${MAX_TEXT}字以内で入力してください`);
  }
  if (input.examName && input.examName.length > 100) throw new ValidationError("入試の名称は100字以内で入力してください");
}

async function syncAdmissionMilestone(
  tx: Prisma.TransactionClient,
  university: { id: string; studentProfileId: string; name: string; department: string },
  kind: "applicationDeadline" | "mentorSubmissionDueDate",
  date: Date | null | undefined,
  deadlineRule?: string | null
) {
  if (date === undefined) return;

  const sourceKey = `university:${university.id}:${kind}`;
  if (date === null) {
    await tx.milestone.deleteMany({ where: { sourceKey } });
    return;
  }

  const isOfficialDeadline = kind === "applicationDeadline";
  const universityLabel = `${university.name} ${university.department}`;
  await tx.milestone.upsert({
    where: { sourceKey },
    create: {
      studentProfileId: university.studentProfileId,
      universityId: university.id,
      title: isOfficialDeadline
        ? `【${universityLabel}】出願締切`
        : `【${universityLabel}】講師への書類提出`,
      date,
      status: "TODO",
      type: isOfficialDeadline ? "出願締切" : "塾内締切",
      sourceKind: "ADMISSION",
      sourceKey,
      deadlineRule: isOfficialDeadline ? deadlineRule || null : null
    },
    update: {
      title: isOfficialDeadline
        ? `【${universityLabel}】出願締切`
        : `【${universityLabel}】講師への書類提出`,
      date,
      deadlineRule: isOfficialDeadline ? deadlineRule || null : null
    }
  });
}

export async function updateAdmission(universityId: string, input: AdmissionInput) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const university = await findAuthorizedUniversity(user, universityId);
    validate(input);

    const applicationDeadline = parseOptionalDate(input.applicationDeadline);
    const mentorSubmissionDueDate = parseOptionalDate(input.mentorSubmissionDueDate);

    await prisma.$transaction(async (tx) => {
      const updatedUniversity = await tx.university.update({
        where: { id: universityId },
        data: {
        ...(input.examName !== undefined ? { examName: input.examName.trim() || null } : {}),
        ...(input.openCampusAttended !== undefined ? { openCampusAttended: input.openCampusAttended } : {}),
        ...(input.applicationRequirements !== undefined
          ? { applicationRequirements: input.applicationRequirements.trim() || null }
          : {}),
        ...(input.declinePolicy !== undefined ? { declinePolicy: input.declinePolicy || null } : {}),
        ...(input.needsMotivationLetter !== undefined ? { needsMotivationLetter: input.needsMotivationLetter } : {}),
        ...(input.needsSelfRecommendation !== undefined
          ? { needsSelfRecommendation: input.needsSelfRecommendation }
          : {}),
        ...(input.needsActivityReport !== undefined ? { needsActivityReport: input.needsActivityReport } : {}),
        ...(input.otherDocuments !== undefined ? { otherDocuments: input.otherDocuments.trim() || null } : {}),
        ...(applicationDeadline !== undefined ? { applicationDeadline } : {}),
        ...(input.deadlineType !== undefined ? { deadlineType: input.deadlineType || null } : {}),
        ...(mentorSubmissionDueDate !== undefined ? { mentorSubmissionDueDate } : {}),
        ...(input.progressStatus !== undefined ? { progressStatus: input.progressStatus } : {}),
        ...(input.progressNote !== undefined ? { progressNote: input.progressNote.trim() || null } : {})
        }
      });

      await syncAdmissionMilestone(
        tx,
        updatedUniversity,
        "applicationDeadline",
        applicationDeadline,
        input.deadlineType !== undefined ? input.deadlineType : updatedUniversity.deadlineType
      );
      await syncAdmissionMilestone(
        tx,
        updatedUniversity,
        "mentorSubmissionDueDate",
        mentorSubmissionDueDate
      );
    });

    revalidatePath(`/students/${university.studentProfileId}`);
    revalidatePath("/portal");
    revalidatePath("/");
    revalidatePath("/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to update admission:", error);
    return { success: false, error: toClientError(error, "出願情報の更新に失敗しました") };
  }
}
