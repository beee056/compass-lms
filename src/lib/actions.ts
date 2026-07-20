"use server";

import { headers } from "next/headers";
import { auth } from "./auth";
import { provisionUser } from "./provision";
import prisma from "./prisma";
import { revalidatePath } from "next/cache";
import { sendEmail } from "./email";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  assertActiveTenant,
  assertMentor,
  assertStudentAccess,
  findAuthorizedTask,
  findAuthorizedDocument,
  findAuthorizedUniversity,
  getRestrictedStudentIds,
  toClientError,
  ValidationError
} from "./authz";
import { endOfDayJST, startOfDayJST } from "./dates";

// 日付計算ヘルパー: N日後のJST終業時刻(23:59)を締切として返す
function getFutureDate(days: number): Date {
  const target = new Date(Date.now() + days * 86_400_000);
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(target);
  return endOfDayJST(ymd)!;
}

// ID生成ヘルパー（推測不能なUUIDベース。連番・タイムスタンプ由来のIDはIDORを容易にするため使わない）
function generateId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

// 入力検証ヘルパー
function validateText(value: string | null | undefined, label: string, max = 200): string {
  const result = z.string()
    .trim()
    .min(1, `${label}を入力してください`)
    .max(max, `${label}は${max}文字以内で入力してください`)
    .safeParse(value ?? "");
  if (!result.success) throw new ValidationError(result.error.issues[0].message);
  return result.data;
}

function validateOptionalEmail(value: string | null | undefined, label: string): string | null {
  if (!value || !value.trim()) return null;
  const result = z.email().max(254).safeParse(value.trim());
  if (!result.success) throw new ValidationError(`${label}の形式が不正です`);
  return result.data;
}

// 締切(期限日): その日の終わり23:59:59 JST として保存
function parseDueDate(dueDateStr?: string | null): Date | null {
  if (!dueDateStr) return null;
  const d = endOfDayJST(dueDateStr);
  if (!d) throw new ValidationError("日付の形式が不正です");
  return d;
}

// マイルストーン等の予定日: その日の始まり00:00 JST として保存
function parseDayStart(dateStr: string): Date {
  const d = startOfDayJST(dateStr);
  if (!d) throw new ValidationError("日付の形式が不正です");
  return d;
}

// ヘルパー関数: 現在のユーザーとテナントIDを取得する
export async function getCurrentUser() {
  // Better Auth のセッションから本人を特定する
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  const authUserId = session.user.id;
  const email = session.user.email;

  // Better Auth が作成済みのUser行を取得（サインアップ時に必ず存在する）
  let user = await prisma.user.findUnique({
    where: { id: authUserId },
    include: { tenant: true, studentProfile: true }
  });
  if (!user) throw new Error("ユーザーレコードが見つかりません");

  // プロビジョニングは本来サインアップ時のフックで完了しているが、万一未確定の場合の
  // フォールバック。provisionUserは冪等かつ並行安全（ownerEmail一意制約で重複防止）。
  // メンター（非生徒）は毎回呼び直し、届いた招待への「乗り換え」も自己修復する
  // （招待メール登録前にサインアップし、後から招待を受けたケースの救済）。
  if (!user.tenantId || user.role !== "STUDENT") {
    await provisionUser({ id: user.id, email, name: user.name });
    user = await prisma.user.findUnique({
      where: { id: authUserId },
      include: { tenant: true, studentProfile: true }
    });
  }
  if (!user) throw new Error("Unauthorized");
  // プロビジョニング後はテナントが必ず確定している
  if (!user.tenantId) throw new Error("ワークスペースの割り当てに失敗しました");

  // 生徒なのにプロフィール未リンクの場合の自己修復（招待メールが後から一致したケース）
  if (user.role === "STUDENT" && !user.studentProfile) {
    const profile = await prisma.studentProfile.findUnique({ where: { studentEmail: email } });
    if (profile && !profile.userId) {
      await prisma.studentProfile.update({ where: { id: profile.id }, data: { userId: user.id } });
    }
  }

  // 運営者フラグは環境変数OPERATOR_EMAILSと同期する（envが唯一の真実源。UIからの任命機能は作らない）
  const operatorEmails = (process.env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
  const shouldBeOperator = operatorEmails.includes(user.email.toLowerCase());
  if (user.isOperator !== shouldBeOperator) {
    await prisma.user.update({ where: { id: user.id }, data: { isOperator: shouldBeOperator } });
    user.isOperator = shouldBeOperator;
  }

  // 生徒アカウントの表示名はプロフィール名と常に同期する
  // （Clerk側の氏名未設定で「メンター」等のフォールバック名が残るのを防ぐ）
  if (user.role === "STUDENT" && user.studentProfile) {
    const profileName = (user.studentProfile as { name?: string }).name;
    if (profileName && user.name !== profileName) {
      await prisma.user.update({ where: { id: user.id }, data: { name: profileName } });
      user.name = profileName;
    }
  }

  // tenantId は上のガードで非nullが保証されるため、downstream向けに型を確定させる
  return user as typeof user & { tenantId: string };
}

export async function getStudents() {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const restrictedIds = await getRestrictedStudentIds(user);

    const students = await prisma.studentProfile.findMany({
      where: { tenantId: user.tenantId, ...(restrictedIds ? { id: { in: restrictedIds } } : {}) },
      include: {
        universities: true,
        // 最終活動（アクティビティログの最新1件）で停滞を検知
        logs: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const now = Date.now();
    return students.map((s: any) => {
      const lastActivity: Date = s.logs?.[0]?.createdAt ?? s.updatedAt;
      const daysSinceActivity = Math.floor((now - new Date(lastActivity).getTime()) / 86_400_000);
      return {
        id: s.id,
        name: s.name,
        universities: s.universities.map((u: any) => `${u.name} ${u.department}`),
        lastUpdated: s.updatedAt.toISOString().split('T')[0],
        lastActivityAt: new Date(lastActivity).toISOString(),
        daysSinceActivity,
        initial: s.name.charAt(0),
        phase: s.phase,
        highSchool: s.highSchool || "",
        grade: s.grade || "",
        phone: s.phone || "",
        parentEmail: s.parentEmail || "",
        studentEmail: s.studentEmail || "",
        status: s.status || "ACTIVE"
      };
    });
  } catch (error) {
    console.error("Failed to get students:", error);
    return [];
  }
}

export async function createStudent(formData: FormData) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertActiveTenant(user);

    const name = validateText(formData.get("name") as string, "氏名", 100);
    const universityStr = validateText(formData.get("university") as string, "志望校", 200);
    const phase = validateText(formData.get("phase") as string, "フェーズ", 50);
    const highSchool = formData.get("highSchool") as string || null;
    const grade = formData.get("grade") as string || null;
    const phone = formData.get("phone") as string || null;
    const parentEmail = validateOptionalEmail(formData.get("parentEmail") as string, "保護者メールアドレス");
    const studentEmail = validateOptionalEmail(formData.get("studentEmail") as string, "生徒メールアドレス");

    // 学部は専用欄を優先。旧形式「大学名 学部」のスペース区切り入力もフォールバックで解釈する
    const departmentInput = ((formData.get("universityDepartment") as string) || "").trim();
    const parts = universityStr.split(" ");
    const uniName = departmentInput ? universityStr.trim() : parts[0];
    const actualDept = departmentInput || parts.slice(1).join(" ") || "学部未定";

    const studentId = generateId('student');
    const universityId = generateId('univ');

    await prisma.studentProfile.create({
      data: {
        id: studentId,
        name,
        phase,
        tenantId: user.tenantId,
        highSchool,
        grade,
        phone,
        parentEmail,
        studentEmail,
        status: "ACTIVE",
        universities: {
          create: {
            id: universityId,
            name: uniName,
            department: actualDept,
            method: "総合型選抜"
          }
        },
        // 志望校が決まった（＝生徒登録）時の自動テンプレートタスク (推奨期限を自動セット)
        tasks: {
          create: [
            { id: generateId('task'), title: "第一志望校のアドミッション・ポリシー確認", type: "TODO", dueDate: getFutureDate(3) },
            { id: generateId('task'), title: "自己推薦書の構成案作成", type: "DOCUMENT", dueDate: getFutureDate(7) },
            { id: generateId('task'), title: "活動報告書の整理と素材集め", type: "DOCUMENT", dueDate: getFutureDate(14) },
            { id: generateId('task'), title: "小論文の過去問（1回目）実施", type: "DOCUMENT", dueDate: getFutureDate(21) },
            { id: generateId('task'), title: "プレゼンテーション資料のアウトライン作成", type: "DOCUMENT", dueDate: getFutureDate(28) },
            { id: generateId('task'), title: "面接の想定質問集の作成", type: "DOCUMENT", dueDate: getFutureDate(35) }
          ]
        }
      } as any
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create student:", error);
    return { success: false, error: toClientError(error) };
  }
}

export async function updateStudent(studentId: string, formData: FormData) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);

    const name = validateText(formData.get("name") as string, "氏名", 100);
    // フェーズ欄は編集UIから外したため、送信がない場合は既存値を維持する
    const phaseInput = formData.get("phase") as string | null;
    const phase = phaseInput ? validateText(phaseInput, "フェーズ", 50) : undefined;
    const highSchool = formData.get("highSchool") as string || null;
    const grade = formData.get("grade") as string || null;
    const phone = formData.get("phone") as string || null;
    const parentEmail = validateOptionalEmail(formData.get("parentEmail") as string, "保護者メールアドレス");
    const studentEmail = validateOptionalEmail(formData.get("studentEmail") as string, "生徒メールアドレス");
    const status = formData.get("status") as string === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

    await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        name,
        phase,
        highSchool,
        grade,
        phone,
        parentEmail,
        studentEmail,
        status
      } as any
    });

    revalidatePath("/");
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update student:", error);
    return { success: false, error: toClientError(error) };
  }
}

export async function updateTenantSettings(formData: FormData) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);

    const name = validateText(formData.get("name") as string, "ワークスペース名", 100);

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { name }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return { success: false, error: toClientError(error) };
  }
}

export async function getTenant() {
  try {
    const user = await getCurrentUser();
    return user.tenant;
  } catch (error) {
    return null;
  }
}

export async function getScheduleData() {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const restrictedIds = await getRestrictedStudentIds(user);
    const studentFilter = restrictedIds
      ? { tenantId: user.tenantId, id: { in: restrictedIds } }
      : { tenantId: user.tenantId };

    // 全生徒（限定アクセス講師は割当済みの生徒のみ）のマイルストーンとタスクを並列取得
    const [milestones, rawTasks] = await Promise.all([
      prisma.milestone.findMany({
        where: { studentProfile: studentFilter },
        include: { studentProfile: true },
        orderBy: { date: 'asc' }
      }),
      prisma.task.findMany({
        where: {
          studentProfile: studentFilter,
          completed: false,
          dueDate: { not: null }
        },
        include: {
          studentProfile: true,
          // 最新コメント1件で「生徒からの返信待ち」を判定
          comments: { take: 1, orderBy: { createdAt: 'desc' }, select: { authorRole: true } }
        },
        orderBy: { dueDate: 'asc' }
      })
    ]);

    // needsReply: 最後の発言が生徒 = メンターの返信待ち
    const tasks = rawTasks.map((t: any) => ({
      ...t,
      needsReply: t.comments?.[0]?.authorRole === "STUDENT"
    }));

    return { milestones, tasks };
  } catch (error) {
    console.error("Failed to get schedule:", error);
    return { milestones: [], tasks: [] };
  }
}

// タスク追加アクション
export async function createTask(studentId: string, title: string, dueDateStr?: string, type: string = "TODO", sendEmailNotification: boolean = false) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);
    const validTitle = validateText(title, "タスク名");

    const adjustedDueDate = parseDueDate(dueDateStr);

    const newTask = await prisma.task.create({
      data: {
        id: generateId('task'),
        studentProfileId: studentId,
        title: validTitle,
        dueDate: adjustedDueDate,
        type,
        completed: false
      }
    });

    // 生徒情報を取得してメールアドレスがあれば通知
    if (sendEmailNotification) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: true }
      });

      if (student?.user?.email) {
        await sendEmail(
          student.user.email,
          `【Compass】新しいタスクが追加されました: ${validTitle}`,
          `${student.name} さん\n\n指導者から新しいタスク「${validTitle}」が追加されました。\nCompassにログインして詳細を確認してください。\n期限: ${dueDateStr ? dueDateStr : 'なし'}`
        );
      }
    }

    revalidatePath(`/students/${studentId}`);
    return { success: true, task: newTask };
  } catch (error: any) {
    console.error("Failed to create task:", error);
    return { success: false, error: toClientError(error) };
  }
}

// タスク完了切り替えアクション
export async function toggleTaskCompletion(taskId: string) {
  try {
    const user = await getCurrentUser();

    // 生徒は自分のタスクのみ、メンターは自テナントのタスクのみ操作可能
    const task = await findAuthorizedTask(user, taskId);

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { completed: !task.completed }
    });

    if (updated.completed) {
      await addActivityLog("TASK_COMPLETED", `タスク「${task.title}」を完了しました`, task.studentProfileId);
    } else {
      await addActivityLog("TASK_UNCOMPLETED", `タスク「${task.title}」を未完了に戻しました`, task.studentProfileId);
    }

    revalidatePath(`/students/${task.studentProfileId}`);
    revalidatePath("/schedule");
    return { success: true, completed: updated.completed };
  } catch (error: any) {
    console.error("Failed to toggle task:", error);
    return { success: false, error: toClientError(error) };
  }
}

// タスク削除アクション
export async function deleteTask(taskId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const task = await findAuthorizedTask(user, taskId);

    await prisma.task.delete({
      where: { id: taskId }
    });

    revalidatePath(`/students/${task.studentProfileId}`);
    revalidatePath("/schedule");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return { success: false, error: toClientError(error) };
  }
}

// タスク編集アクション
export async function updateTask(taskId: string, title: string, dueDateStr?: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const task = await findAuthorizedTask(user, taskId);
    const validTitle = validateText(title, "タスク名");

    const adjustedDueDate = parseDueDate(dueDateStr);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: validTitle,
        dueDate: adjustedDueDate
      }
    });

    await addActivityLog("TASK_EDITED", `タスクの内容を「${validTitle}」に変更しました`, task.studentProfileId);

    revalidatePath(`/students/${task.studentProfileId}`);
    revalidatePath("/schedule");
    return { success: true, task: updatedTask };
  } catch (error: any) {
    console.error("Failed to update task:", error);
    return { success: false, error: toClientError(error) };
  }
}

// ドキュメント更新アクション
export async function updateDocument(documentId: string, title: string, dueDateStr?: string | null) {
  try {
    const user = await getCurrentUser();
    const doc = await findAuthorizedDocument(user, documentId);
    const validTitle = validateText(title, "書類名");

    const adjustedDueDate = parseDueDate(dueDateStr);

    const oldTitle = doc.title;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        title: validTitle,
        dueDate: adjustedDueDate
      }
    });

    if (oldTitle !== validTitle) {
      await addActivityLog("DOCUMENT_UPDATED", `書類の名称を「${oldTitle}」から「${validTitle}」に変更しました`, doc.studentProfileId);
    }

    revalidatePath(`/students/${doc.studentProfileId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update document:", error);
    return { success: false, error: toClientError(error) };
  }
}

// マイルストーン作成アクション
export async function createMilestone(studentId: string, title: string, dateStr: string, type: string, sendEmailNotification: boolean = false) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);
    const validTitle = validateText(title, "マイルストーン名");

    await prisma.milestone.create({
      data: {
        id: generateId('milestone'),
        studentProfileId: studentId,
        title: validTitle,
        date: parseDayStart(dateStr),
        type,
        status: "TODO"
      }
    });

    // 生徒情報を取得してメールアドレスがあれば通知
    if (sendEmailNotification) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: true }
      });
      
      if (student?.user?.email) {
        await sendEmail(
          student.user.email,
          `【Compass】新しいマイルストーンが追加されました: ${title}`,
          `${student.name} さん\n\n指導者から新しいマイルストーン「${title}」が追加されました。\nCompassにログインして詳細を確認してください。\n予定日: ${dateStr}`
        );
      }
    }

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/schedule");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create milestone:", error);
    return { success: false, error: toClientError(error) };
  }
}

// ドキュメントアーカイブアクション
export async function archiveDocument(documentId: string) {
  try {
    const user = await getCurrentUser();
    const doc = await findAuthorizedDocument(user, documentId);

    await prisma.document.update({
      where: { id: documentId },
      data: { isArchived: true }
    });

    revalidatePath(`/students/${doc.studentProfileId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to archive document:", error);
    return { success: false, error: toClientError(error) };
  }
}

const DOCUMENT_STATUSES = ["DRAFT", "SUBMITTED", "REVIEWING", "DONE"] as const;
const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済み",
  REVIEWING: "レビュー中",
  DONE: "完了"
};

// 生徒が書類を「提出」するアクション（生徒本人のみ）
export async function submitDocument(documentId: string) {
  try {
    const user = await getCurrentUser();
    const doc = await findAuthorizedDocument(user, documentId);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "SUBMITTED" }
    });

    await addActivityLog("DOCUMENT_SUBMITTED", `「${doc.title}」を提出しました`, doc.studentProfileId);
    revalidatePath(`/portal`);
    revalidatePath(`/students/${doc.studentProfileId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to submit document:", error);
    return { success: false, error: toClientError(error) };
  }
}

// メンターが書類のステータスを更新するアクション（レビュー中/完了/差し戻し）
export async function setDocumentStatus(documentId: string, status: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const doc = await findAuthorizedDocument(user, documentId);

    if (!DOCUMENT_STATUSES.includes(status as any)) {
      throw new ValidationError("不正なステータスです");
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status }
    });

    await addActivityLog("DOCUMENT_STATUS_CHANGED", `「${doc.title}」を${DOCUMENT_STATUS_LABEL[status]}に更新しました`, doc.studentProfileId);
    revalidatePath(`/students/${doc.studentProfileId}`);
    revalidatePath(`/portal`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to set document status:", error);
    return { success: false, error: toClientError(error) };
  }
}

// 志望校追加アクション
export async function addUniversity(studentId: string, name: string, department: string, templateId?: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);
    name = validateText(name, "大学名", 100);
    department = validateText(department, "学部名", 100);

    const newUni = await prisma.university.create({
      data: {
        id: generateId('univ'),
        studentProfileId: studentId,
        name,
        department,
        method: "総合型選抜"
      }
    });

    if (templateId) {
      // 選択されたテンプレートからタスクを生成
      const template = await prisma.taskTemplate.findUnique({
        where: { id: templateId },
        include: { items: true }
      });

      if (template) {
        const tasksToCreate = template.items.map((item: any) => ({
          id: generateId('task'),
          studentProfileId: studentId,
          title: `【${name}】${item.title}`,
          type: item.type,
          dueDate: getFutureDate(item.daysOffset),
          completed: false
        }));
        await prisma.task.createMany({ data: tasksToCreate });
      }
    } else {
      // デフォルトのタスク生成
      await prisma.task.createMany({
        data: [
          {
            id: generateId('task'),
            studentProfileId: studentId,
            title: `【${name}】アドミッション・ポリシー確認と志望理由の整理`,
            type: "TODO",
            dueDate: getFutureDate(3),
            completed: false
          },
          {
            id: generateId('task'),
            studentProfileId: studentId,
            title: `【${name}】自己推薦書/志望理由書 構成案作成`,
            type: "DOCUMENT",
            dueDate: getFutureDate(7),
            completed: false
          }
        ]
      });
    }

    await addActivityLog("UNIVERSITY_ADDED", `志望校「${name} ${department}」を追加しました`, studentId);

    revalidatePath(`/students/${studentId}`);
    return { success: true, university: newUni };
  } catch (error: any) {
    console.error("Failed to add university:", error);
    return { success: false, error: toClientError(error) };
  }
}

// 生徒アーカイブ（卒業生として保管・データは残す）アクション
export async function archiveStudent(studentId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);

    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { status: "ARCHIVED" }
    });

    await addActivityLog("STUDENT_ARCHIVED", "生徒を卒業生としてアーカイブしました", studentId);
    revalidatePath("/");
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to archive student:", error);
    return { success: false, error: toClientError(error) };
  }
}

// 生徒削除（退会）アクション
export async function deleteStudent(studentId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);

    // 関連データ(志望校・タスク・コメント・マイルストーン・書類・練習記録・解答・ログ)は
    // スキーマの onDelete: Cascade で自動削除されるため、プロフィール本体を消すだけでよい。
    await prisma.studentProfile.delete({ where: { id: studentId } });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete student:", error);
    return { success: false, error: toClientError(error) };
  }
}

// 志望校編集アクション（連動してタスク・ドキュメントの名前も置換する）
export async function editUniversity(universityId: string, name: string, department: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const existingUni = await findAuthorizedUniversity(user, universityId);
    name = validateText(name, "大学名", 100);
    department = validateText(department, "学部名", 100);

    const oldName = existingUni.name;
    const oldDept = existingUni.department;
    const studentId = existingUni.studentProfileId;

    // 志望校を更新
    const updatedUni = await prisma.university.update({
      where: { id: universityId },
      data: { name, department }
    });

    // 文字列置換ヘルパー
    const replaceName = (title: string) => {
      // "慶應義塾大学" => "早稲田大学" など
      let newTitle = title.replace(oldName, name);
      
      // 旧学部名が指定されていて「学部未定」でなかった場合、それを新学部に置換
      if (oldDept && oldDept !== "学部未定") {
        newTitle = newTitle.replace(oldDept, department === "学部未定" ? "" : department);
      } 
      // 旧学部名が「学部未定」だった場合で、新しい学部名が設定された場合、大学名とセットになっている箇所に学部名を追加するなどのケアが必要だが、
      // 単純な置換だと「慶應義塾大学」が「慶應義塾大学 環境情報学部」になるようにする
      else if (oldDept === "学部未定" && department !== "学部未定") {
        newTitle = newTitle.replace(name, `${name} ${department}`);
      }
      return newTitle.trim();
    };

    // タスクの名称を更新
    const tasks = await prisma.task.findMany({ where: { studentProfileId: studentId } });
    for (const t of tasks) {
      if (t.title.includes(oldName)) {
        await prisma.task.update({
          where: { id: t.id },
          data: { title: replaceName(t.title) }
        });
      }
    }

    // ドキュメントの名称を更新（ドキュメントにタイトルがある場合）
    const docs = await prisma.document.findMany({ where: { studentProfileId: studentId } });
    for (const d of docs) {
      if (d.title.includes(oldName)) {
        await prisma.document.update({
          where: { id: d.id },
          data: { title: replaceName(d.title) }
        });
      }
    }

    // ログ記録
    await addActivityLog("UNIVERSITY_EDITED", `${oldName} を ${name} に変更しました`, studentId);

    revalidatePath(`/students/${studentId}`);
    return { success: true, university: updatedUni };
  } catch (error: any) {
    console.error("Failed to edit university:", error);
    return { success: false, error: toClientError(error) };
  }
}

// --------------------------------------------------------------------------------
// ログ、コメント、テンプレート用の新規アクション群
// --------------------------------------------------------------------------------

// アクティビティログ追加（内部利用メイン）
export async function addActivityLog(action: string, details: string, studentProfileId?: string) {
  try {
    const user = await getCurrentUser();
    // @ts-ignore Prismaの型が更新されていない場合でも動くように
    await prisma.activityLog.create({
      data: {
        id: generateId('log'),
        tenantId: user.tenantId,
        studentProfileId,
        action,
        details
      }
    });
  } catch (error) {
    console.error("Failed to add activity log:", error);
  }
}

// アクティビティログの取得
export async function getActivityLogs(studentProfileId?: string) {
  try {
    const user = await getCurrentUser();
    // @ts-ignore
    const logs = await prisma.activityLog.findMany({
      // 必ず自テナントに限定する（studentProfileId 指定時もテナント越えを防ぐ）
      where: { tenantId: user.tenantId, ...(studentProfileId ? { studentProfileId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return logs;
  } catch (error) {
    return [];
  }
}

// タスクへのコメント追加
export async function addTaskComment(taskId: string, content: string) {
  try {
    const user = await getCurrentUser();

    // 生徒は自分のタスクのみ、メンターは自テナントのタスクのみコメント可能
    const task = await findAuthorizedTask(user, taskId);
    const validContent = validateText(content, "コメント", 2000);

    // @ts-ignore
    const comment = await prisma.taskComment.create({
      data: {
        id: generateId('comment'),
        taskId,
        content: validContent,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role === "STUDENT" ? "STUDENT" : "MENTOR"
      }
    });

    await addActivityLog("COMMENT_ADDED", `タスク「${task.title}」にコメントが追加されました`, task.studentProfileId);
    revalidatePath(`/students/${task.studentProfileId}`);

    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: toClientError(error) };
  }
}

// テンプレートの取得
export async function getTemplates() {
  try {
    const user = await getCurrentUser();
    // @ts-ignore
    const templates = await prisma.taskTemplate.findMany({
      where: { tenantId: user.tenantId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    return templates;
  } catch (error) {
    return [];
  }
}

// テンプレートの作成
export async function createTemplate(name: string, items: { title: string, type: string, daysOffset: number }[]) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    // @ts-ignore
    const template = await prisma.taskTemplate.create({
      data: {
        id: generateId('template'),
        tenantId: user.tenantId,
        name,
        items: {
          create: items.map(item => ({ ...item, id: generateId('item') }))
        }
      }
    });
    revalidatePath("/settings");
    return { success: true, template };
  } catch (error: any) {
    return { success: false, error: toClientError(error) };
  }
}

// 生徒自身によるタスク追加（isSelfCreated=true）
export async function createStudentTask(title: string, dueDateStr?: string) {
  try {
    const user = await getCurrentUser();
    if (user.role !== "STUDENT" || !user.studentProfile) {
      throw new ValidationError("生徒プロフィールが見つかりません");
    }
    const validTitle = validateText(title, "タスク名");

    const dueDate = parseDueDate(dueDateStr);

    const task = await prisma.task.create({
      data: {
        id: generateId('task'),
        studentProfileId: user.studentProfile.id,
        title: validTitle,
        dueDate,
        type: "TODO",
        completed: false,
        isSelfCreated: true // @ts-ignore
      } as any
    });

    await addActivityLog("TASK_CREATED_BY_STUDENT", `生徒自身がタスク「${validTitle}」を追加しました`, user.studentProfile.id);

    revalidatePath("/portal");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: toClientError(error) };
  }
}

