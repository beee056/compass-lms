"use server";

import { randomUUID, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertOperator, toClientError, ValidationError } from "../authz";
import { sendAuthEmail } from "../auth-email";
import { ensurePersonalWorkspaceTx } from "../memberships";

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

// 未割当メンター（アクティブ塾が自分の空の個人ワークスペース）を割り当てたとき、
// アクティブ塾を割り当て先へ自動で切り替える。既に実塾で作業中の人は切り替えない。
async function activateIfPersonalShell(userId: string, email: string, targetTenantId: string, hasFullAccess: boolean) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  if (!u?.tenantId || u.tenantId === targetTenantId) return;
  const cur = await prisma.tenant.findUnique({
    where: { id: u.tenantId },
    select: { ownerEmail: true, _count: { select: { students: true } } }
  });
  const isPersonalShell =
    !!cur && !!cur.ownerEmail && cur.ownerEmail.toLowerCase() === email.toLowerCase() && cur._count.students === 0;
  if (isPersonalShell) {
    await prisma.user.update({ where: { id: userId }, data: { tenantId: targetTenantId, hasFullTenantAccess: hasFullAccess } });
  }
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
            userId: true,
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
      await activateIfPersonalShell(existing.id, normalized, tenantId, access.grantFullAccess);
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
      include: { user: { select: { id: true, name: true, email: true, tenantId: true } } }
    });
    if (!membership) throw new ValidationError("対象のメンバーが見つかりません");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { ownerEmail: true } });
    if (tenant?.ownerEmail && membership.user.email.toLowerCase() === tenant.ownerEmail.toLowerCase()) {
      throw new ValidationError("オーナーはワークスペースから外せません");
    }

    const target = membership.user;
    const otherMembership = await prisma.tenantMembership.findFirst({
      where: { userId: mentorUserId, tenantId: { not: tenantId } },
      orderBy: { createdAt: "asc" }
    });

    await prisma.$transaction(async (tx) => {
      // 移動先の所属を決める。無ければ個人ワークスペースへフォールバック（未割当メンター化）
      let fallbackTenantId = otherMembership?.tenantId ?? null;
      let fallbackFull = otherMembership?.hasFullTenantAccess ?? true;
      if (!fallbackTenantId) {
        fallbackTenantId = await ensurePersonalWorkspaceTx(tx, { userId: mentorUserId, email: target.email, name: target.name });
        fallbackFull = true;
      }
      await tx.tenantMembership.delete({ where: { id: membership.id } });
      await tx.studentMentorAccess.deleteMany({ where: { userId: mentorUserId, studentProfile: { tenantId } } });
      if (target.tenantId === tenantId) {
        await tx.user.update({ where: { id: mentorUserId }, data: { tenantId: fallbackTenantId, hasFullTenantAccess: fallbackFull } });
      }
    });
    await logOperatorAction(tenantId, user.email, `メンター ${target.email} を外した`);
    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member (admin):", error);
    return { success: false, error: toClientError(error, "メンバーの削除に失敗しました") };
  }
}

// 全メンター名簿（塾横断）。未割当（どの塾にも実所属していない）メンターも一覧できる。
export async function getAdminMentorDirectory() {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const [users, allTenants] = await Promise.all([
      prisma.user.findMany({
        where: { role: { not: "STUDENT" } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          isOperator: true,
          memberships: {
            select: {
              tenantId: true,
              hasFullTenantAccess: true,
              tenant: { select: { id: true, name: true, ownerEmail: true, _count: { select: { students: true } } } }
            }
          }
        }
      }),
      prisma.tenant.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true, ownerEmail: true, _count: { select: { students: true } } }
      })
    ]);

    const tenants = allTenants.map((t) => ({ id: t.id, name: t.name, status: t.status }));

    // 所有塾をメール別に索引（membership 行が未作成でもオーナーの塾を表示するため）
    const ownedByEmail = new Map<string, typeof allTenants>();
    for (const t of allTenants) {
      if (!t.ownerEmail) continue;
      const key = t.ownerEmail.toLowerCase();
      const arr = ownedByEmail.get(key);
      if (arr) arr.push(t);
      else ownedByEmail.set(key, [t]);
    }

    const mentors = users.map((u) => {
      const email = u.email.toLowerCase();
      const map = new Map<string, { tenantId: string; tenantName: string; isOwner: boolean; hasFullTenantAccess: boolean; studentCount: number }>();
      for (const m of u.memberships) {
        map.set(m.tenantId, {
          tenantId: m.tenantId,
          tenantName: m.tenant.name,
          isOwner: !!m.tenant.ownerEmail && m.tenant.ownerEmail.toLowerCase() === email,
          hasFullTenantAccess: m.hasFullTenantAccess,
          studentCount: m.tenant._count.students
        });
      }
      // membership 行が無いオーナー所有塾も補完（自己修復の反映遅れ対策）
      for (const t of ownedByEmail.get(email) ?? []) {
        if (!map.has(t.id)) {
          map.set(t.id, { tenantId: t.id, tenantName: t.name, isOwner: true, hasFullTenantAccess: true, studentCount: t._count.students });
        }
      }
      const memberTenants = Array.from(map.values());
      const realAssignments = memberTenants.filter((t) => !t.isOwner);
      const ownedWithStudents = memberTenants.filter((t) => t.isOwner && t.studentCount > 0);
      const isUnassigned = realAssignments.length === 0 && ownedWithStudents.length === 0;
      return { userId: u.id, name: u.name, email: u.email, isOperator: u.isOperator, tenants: memberTenants, isUnassigned };
    });

    return { success: true, mentors: JSON.parse(JSON.stringify(mentors)), tenants: JSON.parse(JSON.stringify(tenants)) };
  } catch (error) {
    console.error("Failed to get mentor directory (admin):", error);
    return { success: false, mentors: [], tenants: [], error: toClientError(error, "メンター名簿の取得に失敗しました") };
  }
}

// 名簿から既存メンターを任意の塾へ割り当て（フルアクセス。細かい生徒割当は塾詳細で調整）。
export async function adminAssignMentor(userId: string, tenantId: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } });
    if (!target) throw new ValidationError("対象のメンターが見つかりません");
    if (target.role === "STUDENT") throw new ValidationError("生徒アカウントは割り当てできません");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
    if (!tenant) throw new ValidationError("塾が見つかりません");

    await prisma.tenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: { userId, tenantId, hasFullTenantAccess: true },
      update: {}
    });
    await activateIfPersonalShell(userId, target.email, tenantId, true);
    await logOperatorAction(tenantId, user.email, `メンター ${target.email} を割り当て（フルアクセス）`);
    revalidatePath("/admin/mentors");
    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to assign mentor (admin):", error);
    return { success: false, error: toClientError(error, "割り当てに失敗しました") };
  }
}

// 生徒アカウントをメンターへ転換（卒業生が講師になるケース）。
// 生徒プロフィールは卒業アーカイブしてログインを外し（学習データは塾に残す）、
// 本人には個人ワークスペースを用意して「未割当メンター」にする。デフォルト挙動は変えない（手動転換のみ）。
export async function adminConvertStudentToMentor(userId: string) {
  try {
    const user = await getCurrentUser();
    assertOperator(user);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, name: true, studentProfile: { select: { id: true, tenantId: true } } }
    });
    if (!target) throw new ValidationError("対象のアカウントが見つかりません");
    if (target.role !== "STUDENT") throw new ValidationError("この操作は生徒アカウントにのみ行えます");

    const studentProfile = target.studentProfile;
    const existingOwn = await prisma.tenant.findFirst({ where: { ownerEmail: target.email }, select: { id: true } });
    let ownTenantId = existingOwn?.id ?? null;

    await prisma.$transaction(async (tx) => {
      if (studentProfile) {
        await tx.studentProfile.update({ where: { id: studentProfile.id }, data: { userId: null, status: "ARCHIVED" } });
      }
      if (!ownTenantId) {
        const created = await tx.tenant.create({
          data: {
            id: `tenant-${randomUUID()}`,
            name: `${target.name || "メンター"}のワークスペース`,
            status: process.env.TENANT_AUTO_APPROVE === "true" ? "ACTIVE" : "PENDING",
            ownerEmail: target.email
          }
        });
        ownTenantId = created.id;
      }
      const finalTenantId = ownTenantId as string;
      await tx.user.update({ where: { id: userId }, data: { role: "MENTOR", tenantId: finalTenantId, hasFullTenantAccess: true } });
      await tx.tenantMembership.upsert({
        where: { userId_tenantId: { userId, tenantId: finalTenantId } },
        create: { userId, tenantId: finalTenantId, hasFullTenantAccess: true },
        update: {}
      });
    });

    await logOperatorAction(studentProfile?.tenantId ?? (ownTenantId as string), user.email, `生徒 ${target.email} をメンターへ転換`);
    revalidatePath("/admin/mentors");
    if (studentProfile?.tenantId) revalidatePath(`/admin/tenants/${studentProfile.tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to convert student to mentor (admin):", error);
    return { success: false, error: toClientError(error, "メンターへの転換に失敗しました") };
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
