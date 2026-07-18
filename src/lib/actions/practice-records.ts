"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { AuthorizationError, getOwnStudentProfileId, toClientError } from "../authz";

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
