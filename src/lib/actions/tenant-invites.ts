"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertMentor, toClientError, ValidationError } from "../authz";
import { sendAuthEmail } from "../auth-email";

// テナント（塾）へのメンター招待。
// 招待されたメールでサインアップすると、provisionUser が同じワークスペースへ参加させる。

const INVITE_TTL_DAYS = 14;

export async function getTenantInvites() {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const invites = await prisma.tenantInvite.findMany({
      where: { tenantId: user.tenantId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, expiresAt: true, acceptedAt: true, createdAt: true }
    });
    // 同じワークスペースの現メンター一覧も返す
    const mentors = await prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { not: "STUDENT" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    return {
      success: true,
      invites: JSON.parse(JSON.stringify(invites)),
      mentors: JSON.parse(JSON.stringify(mentors))
    };
  } catch (error) {
    console.error("Failed to list tenant invites:", error);
    return { success: false, invites: [], mentors: [], error: toClientError(error, "招待一覧の取得に失敗しました") };
  }
}

export async function createTenantInvite(email: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const normalized = (email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      throw new ValidationError("メールアドレスの形式が正しくありません");
    }

    // 既に同テナントのメンバーなら不要
    const existingMember = await prisma.user.findFirst({
      where: { email: normalized, tenantId: user.tenantId },
      select: { id: true }
    });
    if (existingMember) throw new ValidationError("この方は既にこのワークスペースのメンバーです");

    // 生徒として招待済みのメールは使えない（役割が衝突するため）
    const asStudent = await prisma.studentProfile.findUnique({
      where: { studentEmail: normalized },
      select: { id: true }
    });
    if (asStudent) throw new ValidationError("このメールは生徒の招待用に登録されています");

    // 既存の有効な招待があれば再送扱いで作り直す
    await prisma.tenantInvite.updateMany({
      where: { tenantId: user.tenantId, email: normalized, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.tenantInvite.create({
      data: { tenantId: user.tenantId, email: normalized, token, invitedByUserId: user.id, expiresAt }
    });

    // 招待メールを送る（失敗しても招待自体は有効なので握りつぶさず通知だけする）
    const signUpUrl = `${process.env.BETTER_AUTH_URL || "https://compass.p-quest.com"}/sign-up`;
    let emailError: string | null = null;
    try {
      await sendAuthEmail({
        to: normalized,
        subject: `【Scholar Compass】${user.tenant?.name ?? "ワークスペース"}への招待`,
        heading: "指導ワークスペースへの招待",
        body: `${user.name} さんから「${user.tenant?.name ?? "ワークスペース"}」への参加に招待されました。下のボタンから、このメールアドレス（${normalized}）で登録してください。登録後、自動的に同じワークスペースに参加します。`,
        actionLabel: "登録して参加する",
        actionUrl: signUpUrl
      });
    } catch (mailError) {
      console.error("Invite mail failed:", mailError);
      emailError = "招待は作成しましたが、メール送信に失敗しました。登録用URLを直接お伝えください。";
    }

    revalidatePath("/settings");
    return { success: true, emailError, signUpUrl };
  } catch (error) {
    console.error("Failed to create tenant invite:", error);
    return { success: false, error: toClientError(error, "招待の作成に失敗しました") };
  }
}

export async function revokeTenantInvite(inviteId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const invite = await prisma.tenantInvite.findFirst({
      where: { id: inviteId, tenantId: user.tenantId },
      select: { id: true }
    });
    if (!invite) throw new ValidationError("対象の招待が見つかりません");

    await prisma.tenantInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke tenant invite:", error);
    return { success: false, error: toClientError(error, "招待の取り消しに失敗しました") };
  }
}
