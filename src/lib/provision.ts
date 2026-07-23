import { randomUUID } from "crypto";
import prisma from "./prisma";
import { sendAuthEmail } from "./auth-email";

// 新規ワークスペースが承認待ちになったら運営者へメール通知（ベストエフォート）。
async function notifyOperatorsOfPendingTenant(tenantName: string, ownerEmail: string, ownerName: string | null) {
  const operatorEmails = (process.env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (operatorEmails.length === 0) return;
  const appUrl = process.env.BETTER_AUTH_URL || "https://compass.p-quest.com";
  for (const to of operatorEmails) {
    try {
      await sendAuthEmail({
        to,
        subject: `【Scholar Compass】承認待ち: ${tenantName}`,
        heading: "新しいワークスペースが承認待ちです",
        body: `${ownerName || ownerEmail} さん（${ownerEmail}）が新しいワークスペース「${tenantName}」を作成しました。運営コンソールから承認できます。`,
        actionLabel: "運営コンソールで承認する",
        actionUrl: `${appUrl}/admin`
      });
    } catch (mailError) {
      console.error("operator notify mail failed:", mailError);
    }
  }
}

// テナントが「乗り換えても安全な抜け殻」かどうかを判定する。
// 対象ユーザー以外の所属(membership)・利用者が無く、生徒データも無い場合のみ true。
async function isAbandonableTenant(tenantId: string, excludingUserId: string): Promise<boolean> {
  const [studentCount, otherMemberCount, otherUserCount] = await Promise.all([
    prisma.studentProfile.count({ where: { tenantId } }),
    prisma.tenantMembership.count({ where: { tenantId, userId: { not: excludingUserId } } }),
    prisma.user.count({ where: { tenantId, id: { not: excludingUserId } } })
  ]);
  return studentCount === 0 && otherMemberCount === 0 && otherUserCount === 0;
}

async function acceptMentorInvite(
  userId: string,
  email: string,
  invite: { id: string; tenantId: string; grantFullAccess: boolean; studentIds: string[] },
  previousTenantId: string | null
) {
  // クロステナント: 招待先の所属(membership)を追加する。
  // アクティブ塾は「未確定 or 抜け殻」なら新塾へ、実塾を持つ場合は維持（同時所属）。
  const prevAbandonable = previousTenantId ? await isAbandonableTenant(previousTenantId, userId) : true;

  await prisma.$transaction(async (tx) => {
    await tx.tenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId: invite.tenantId } },
      create: { userId, tenantId: invite.tenantId, hasFullTenantAccess: invite.grantFullAccess },
      update: { hasFullTenantAccess: invite.grantFullAccess }
    });
    if (!invite.grantFullAccess && invite.studentIds.length > 0) {
      await tx.studentMentorAccess.createMany({
        data: invite.studentIds.map((studentProfileId) => ({ studentProfileId, userId })),
        skipDuplicates: true
      });
    }
    if (!previousTenantId || prevAbandonable) {
      await tx.user.update({
        where: { id: userId },
        data: { role: "MENTOR", tenantId: invite.tenantId, hasFullTenantAccess: invite.grantFullAccess }
      });
    } else {
      // 既に実塾を持つ場合はアクティブ塾を変えず、ロールだけ確定させる
      await tx.user.update({ where: { id: userId }, data: { role: "MENTOR" } });
    }
    await tx.tenantInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  });

  // アクティブを新塾へ移した場合のみ、元の抜け殻テナントを片付ける（ベストエフォート）。
  if (previousTenantId && previousTenantId !== invite.tenantId && prevAbandonable) {
    try {
      const [previous, otherMembers] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: previousTenantId },
          select: { _count: { select: { students: true } } }
        }),
        prisma.tenantMembership.count({ where: { tenantId: previousTenantId, userId: { not: userId } } })
      ]);
      if (previous && previous._count.students === 0 && otherMembers === 0) {
        await prisma.activityLog.deleteMany({ where: { tenantId: previousTenantId } });
        await prisma.taskTemplate.deleteMany({ where: { tenantId: previousTenantId } });
        await prisma.tenantInvite.deleteMany({ where: { tenantId: previousTenantId } });
        // membership 等は onDelete Cascade で消える
        await prisma.tenant.delete({ where: { id: previousTenantId } });
      }
    } catch (cleanupError) {
      console.error("抜け殻テナントの片付けに失敗（合流は成立済み）:", cleanupError);
    }
  }
}

// ユーザーのテナント紐付け（プロビジョニング）を「冪等」に行う。
// サインアップ直後のフック と getCurrentUser のフォールバック の両方から呼ばれるため、
// 何度呼ばれても・並行して呼ばれても、テナントが重複作成されないように設計する。
//
// 判定順:
//   A) メンター招待あり → 招待先の所属(membership)を追加（既に自分の塾があっても同時所属できる）
//   B) 既にtenantId確定済み（Aで所属追加のみの場合を含む） → 何もしない
//   C) 招待済み生徒(studentEmail一致・未リンク) → その塾のSTUDENTとして紐付け
//   D) 既存ワークスペースのオーナー(ownerEmail一致) → 既存塾のMENTORとして再取得
//   E) いずれでもない → 新規ワークスペース作成（承認制）。
export async function provisionUser(input: { id: string; email: string; name?: string | null }) {
  const { id, email } = input;

  const current = await prisma.user.findUnique({ where: { id }, select: { tenantId: true } });
  if (!current) return; // ユーザーが存在しない（削除直後など）

  // A) メンター招待の受諾。所属していなければ membership を追加する。
  const invite = await prisma.tenantInvite.findFirst({
    where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, grantFullAccess: true, studentIds: true }
  });
  if (invite) {
    const already = await prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId: id, tenantId: invite.tenantId } }
    });
    if (!already) {
      await acceptMentorInvite(id, email, invite, current.tenantId);
      return;
    }
    // 既に所属済みなら招待を消費して継続（アクティブ塾は維持）
    await prisma.tenantInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  }

  if (current.tenantId) return; // 既にプロビジョニング済み

  // C) 招待済み生徒
  const invitedStudent = await prisma.studentProfile.findFirst({
    where: { studentEmail: email, userId: null },
    select: { id: true, name: true, tenantId: true }
  });
  if (invitedStudent) {
    await prisma.$transaction([
      prisma.studentProfile.update({ where: { id: invitedStudent.id }, data: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: { role: "STUDENT", tenantId: invitedStudent.tenantId, name: invitedStudent.name }
      })
    ]);
    return;
  }

  // D) 既存ワークスペースのオーナー
  const owned = await prisma.tenant.findFirst({ where: { ownerEmail: email }, select: { id: true } });
  if (owned) {
    await prisma.user.update({ where: { id }, data: { role: "MENTOR", tenantId: owned.id } });
    await prisma.tenantMembership.upsert({
      where: { userId_tenantId: { userId: id, tenantId: owned.id } },
      create: { userId: id, tenantId: owned.id, hasFullTenantAccess: true },
      update: {}
    });
    return;
  }

  // E) 新規ワークスペース作成（ownerEmail一意制約で重複を防止）
  try {
    const tenant = await prisma.tenant.create({
      data: {
        id: `tenant-${randomUUID()}`,
        name: `${input.name || "メンター"}のワークスペース`,
        status: process.env.TENANT_AUTO_APPROVE === "true" ? "ACTIVE" : "PENDING",
        ownerEmail: email
      }
    });
    await prisma.user.update({ where: { id }, data: { role: "MENTOR", tenantId: tenant.id } });
    await prisma.tenantMembership.create({
      data: { userId: id, tenantId: tenant.id, hasFullTenantAccess: true }
    });
    if (tenant.status === "PENDING") {
      await notifyOperatorsOfPendingTenant(tenant.name, email, input.name ?? null);
    }
  } catch (error: unknown) {
    // 並行実行で別リクエストが先に作成した場合（ownerEmail一意制約違反）は、既存を再取得
    const existing = await prisma.tenant.findFirst({ where: { ownerEmail: email }, select: { id: true } });
    if (existing) {
      await prisma.user.update({ where: { id }, data: { role: "MENTOR", tenantId: existing.id } });
      await prisma.tenantMembership.upsert({
        where: { userId_tenantId: { userId: id, tenantId: existing.id } },
        create: { userId: id, tenantId: existing.id, hasFullTenantAccess: true },
        update: {}
      });
      return;
    }
    throw error;
  }
}
