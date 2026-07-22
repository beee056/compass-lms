"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { auth } from "../auth";
import { getCurrentUser } from "../actions";
import { ValidationError, assertMentor, assertStudentAccess, toClientError } from "../authz";

// 生徒ポータルへの招待リンク（メール不要）。
// - トークンは推測不能なランダム値（192bit）。有効期限は発行から30日
// - リンクを開いた生徒がサインイン/登録し「参加する」と、そのUserを生徒プロフィールへ紐付ける

const INVITE_TTL_DAYS = 30;

export async function createStudentInvite(studentId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);

    // 未使用の既存トークンは失効させ、常に最新の1本だけ有効にする
    await prisma.studentInviteToken.updateMany({
      where: { studentProfileId: studentId, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.studentInviteToken.create({
      data: { token, studentProfileId: studentId, createdByUserId: user.id, expiresAt }
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true, token, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    console.error("Failed to create student invite:", error);
    return { success: false, error: toClientError(error, "招待リンクの発行に失敗しました") };
  }
}

export async function revokeStudentInvite(tokenId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const invite = await prisma.studentInviteToken.findFirst({
      where: { id: tokenId, studentProfile: { tenantId: user.tenantId } },
      select: { id: true, studentProfileId: true }
    });
    if (!invite) throw new ValidationError("対象のリンクが見つかりません");

    await prisma.studentInviteToken.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
    revalidatePath(`/students/${invite.studentProfileId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke student invite:", error);
    return { success: false, error: toClientError(error, "リンクの失効に失敗しました") };
  }
}

// ログイン済みの本人を、招待トークンの生徒プロフィールへ紐付ける。
// 新規サインアップ直後は provisionUser により「抜け殻メンター」になっているため、
// それを生徒アカウントへ変換し、抜け殻テナントは片付ける。
export async function claimStudentInvite(token: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, needAuth: true as const };
    const authUserId = session.user.id;

    const invite = await prisma.studentInviteToken.findUnique({
      where: { token },
      include: { studentProfile: { select: { id: true, name: true, tenantId: true, userId: true } } }
    });
    if (!invite || invite.revokedAt || invite.usedAt || invite.expiresAt < new Date()) {
      return { success: false, error: "この招待リンクは無効です（期限切れ・使用済み・失効のいずれか）。" };
    }

    const student = invite.studentProfile;

    // 既に別のアカウントがこの生徒に紐付いている場合は拒否
    if (student.userId && student.userId !== authUserId) {
      return { success: false, error: "この生徒には既に別のアカウントが紐付いています。担当者へご連絡ください。" };
    }
    // 既にこの生徒本人なら成功扱い（トークンだけ消費）
    if (student.userId === authUserId) {
      await prisma.studentInviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
      return { success: true };
    }

    const me = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { id: true, tenantId: true, role: true }
    });
    if (!me) return { success: false, error: "ユーザーが見つかりません。" };

    // 既に実運用中のメンターテナント（生徒や他メンターがいる）を持つアカウントは、
    // 誤って生徒化しないよう拒否する
    const previousTenantId = me.tenantId;
    if (previousTenantId && previousTenantId !== student.tenantId) {
      const [studentCount, otherUserCount] = await Promise.all([
        prisma.studentProfile.count({ where: { tenantId: previousTenantId } }),
        prisma.user.count({ where: { tenantId: previousTenantId, id: { not: authUserId } } })
      ]);
      const abandonable = studentCount === 0 && otherUserCount === 0;
      if (!abandonable) {
        return {
          success: false,
          error: "このアカウントは既に指導者として使われています。別のメールアドレスで登録し直して招待リンクを開いてください。"
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({ where: { id: student.id }, data: { userId: authUserId } });
      await tx.user.update({
        where: { id: authUserId },
        data: { role: "STUDENT", tenantId: student.tenantId, name: student.name }
      });
      await tx.studentInviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    });

    // 抜け殻メンターテナントの片付け（ベストエフォート。失敗しても紐付けは成立済み）
    if (previousTenantId && previousTenantId !== student.tenantId) {
      try {
        const prev = await prisma.tenant.findUnique({
          where: { id: previousTenantId },
          select: { _count: { select: { students: true, users: true } } }
        });
        if (prev && prev._count.students === 0 && prev._count.users === 0) {
          await prisma.activityLog.deleteMany({ where: { tenantId: previousTenantId } });
          await prisma.taskTemplate.deleteMany({ where: { tenantId: previousTenantId } });
          await prisma.tenantInvite.deleteMany({ where: { tenantId: previousTenantId } });
          await prisma.tenant.delete({ where: { id: previousTenantId } });
        }
      } catch (cleanupError) {
        console.error("抜け殻テナントの片付けに失敗（紐付けは成立済み）:", cleanupError);
      }
    }

    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    console.error("Failed to claim student invite:", error);
    return { success: false, error: toClientError(error, "招待の受け取りに失敗しました") };
  }
}
