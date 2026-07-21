"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertStudentAccess, toClientError, ValidationError } from "../authz";
import { SELF_PROFILE_KEYS, type SelfProfileInput } from "../self-profile-fields";

// 自己分析・将来ビジョンの保存。生徒本人・担当メンターの双方が編集できる（1生徒1レコード）。

const MAX_FIELD = 2000;

export async function getSelfProfile(studentId: string) {
  try {
    const user = await getCurrentUser();
    await assertStudentAccess(user, studentId);
    const profile = await prisma.studentSelfProfile.findUnique({ where: { studentProfileId: studentId } });
    return { success: true, profile: profile ? JSON.parse(JSON.stringify(profile)) : null };
  } catch (error) {
    console.error("Failed to fetch self profile:", error);
    return { success: false, profile: null, error: toClientError(error, "自己分析の取得に失敗しました") };
  }
}

export async function saveSelfProfile(studentId: string, input: SelfProfileInput) {
  try {
    const user = await getCurrentUser();
    await assertStudentAccess(user, studentId);

    // 許可されたキーのみ抽出・検証
    const data: Record<string, string | null> = {};
    for (const key of SELF_PROFILE_KEYS) {
      const value = input[key];
      if (value !== undefined) {
        if (value.length > MAX_FIELD) {
          throw new ValidationError(`各項目は${MAX_FIELD}字以内で入力してください`);
        }
        data[key] = value.trim() || null;
      }
    }

    await prisma.studentSelfProfile.upsert({
      where: { studentProfileId: studentId },
      create: { studentProfileId: studentId, ...data },
      update: data
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    console.error("Failed to save self profile:", error);
    return { success: false, error: toClientError(error, "自己分析の保存に失敗しました") };
  }
}
