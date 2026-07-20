"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertMentor, getRestrictedStudentIds, toClientError, AuthorizationError, ValidationError } from "../authz";
import { sendAuthEmail } from "../auth-email";

// テナント（塾）へのメンター招待。
// 招待されたメールでサインアップすると、provisionUser が同じワークスペースへ参加させる。
// 招待の時点でオーナー（フルアクセス講師）が「フルアクセス」か「特定の生徒だけ」かを選択する。

const INVITE_TTL_DAYS = 14;

// 限定アクセス講師は他人を招待・生徒割当を管理できない（自分が見えない生徒を渡せてしまうため）
function assertCanManageAccess(user: { hasFullTenantAccess?: boolean }) {
  if (user.hasFullTenantAccess === false) {
    throw new AuthorizationError("この操作はフルアクセス権限を持つ講師のみ行えます");
  }
}

export async function getTenantInvites() {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const invites = await prisma.tenantInvite.findMany({
      where: { tenantId: user.tenantId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        grantFullAccess: true,
        studentIds: true
      }
    });
    // 同じワークスペースの現メンター一覧（アクセス範囲付き）も返す
    const mentors = await prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { not: "STUDENT" } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        hasFullTenantAccess: true,
        studentAccess: { select: { studentProfileId: true } }
      }
    });
    // 招待・生徒割当のUIで使う「自分がアクセスできる生徒一覧」（限定アクセス講師は自分の割当分のみ）
    const restrictedIds = await getRestrictedStudentIds(user);
    const students = await prisma.studentProfile.findMany({
      where: { tenantId: user.tenantId, ...(restrictedIds ? { id: { in: restrictedIds } } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    });

    return {
      success: true,
      invites: JSON.parse(JSON.stringify(invites)),
      mentors: JSON.parse(
        JSON.stringify(
          mentors.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            hasFullTenantAccess: m.hasFullTenantAccess,
            assignedStudentIds: m.studentAccess.map((a) => a.studentProfileId)
          }))
        )
      ),
      students: JSON.parse(JSON.stringify(students)),
      canManageAccess: user.hasFullTenantAccess !== false
    };
  } catch (error) {
    console.error("Failed to list tenant invites:", error);
    return {
      success: false,
      invites: [],
      mentors: [],
      students: [],
      canManageAccess: false,
      error: toClientError(error, "招待一覧の取得に失敗しました")
    };
  }
}

export async function createTenantInvite(
  email: string,
  access: { grantFullAccess: boolean; studentIds: string[] }
) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    assertCanManageAccess(user);

    const normalized = (email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      throw new ValidationError("メールアドレスの形式が正しくありません");
    }
    if (!access.grantFullAccess && access.studentIds.length === 0) {
      throw new ValidationError("フルアクセスにしない場合は、共有する生徒を1名以上選択してください");
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

    // 招待者本人がアクセスできる生徒だけを渡せる（自分が見えない生徒を他人に渡せてしまうのを防ぐ）
    let studentIds: string[] = [];
    if (!access.grantFullAccess) {
      const restrictedIds = await getRestrictedStudentIds(user);
      const allowed = await prisma.studentProfile.findMany({
        where: {
          tenantId: user.tenantId,
          id: { in: access.studentIds },
          ...(restrictedIds ? { id: { in: restrictedIds } } : {})
        },
        select: { id: true }
      });
      studentIds = allowed.map((s) => s.id);
      if (studentIds.length === 0) {
        throw new ValidationError("選択した生徒への共有権限がありません");
      }
    }

    // 既存の有効な招待があれば再送扱いで作り直す
    await prisma.tenantInvite.updateMany({
      where: { tenantId: user.tenantId, email: normalized, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.tenantInvite.create({
      data: {
        tenantId: user.tenantId,
        email: normalized,
        token,
        invitedByUserId: user.id,
        expiresAt,
        grantFullAccess: access.grantFullAccess,
        studentIds
      }
    });

    // 招待メールを送る（失敗しても招待自体は有効なので握りつぶさず通知だけする）
    const signUpUrl = `${process.env.BETTER_AUTH_URL || "https://compass.p-quest.com"}/sign-up`;
    const scopeNote = access.grantFullAccess
      ? "参加すると、このワークスペースの全ての生徒を閲覧・指導できます。"
      : `参加すると、選択された${studentIds.length}名の生徒を閲覧・指導できます。`;
    let emailError: string | null = null;
    try {
      await sendAuthEmail({
        to: normalized,
        subject: `【Scholar Compass】${user.tenant?.name ?? "ワークスペース"}への招待`,
        heading: "指導ワークスペースへの招待",
        body: `${user.name} さんから「${user.tenant?.name ?? "ワークスペース"}」への参加に招待されました。下のボタンから、このメールアドレス（${normalized}）で登録してください。${scopeNote}`,
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
    assertCanManageAccess(user);
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

// 既に参加済みの講師のアクセス範囲を後から変更する（追加・削除どちらも可）
export async function updateMentorAccess(
  mentorUserId: string,
  access: { grantFullAccess: boolean; studentIds: string[] }
) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    assertCanManageAccess(user);

    const mentor = await prisma.user.findFirst({
      where: { id: mentorUserId, tenantId: user.tenantId, role: { not: "STUDENT" } },
      select: { id: true, email: true }
    });
    if (!mentor) throw new ValidationError("対象の講師が見つかりません");

    // オーナー自身のアクセス範囲は変更不可（常にフルアクセス）
    if (mentor.email === user.tenant?.ownerEmail) {
      throw new ValidationError("オーナーのアクセス範囲は変更できません");
    }

    if (!access.grantFullAccess && access.studentIds.length === 0) {
      throw new ValidationError("フルアクセスにしない場合は、共有する生徒を1名以上選択してください");
    }

    let studentIds: string[] = [];
    if (!access.grantFullAccess) {
      const restrictedIds = await getRestrictedStudentIds(user);
      const allowed = await prisma.studentProfile.findMany({
        where: {
          tenantId: user.tenantId,
          id: { in: access.studentIds },
          ...(restrictedIds ? { id: { in: restrictedIds } } : {})
        },
        select: { id: true }
      });
      studentIds = allowed.map((s) => s.id);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: mentor.id }, data: { hasFullTenantAccess: access.grantFullAccess } }),
      prisma.studentMentorAccess.deleteMany({ where: { userId: mentor.id } }),
      ...(studentIds.length > 0
        ? [
            prisma.studentMentorAccess.createMany({
              data: studentIds.map((studentProfileId) => ({ studentProfileId, userId: mentor.id })),
              skipDuplicates: true
            })
          ]
        : [])
    ]);

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update mentor access:", error);
    return { success: false, error: toClientError(error, "アクセス範囲の更新に失敗しました") };
  }
}
