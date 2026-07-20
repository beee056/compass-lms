import { randomUUID } from "crypto";
import prisma from "./prisma";

// テナントが「乗り換えても安全な抜け殻」かどうかを判定する。
// 対象ユーザー自身がオーナー相当で、他のメンバーも生徒データも一切無い場合のみ true。
async function isAbandonableTenant(tenantId: string, excludingUserId: string): Promise<boolean> {
  const [studentCount, otherUserCount] = await Promise.all([
    prisma.studentProfile.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, id: { not: excludingUserId } } })
  ]);
  return studentCount === 0 && otherUserCount === 0;
}

async function acceptMentorInvite(
  userId: string,
  email: string,
  invite: { id: string; tenantId: string; grantFullAccess: boolean; studentIds: string[] },
  previousTenantId: string | null
) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: "MENTOR", tenantId: invite.tenantId, hasFullTenantAccess: invite.grantFullAccess }
    });
    if (!invite.grantFullAccess && invite.studentIds.length > 0) {
      await tx.studentMentorAccess.createMany({
        data: invite.studentIds.map((studentProfileId) => ({ studentProfileId, userId })),
        skipDuplicates: true
      });
    }
    await tx.tenantInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    // 元のテナントが自分が作った抜け殻（自動作成されたが誰も使わなかった）なら片付ける
    if (previousTenantId && previousTenantId !== invite.tenantId) {
      const previous = await tx.tenant.findUnique({ where: { id: previousTenantId }, select: { ownerEmail: true } });
      if (previous?.ownerEmail === email) {
        await tx.tenant.delete({ where: { id: previousTenantId } }).catch(() => {});
      }
    }
  });
}

// ユーザーのテナント紐付け（プロビジョニング）を「冪等」に行う。
// サインアップ直後のフック と getCurrentUser のフォールバック の両方から呼ばれるため、
// 何度呼ばれても・並行して呼ばれても、テナントが重複作成されないように設計する。
//
// 判定順:
//   A) メンター招待あり、かつ現在のテナントが未確定 or 乗り換え可能な抜け殻
//      → 招待先ワークスペースへ参加（フルアクセス or 指定生徒のみ）
//   B) 既にtenantId確定済み（Aで動かせない場合を含む） → 何もしない
//   C) 招待済み生徒(studentEmail一致・未リンク) → その塾のSTUDENTとして紐付け
//   D) 既存ワークスペースのオーナー(ownerEmail一致) → 既存塾のMENTORとして再取得
//   E) いずれでもない → 新規ワークスペース作成（承認制）。
//      Tenant.ownerEmail の一意制約で、並行実行時の重複作成を防ぐ（衝突時は既存を再取得）。
export async function provisionUser(input: { id: string; email: string; name?: string | null }) {
  const { id, email } = input;

  const current = await prisma.user.findUnique({ where: { id }, select: { tenantId: true } });
  if (!current) return; // ユーザーが存在しない（削除直後など）

  // A) メンター招待の受諾判定。既にテナントが確定している場合でも、そのテナントが
  //    「誰にも使われていない抜け殻」なら安全に乗り換える
  //    （招待メール登録前にサインアップしてしまうケースの自己修復）。
  const invite = await prisma.tenantInvite.findFirst({
    where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true, grantFullAccess: true, studentIds: true }
  });
  if (invite && invite.tenantId !== current.tenantId) {
    const switchable = !current.tenantId || (await isAbandonableTenant(current.tenantId, id));
    if (switchable) {
      await acceptMentorInvite(id, email, invite, current.tenantId);
      return;
    }
  }

  if (current.tenantId) return; // 既にプロビジョニング済み（招待では動かせなかった場合を含む）

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
  } catch (error: unknown) {
    // 並行実行で別リクエストが先に作成した場合（ownerEmail一意制約違反）は、既存を再取得
    const existing = await prisma.tenant.findFirst({ where: { ownerEmail: email }, select: { id: true } });
    if (existing) {
      await prisma.user.update({ where: { id }, data: { role: "MENTOR", tenantId: existing.id } });
      return;
    }
    throw error;
  }
}
