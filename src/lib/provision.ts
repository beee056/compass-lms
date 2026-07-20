import { randomUUID } from "crypto";
import prisma from "./prisma";

// ユーザーのテナント紐付け（プロビジョニング）を「冪等」に行う。
// サインアップ直後のフック と getCurrentUser のフォールバック の両方から呼ばれるため、
// 何度呼ばれても・並行して呼ばれても、テナントが重複作成されないように設計する。
//
// 判定順:
//   1) 既にtenantId確定済み → 何もしない
//   2) 招待済み生徒(studentEmail一致・未リンク) → その塾のSTUDENTとして紐付け
//   3) 既存ワークスペースのオーナー(ownerEmail一致) → 既存塾のMENTORとして再取得
//   4) いずれでもない → 新規ワークスペース作成（承認制）。
//      Tenant.ownerEmail の一意制約で、並行実行時の重複作成を防ぐ（衝突時は既存を再取得）。
export async function provisionUser(input: { id: string; email: string; name?: string | null }) {
  const { id, email } = input;

  const current = await prisma.user.findUnique({ where: { id }, select: { tenantId: true } });
  if (!current) return; // ユーザーが存在しない（削除直後など）
  if (current.tenantId) return; // 既にプロビジョニング済み

  // 2) 招待済み生徒
  const invited = await prisma.studentProfile.findFirst({
    where: { studentEmail: email, userId: null },
    select: { id: true, name: true, tenantId: true }
  });
  if (invited) {
    await prisma.$transaction([
      prisma.studentProfile.update({ where: { id: invited.id }, data: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: { role: "STUDENT", tenantId: invited.tenantId, name: invited.name }
      })
    ]);
    return;
  }

  // 3) 既存ワークスペースのオーナー
  const owned = await prisma.tenant.findFirst({ where: { ownerEmail: email }, select: { id: true } });
  if (owned) {
    await prisma.user.update({ where: { id }, data: { role: "MENTOR", tenantId: owned.id } });
    return;
  }

  // 3.5) メンターとして招待されている → 招待元のワークスペースへ参加
  const invite = await prisma.tenantInvite.findFirst({
    where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tenantId: true }
  });
  if (invite) {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { role: "MENTOR", tenantId: invite.tenantId } }),
      prisma.tenantInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
    ]);
    return;
  }

  // 4) 新規ワークスペース作成（ownerEmail一意制約で重複を防止）
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
