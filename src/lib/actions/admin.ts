"use server";

import { randomUUID, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertOperator, toClientError, ValidationError } from "../authz";
import { sendAuthEmail } from "../auth-email";

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

// -----------------------------------------------------------------------------
// テナント別メンバー管理（運営者のみ・全塾横断）。
// 運営者が任意の塾へメンターを追加/削除/権限変更できる中央管理。
// -----------------------------------------------------------------------------

const ADMIN_INVITE_TTL_DAYS = 14;

export async function getAdminTenantMembers(tenantId: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, ownerEmail: true }
    });
    if (!tenant) throw new ValidationError("テナントが見つかりません");

    const [memberRows, students, pendingInvites] = await Promise.all([
      prisma.tenantMembership.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentAccess: { where: { studentProfile: { tenantId } }, select: { studentProfileId: true } }
            }
          }
        }
      }),
      prisma.studentProfile.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.tenantInvite.findMany({
        where: { tenantId, acceptedAt: null, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, grantFullAccess: true, studentIds: true, expiresAt: true }
      })
    ]);

    const ownerEmail = (tenant.ownerEmail || "").toLowerCase();
    const members = memberRows.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      hasFullTenantAccess: m.hasFullTenantAccess,
      assignedStudentIds: m.user.studentAccess.map((a) => a.studentProfileId),
      isOwner: !!ownerEmail && m.user.email.toLowerCase() === ownerEmail
    }));

    return {
      success: true,
      tenantName: tenant.name,
      members: JSON.parse(JSON.stringify(members)),
      students: JSON.parse(JSON.stringify(students)),
      pendingInvites: JSON.parse(JSON.stringify(pendingInvites))
    };
  } catch (error) {
    console.error("Failed to get tenant members (admin):", error);
    return { success: false, tenantName: "", members: [], students: [], pendingInvites: [], error: toClientError(error, "メンバーの取得に失敗しました") };
  }
}

export async function adminAddMentorToTenant(
  tenantId: string,
  email: string,
  access: { grantFullAccess: boolean; studentIds: string[] }
) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const normalized = (email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new ValidationError("メールアドレスの形式が正しくありません");
    if (!access.grantFullAccess && access.studentIds.length === 0) {
      throw new ValidationError("フルアクセスにしない場合は、共有する生徒を1名以上選択してください");
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
    if (!tenant) throw new ValidationError("テナントが見つかりません");

    const asStudent = await prisma.studentProfile.findUnique({ where: { studentEmail: normalized }, select: { id: true } });
    if (asStudent) throw new ValidationError("このメールは生徒の招待用に登録されています");

    let studentIds: string[] = [];
    if (!access.grantFullAccess) {
      const allowed = await prisma.studentProfile.findMany({ where: { tenantId, id: { in: access.studentIds } }, select: { id: true } });
      studentIds = allowed.map((s) => s.id);
      if (studentIds.length === 0) throw new ValidationError("選択した生徒が見つかりません");
    }

    const existing = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, role: true } });

    if (existing) {
      if (existing.role === "STUDENT") throw new ValidationError("この方は生徒アカウントのため講師として追加できません");
      await prisma.$transaction(async (tx) => {
        await tx.tenantMembership.upsert({
          where: { userId_tenantId: { userId: existing.id, tenantId } },
          create: { userId: existing.id, tenantId, hasFullTenantAccess: access.grantFullAccess },
          update: { hasFullTenantAccess: access.grantFullAccess }
        });
        await tx.studentMentorAccess.deleteMany({ where: { userId: existing.id, studentProfile: { tenantId } } });
        if (!access.grantFullAccess && studentIds.length > 0) {
          await tx.studentMentorAccess.createMany({
            data: studentIds.map((studentProfileId) => ({ studentProfileId, userId: existing.id })),
            skipDuplicates: true
          });
        }
      });
      await logOperatorAction(tenantId, user.email, `メンター ${normalized} を追加（${access.grantFullAccess ? "フルアクセス" : `${studentIds.length}名`}）`);
      revalidatePath(`/admin/tenants/${tenantId}`);
      return { success: true, mode: "added" as const };
    }

    // 未登録 → 招待を作成（そのメールでサインアップすると参加）
    await prisma.tenantInvite.updateMany({
      where: { tenantId, email: normalized, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + ADMIN_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.tenantInvite.create({
      data: { tenantId, email: normalized, token, invitedByUserId: user.id, expiresAt, grantFullAccess: access.grantFullAccess, studentIds }
    });
    const signUpUrl = `${process.env.BETTER_AUTH_URL || "https://compass.p-quest.com"}/sign-up`;
    let emailError: string | null = null;
    try {
      await sendAuthEmail({
        to: normalized,
        subject: `【Scholar Compass】${tenant.name}への招待`,
        heading: "指導ワークスペースへの招待",
        body: `運営者から「${tenant.name}」への参加に招待されました。下のボタンから、このメールアドレス（${normalized}）で登録してください。`,
        actionLabel: "登録して参加する",
        actionUrl: signUpUrl
      });
    } catch (mailError) {
      console.error("admin invite mail failed:", mailError);
      emailError = "招待は作成しましたが、メール送信に失敗しました。登録用URLを直接お伝えください。";
    }
    await logOperatorAction(tenantId, user.email, `未登録メンター ${normalized} を招待`);
    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true, mode: "invited" as const, emailError, signUpUrl };
  } catch (error) {
    console.error("Failed to add mentor (admin):", error);
    return { success: false, error: toClientError(error, "メンターの追加に失敗しました") };
  }
}

export async function adminUpdateMemberAccess(
  tenantId: string,
  mentorUserId: string,
  access: { grantFullAccess: boolean; studentIds: string[] }
) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);
    if (!access.grantFullAccess && access.studentIds.length === 0) {
      throw new ValidationError("フルアクセスにしない場合は、共有する生徒を1名以上選択してください");
    }

    const membership = await prisma.tenantMembership.findFirst({
      where: { userId: mentorUserId, tenantId },
      include: { user: { select: { id: true, email: true, tenantId: true } } }
    });
    if (!membership) throw new ValidationError("対象のメンバーが見つかりません");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { ownerEmail: true } });
    if (tenant?.ownerEmail && membership.user.email.toLowerCase() === tenant.ownerEmail.toLowerCase()) {
      throw new ValidationError("オーナーのアクセス範囲は変更できません");
    }

    let studentIds: string[] = [];
    if (!access.grantFullAccess) {
      const allowed = await prisma.studentProfile.findMany({ where: { tenantId, id: { in: access.studentIds } }, select: { id: true } });
      studentIds = allowed.map((s) => s.id);
    }

    await prisma.$transaction([
      prisma.tenantMembership.update({ where: { id: membership.id }, data: { hasFullTenantAccess: access.grantFullAccess } }),
      prisma.studentMentorAccess.deleteMany({ where: { userId: mentorUserId, studentProfile: { tenantId } } }),
      ...(studentIds.length > 0
        ? [prisma.studentMentorAccess.createMany({ data: studentIds.map((studentProfileId) => ({ studentProfileId, userId: mentorUserId })), skipDuplicates: true })]
        : []),
      ...(membership.user.tenantId === tenantId
        ? [prisma.user.update({ where: { id: mentorUserId }, data: { hasFullTenantAccess: access.grantFullAccess } })]
        : [])
    ]);
    await logOperatorAction(tenantId, user.email, `メンター ${membership.user.email} のアクセス範囲を変更`);
    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update member access (admin):", error);
    return { success: false, error: toClientError(error, "アクセス範囲の更新に失敗しました") };
  }
}

export async function adminRemoveMember(tenantId: string, mentorUserId: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const membership = await prisma.tenantMembership.findFirst({
      where: { userId: mentorUserId, tenantId },
      include: { user: { select: { id: true, email: true, tenantId: true } } }
    });
    if (!membership) throw new ValidationError("対象のメンバーが見つかりません");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { ownerEmail: true } });
    if (tenant?.ownerEmail && membership.user.email.toLowerCase() === tenant.ownerEmail.toLowerCase()) {
      throw new ValidationError("オーナーはワークスペースから外せません");
    }

    const totalMemberships = await prisma.tenantMembership.count({ where: { userId: mentorUserId } });
    if (totalMemberships <= 1) {
      throw new ValidationError("この講師の最後の所属のため外せません（先に別のワークスペースへ参加させてください）");
    }

    const otherMembership = await prisma.tenantMembership.findFirst({
      where: { userId: mentorUserId, tenantId: { not: tenantId } },
      orderBy: { createdAt: "asc" }
    });

    await prisma.$transaction([
      prisma.tenantMembership.delete({ where: { id: membership.id } }),
      prisma.studentMentorAccess.deleteMany({ where: { userId: mentorUserId, studentProfile: { tenantId } } }),
      ...(membership.user.tenantId === tenantId && otherMembership
        ? [prisma.user.update({ where: { id: mentorUserId }, data: { tenantId: otherMembership.tenantId, hasFullTenantAccess: otherMembership.hasFullTenantAccess } })]
        : [])
    ]);
    await logOperatorAction(tenantId, user.email, `メンター ${membership.user.email} を外した`);
    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member (admin):", error);
    return { success: false, error: toClientError(error, "メンバーの削除に失敗しました") };
  }
}

export async function adminRevokeInvite(tenantId: string, inviteId: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);
    const invite = await prisma.tenantInvite.findFirst({ where: { id: inviteId, tenantId }, select: { id: true, email: true } });
    if (!invite) throw new ValidationError("対象の招待が見つかりません");
    await prisma.tenantInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
    await logOperatorAction(tenantId, user.email, `招待 ${invite.email} を取り消した`);
    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke invite (admin):", error);
    return { success: false, error: toClientError(error, "招待の取り消しに失敗しました") };
  }
}
