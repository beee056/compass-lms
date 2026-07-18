"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertOperator, toClientError, ValidationError } from "../authz";

// -----------------------------------------------------------------------------
// 運営者コンソール専用アクション
// 原則:
//   - テナント横断アクセスはここ（/admin配下から呼ばれるアクション）だけに存在する
//   - 読み取りは「プロフィール＋統計」まで。答案・添削・書類の本文は返さない
//   - 例外的な書き込みはテナントの状態変更（承認/停止/再開）のみ
//   - 詳細閲覧・状態変更はすべてActivityLogへ監査記録する
// -----------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function logOperatorAction(tenantId: string, operatorEmail: string, details: string) {
  await prisma.activityLog.create({
    data: {
      id: `log-${randomUUID()}`,
      tenantId,
      action: "OPERATOR",
      details: `[運営者 ${operatorEmail}] ${details}`
    }
  });
}

export async function getAdminTenantList() {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const tenants = await prisma.tenant.findMany({
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        users: { select: { id: true, role: true, email: true } },
        _count: { select: { students: true } }
      }
    });

    const enriched = await Promise.all(
      tenants.map(async (tenant) => {
        const [practiceCount30d, lastLog] = await Promise.all([
          prisma.practiceRecord.count({
            where: { studentProfile: { tenantId: tenant.id }, createdAt: { gte: since } }
          }),
          prisma.activityLog.findFirst({
            where: { tenantId: tenant.id, action: { not: "OPERATOR" } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true }
          })
        ]);
        const mentors = tenant.users.filter((member) => member.role !== "STUDENT");
        return {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          createdAt: tenant.createdAt,
          approvedAt: tenant.approvedAt,
          mentorCount: mentors.length,
          mentorEmails: mentors.map((mentor) => mentor.email),
          studentCount: tenant._count.students,
          practiceCount30d,
          lastActivityAt: lastLog?.createdAt ?? null
        };
      })
    );

    return { success: true, tenants: JSON.parse(JSON.stringify(enriched)) };
  } catch (error) {
    console.error("Failed to list tenants for admin:", error);
    return { success: false, tenants: [], error: toClientError(error, "テナント一覧の取得に失敗しました") };
  }
}

export async function getAdminTenantDetail(tenantId: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        users: {
          select: { id: true, role: true, name: true, email: true, isOperator: true, createdAt: true },
          orderBy: { createdAt: "asc" }
        },
        students: {
          select: {
            id: true,
            name: true,
            grade: true,
            phase: true,
            status: true,
            updatedAt: true,
            universities: { select: { name: true, department: true }, take: 2 },
            _count: { select: { practiceRecords: true, documents: true, tasks: true } }
          },
          orderBy: { updatedAt: "desc" }
        }
      }
    });
    if (!tenant) throw new ValidationError("テナントが見つかりません");

    const practiceCount30d = await prisma.practiceRecord.count({
      where: { studentProfile: { tenantId }, createdAt: { gte: since } }
    });

    await logOperatorAction(tenantId, user.email, "テナント詳細を閲覧しました");

    return { success: true, tenant: JSON.parse(JSON.stringify({ ...tenant, practiceCount30d })) };
  } catch (error) {
    console.error("Failed to get tenant detail for admin:", error);
    return { success: false, tenant: null, error: toClientError(error, "テナント詳細の取得に失敗しました") };
  }
}

export async function setTenantStatusByOperator(tenantId: string, status: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);
    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      throw new ValidationError("不正な状態です");
    }
    if (tenantId === user.tenantId && status === "SUSPENDED") {
      throw new ValidationError("自分のテナントは停止できません");
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } });
    if (!tenant) throw new ValidationError("テナントが見つかりません");

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status,
        ...(tenant.status === "PENDING" && status === "ACTIVE"
          ? { approvedAt: new Date(), approvedByUserId: user.id }
          : {})
      }
    });

    await logOperatorAction(
      tenantId,
      user.email,
      tenant.status === "PENDING" && status === "ACTIVE"
        ? "テナントを承認しました"
        : status === "SUSPENDED"
          ? "テナントを停止しました"
          : "テナントを再開しました"
    );

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to set tenant status:", error);
    return { success: false, error: toClientError(error, "状態の変更に失敗しました") };
  }
}
