// サーバー側の認可ヘルパー群
// マルチテナント環境でのテナント越えアクセス（IDOR）を防ぐため、
// リソースを操作する前に必ずこれらのヘルパーで所有権を検証する。
//
// ルール:
// - メンター: 自テナント内のリソースのみ操作可能
// - 生徒:     自分自身の studentProfile に紐づくリソースのみ操作可能

import prisma from "./prisma";

export interface SessionUser {
  id: string;
  tenantId: string;
  role: string;
  isOperator?: boolean;
  // false = 限定アクセス講師（招待時に選ばれた生徒のみ閲覧可）。未定義/true = 全生徒アクセス可
  hasFullTenantAccess?: boolean;
  studentProfile?: { id: string } | null;
}

export class AuthorizationError extends Error {
  constructor(message = "この操作を行う権限がありません") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(message = "入力内容が不正です") {
    super(message);
    this.name = "ValidationError";
  }
}

// クライアントへ返してよいエラーメッセージに変換する
// （DBエラー等の内部情報をそのまま返さないためのフィルタ）
export function toClientError(error: unknown, fallback = "処理に失敗しました"): string {
  if (error instanceof AuthorizationError || error instanceof ValidationError) {
    return error.message;
  }
  return fallback;
}

// メンター（STUDENT以外）であることを要求する
export function assertMentor(user: SessionUser): void {
  if (user.role === "STUDENT") {
    throw new AuthorizationError();
  }
}

// 運営者（プラットフォーム管理者）であることを要求する。/admin配下の専用アクションのみで使用
export function assertOperator(user: SessionUser): void {
  if (!user.isOperator) {
    throw new AuthorizationError();
  }
}

// テナントが利用可能（ACTIVE）であることを要求する。
// コスト発生・データ増加を伴うアクション（AI添削・生徒/書類作成等）で使用する。
export async function assertActiveTenant(user: SessionUser): Promise<void> {
  if (user.isOperator) return;
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { status: true }
  });
  if (tenant?.status === "ACTIVE") return;
  throw new AuthorizationError(
    tenant?.status === "PENDING"
      ? "ワークスペースは承認待ちです。運営者の承認後に利用できます"
      : "このワークスペースは現在利用を停止されています。運営者へお問い合わせください"
  );
}

// 生徒本人の studentProfile.id を取得する
// （getCurrentUser が studentProfile を include していないパスへのフォールバック付き）
export async function getOwnStudentProfileId(user: SessionUser): Promise<string | null> {
  if (user.studentProfile) return user.studentProfile.id;
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });
  return profile?.id ?? null;
}

// 限定アクセス講師（hasFullTenantAccess=false）が、指定の生徒への割当を持つか検証する。
// フルアクセス（オーナー・undefined含む）は常に許可。
async function assertMentorStudentAssignment(user: SessionUser, studentProfileId: string): Promise<void> {
  if (user.hasFullTenantAccess === false) {
    const access = await prisma.studentMentorAccess.findUnique({
      where: { studentProfileId_userId: { studentProfileId, userId: user.id } },
      select: { id: true }
    });
    if (!access) {
      throw new AuthorizationError("対象の生徒が見つかりません");
    }
  }
}

// 限定アクセス講師が閲覧・操作できる生徒IDの一覧を返す（一覧系クエリの絞り込み用）。
// フルアクセスの場合は null を返す（絞り込み不要の意）。
export async function getRestrictedStudentIds(user: SessionUser): Promise<string[] | null> {
  if (user.role === "STUDENT" || user.hasFullTenantAccess !== false) return null;
  const rows = await prisma.studentMentorAccess.findMany({
    where: { userId: user.id },
    select: { studentProfileId: true }
  });
  return rows.map((r) => r.studentProfileId);
}

// 対象の生徒プロフィールを操作できるか検証する
// メンター: 自テナント内の生徒のみ（限定アクセス講師は割当済みの生徒のみ） / 生徒: 本人のみ
export async function assertStudentAccess(user: SessionUser, studentProfileId: string): Promise<void> {
  if (user.role === "STUDENT") {
    const ownId = await getOwnStudentProfileId(user);
    if (!ownId || ownId !== studentProfileId) {
      throw new AuthorizationError();
    }
    return;
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, tenantId: user.tenantId },
    select: { id: true }
  });
  if (!student) {
    throw new AuthorizationError("対象の生徒が見つかりません");
  }
  await assertMentorStudentAssignment(user, studentProfileId);
}

// タスクを取得し、所有権を検証して返す
export async function findAuthorizedTask(user: SessionUser, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { studentProfile: { select: { id: true, tenantId: true } } }
  });
  if (!task || !task.studentProfile || task.studentProfile.tenantId !== user.tenantId) {
    throw new AuthorizationError("対象のタスクが見つかりません");
  }
  if (user.role === "STUDENT") {
    const ownId = await getOwnStudentProfileId(user);
    if (task.studentProfileId !== ownId) {
      throw new AuthorizationError();
    }
  } else {
    await assertMentorStudentAssignment(user, task.studentProfileId);
  }
  return task;
}

// ドキュメントを取得し、所有権を検証して返す
export async function findAuthorizedDocument(user: SessionUser, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { studentProfile: { select: { id: true, tenantId: true } } }
  });
  if (!doc || !doc.studentProfile || doc.studentProfile.tenantId !== user.tenantId) {
    throw new AuthorizationError("対象の書類が見つかりません");
  }
  if (user.role === "STUDENT") {
    const ownId = await getOwnStudentProfileId(user);
    if (doc.studentProfileId !== ownId) {
      throw new AuthorizationError();
    }
  } else {
    await assertMentorStudentAssignment(user, doc.studentProfileId);
  }
  return doc;
}

// 志望校を取得し、所有権を検証して返す（メンター専用画面で使用）
export async function findAuthorizedUniversity(user: SessionUser, universityId: string) {
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    include: { studentProfile: { select: { id: true, tenantId: true } } }
  });
  if (!university || !university.studentProfile || university.studentProfile.tenantId !== user.tenantId) {
    throw new AuthorizationError("対象の志望校が見つかりません");
  }
  await assertMentorStudentAssignment(user, university.studentProfileId);
  return university;
}
