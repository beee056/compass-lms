"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { ValidationError, assertMentor, assertStudentAccess, toClientError } from "../authz";

// 保護者向け閲覧専用リンクの管理（メンター専用）
// - トークンは推測不能なランダム値（192bit）
// - 有効期限は発行から90日。失効はいつでも可能
// - 公開ページに出すのは進捗サマリーのみ（連絡先・答案本文・添削本文は含まない）

const LINK_TTL_DAYS = 90;

export async function createShareLink(studentId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);

    const activeCount = await prisma.sharedAccessToken.count({
      where: { studentProfileId: studentId, revokedAt: null, expiresAt: { gt: new Date() } }
    });
    if (activeCount >= 3) {
      throw new ValidationError("有効な共有リンクは3件までです。不要なリンクを失効してください");
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.sharedAccessToken.create({
      data: {
        token,
        studentProfileId: studentId,
        createdByUserId: user.id,
        expiresAt
      }
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true, token, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    console.error("Failed to create share link:", error);
    return { success: false, error: toClientError(error, "共有リンクの発行に失敗しました") };
  }
}

export async function revokeShareLink(tokenId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const link = await prisma.sharedAccessToken.findFirst({
      where: { id: tokenId, studentProfile: { tenantId: user.tenantId } },
      select: { id: true, studentProfileId: true }
    });
    if (!link) throw new ValidationError("対象のリンクが見つかりません");

    await prisma.sharedAccessToken.update({
      where: { id: link.id },
      data: { revokedAt: new Date() }
    });

    revalidatePath(`/students/${link.studentProfileId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke share link:", error);
    return { success: false, error: toClientError(error, "リンクの失効に失敗しました") };
  }
}
