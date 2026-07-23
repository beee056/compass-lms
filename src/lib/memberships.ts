import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";

// クロステナント（複数塾所属）の共通ヘルパー。
// User.tenantId は「アクティブ塾」ポインタ、所属集合の真実源は TenantMembership。

// トランザクション内で、対象ユーザーの個人ワークスペース(membership付き)を用意して tenantId を返す。
// 最後の所属を外すときのフォールバック（未割当メンター化）に使う。
export async function ensurePersonalWorkspaceTx(
  tx: Prisma.TransactionClient,
  opts: { userId: string; email: string; name: string | null }
): Promise<string> {
  const existing = await tx.tenant.findFirst({ where: { ownerEmail: opts.email }, select: { id: true } });
  const tenantId =
    existing?.id ??
    (
      await tx.tenant.create({
        data: {
          id: `tenant-${randomUUID()}`,
          name: `${opts.name || "メンター"}のワークスペース`,
          status: process.env.TENANT_AUTO_APPROVE === "true" ? "ACTIVE" : "PENDING",
          ownerEmail: opts.email
        }
      })
    ).id;
  await tx.tenantMembership.upsert({
    where: { userId_tenantId: { userId: opts.userId, tenantId } },
    create: { userId: opts.userId, tenantId, hasFullTenantAccess: true },
    update: {}
  });
  return tenantId;
}

export interface MembershipInfo {
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  hasFullTenantAccess: boolean;
  isOwner: boolean;
}

// アクティブ塾の membership を必ず存在させる（既存ユーザーの自己修復。冪等）。
export async function ensureMembership(userId: string, tenantId: string, hasFullTenantAccess: boolean) {
  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId, tenantId } },
    create: { userId, tenantId, hasFullTenantAccess },
    update: {}
  });
}

// ユーザーの所属塾一覧（切替UI・権限表示用）。
export async function loadMemberships(userId: string, userEmail: string): Promise<MembershipInfo[]> {
  const rows = await prisma.tenantMembership.findMany({
    where: { userId },
    include: { tenant: { select: { id: true, name: true, status: true, ownerEmail: true } } },
    orderBy: { createdAt: "asc" }
  });
  const email = userEmail.toLowerCase();
  return rows.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantStatus: m.tenant.status,
    hasFullTenantAccess: m.hasFullTenantAccess,
    isOwner: !!m.tenant.ownerEmail && m.tenant.ownerEmail.toLowerCase() === email
  }));
}
