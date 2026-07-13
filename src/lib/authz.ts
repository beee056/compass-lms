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

// 対象の生徒プロフィールを操作できるか検証する
// メンター: 自テナント内の生徒のみ / 生徒: 本人のみ
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
  return university;
}
