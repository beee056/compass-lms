"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "./prisma";
import { revalidatePath } from "next/cache";
import { sendEmail } from "./email";

// 日付計算ヘルパー
function getFutureDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 意味のあるID生成ヘルパー
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

// ヘルパー関数: 現在のユーザーとテナントIDを取得する
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // 1. まず既存のユーザーを検索
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: true }
  });

  // 2. なければオンデマンドで自己修復（作成）
  if (!user) {
    try {
      const clerkUser = await currentUser();
      if (!clerkUser) throw new Error("Clerk user session not found");

      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) throw new Error("User email not found in Clerk");

      const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "メンター";

      user = await prisma.$transaction(async (tx) => {
        // 二重チェック
        const existing = await tx.user.findUnique({
          where: { clerkId: userId },
          include: { tenant: true }
        });
        if (existing) return existing;

        // 生徒として招待されているか確認
        const studentProfile = email ? await tx.studentProfile.findUnique({ where: { studentEmail: email } }) : null;

        if (studentProfile) {
          // 生徒として登録
          const newUser = await tx.user.create({
            data: {
              id: generateId('user'),
              clerkId: userId,
              tenantId: studentProfile.tenantId,
              role: "STUDENT",
              name,
              email
            },
            include: { tenant: true }
          });
          // StudentProfile側にも紐付け
          await tx.studentProfile.update({
            where: { id: studentProfile.id },
            data: { userId: newUser.id }
          });
          return newUser;
        } else {
          // メンターとして新規テナント作成
          const tenant = await tx.tenant.create({
            data: {
              id: generateId('tenant'),
              name: `${name}のワークスペース`
            }
          });

          // ユーザーを作成
          return await tx.user.create({
            data: {
              id: generateId('user'),
              clerkId: userId,
              tenantId: tenant.id,
              role: "MENTOR",
              name,
              email
            },
            include: { tenant: true }
          });
        }
      });
    } catch (dbError: any) {
      console.error("Failed in on-demand provisioning transaction:", dbError);
      
      // 万が一、競合して別プロセスで作成された場合などに備えて、もう一度引き直す
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { tenant: true }
      });

      if (!user) {
        throw new Error(`ユーザーの同期中にエラーが発生しました: ${dbError.message}`);
      }
    }
  }

  return user;
}

export async function getStudents() {
  try {
    const user = await getCurrentUser();

    const students = await prisma.studentProfile.findMany({
      where: { tenantId: user.tenantId },
      include: { universities: true },
      orderBy: { updatedAt: 'desc' }
    });
    
    return students.map((s: any) => ({
      id: s.id,
      name: s.name,
      universities: s.universities.map((u: any) => `${u.name} ${u.department}`),
      lastUpdated: s.updatedAt.toISOString().split('T')[0],
      initial: s.name.charAt(0),
      phase: s.phase,
      highSchool: s.highSchool || "",
      grade: s.grade || "",
      phone: s.phone || "",
      parentEmail: s.parentEmail || "",
      studentEmail: s.studentEmail || "",
      status: s.status || "ACTIVE"
    }));
  } catch (error) {
    console.error("Failed to get students:", error);
    return [];
  }
}

export async function createStudent(formData: FormData) {
  try {
    const user = await getCurrentUser();
    
    const name = formData.get("name") as string;
    const universityStr = formData.get("university") as string;
    const phase = formData.get("phase") as string;
    const highSchool = formData.get("highSchool") as string || null;
    const grade = formData.get("grade") as string || null;
    const phone = formData.get("phone") as string || null;
    const parentEmail = formData.get("parentEmail") as string || null;
    const studentEmail = formData.get("studentEmail") as string || null;

    if (!name || !universityStr || !phase) {
      throw new Error("Missing required fields");
    }

    // 大学名をパース (例: "慶應義塾大学 総合政策学部")
    const parts = universityStr.split(" ");
    const uniName = parts[0];
    const uniDept = parts.slice(1).join(" "); // "学部未定"という文字列を強制せず、空文字（または入力のまま）にする
    const actualDept = uniDept || "学部未定";

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
    return { success: false, error: error.message };
  }
}

export async function updateStudent(studentId: string, formData: FormData) {
  try {
    await getCurrentUser(); // 認証チェック

    const name = formData.get("name") as string;
    const phase = formData.get("phase") as string;
    const highSchool = formData.get("highSchool") as string || null;
    const grade = formData.get("grade") as string || null;
    const phone = formData.get("phone") as string || null;
    const parentEmail = formData.get("parentEmail") as string || null;
    const studentEmail = formData.get("studentEmail") as string || null;
    const status = formData.get("status") as string || "ACTIVE";

    if (!name || !phase) {
      throw new Error("Missing required fields");
    }

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
    return { success: false, error: error.message };
  }
}

export async function updateTenantSettings(formData: FormData) {
  try {
    const user = await getCurrentUser();
    
    const name = formData.get("name") as string;
    
    if (!name) {
      throw new Error("Missing required fields");
    }

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { name }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return { success: false, error: error.message };
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

    // 全生徒のマイルストーンとタスクを取得
    const milestones = await prisma.milestone.findMany({
      where: { studentProfile: { tenantId: user.tenantId } },
      include: { studentProfile: true },
      orderBy: { date: 'asc' }
    });

    const tasks = await prisma.task.findMany({
      where: { 
        studentProfile: { tenantId: user.tenantId },
        completed: false,
        dueDate: { not: null }
      },
      include: { studentProfile: true },
      orderBy: { dueDate: 'asc' }
    });

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

    // 日付を調整
    let adjustedDueDate = null;
    if (dueDateStr) {
      adjustedDueDate = new Date(dueDateStr);
      adjustedDueDate.setHours(23, 59, 59, 999);
    }

    const newTask = await prisma.task.create({
      data: {
        id: generateId('task'),
        studentProfileId: studentId,
        title,
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
          `【Compass】新しいタスクが追加されました: ${title}`,
          `${student.name} さん\n\n指導者から新しいタスク「${title}」が追加されました。\nCompassにログインして詳細を確認してください。\n期限: ${dueDateStr ? dueDateStr : 'なし'}`
        );
      }
    }

    revalidatePath(`/students/${studentId}`);
    return { success: true, task: newTask };
  } catch (error: any) {
    console.error("Failed to create task:", error);
    return { success: false, error: error.message };
  }
}

// タスク完了切り替えアクション
export async function toggleTaskCompletion(taskId: string) {
  try {
    const user = await getCurrentUser();

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) throw new Error("Task not found");

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
    return { success: false, error: error.message };
  }
}

// タスク削除アクション
export async function deleteTask(taskId: string) {
  try {
    await getCurrentUser();

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) throw new Error("Task not found");

    await prisma.task.delete({
      where: { id: taskId }
    });

    revalidatePath(`/students/${task.studentProfileId}`);
    revalidatePath("/schedule");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return { success: false, error: error.message };
  }
}

// タスク編集アクション
export async function updateTask(taskId: string, title: string, dueDateStr?: string) {
  try {
    const user = await getCurrentUser();

    // 日付を調整
    let adjustedDueDate = null;
    if (dueDateStr) {
      adjustedDueDate = new Date(dueDateStr);
      adjustedDueDate.setHours(23, 59, 59, 999);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) throw new Error("Task not found");

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        dueDate: adjustedDueDate
      }
    });

    await addActivityLog("TASK_EDITED", `タスクの内容を「${title}」に変更しました`, task.studentProfileId);

    revalidatePath(`/students/${task.studentProfileId}`);
    revalidatePath("/schedule");
    return { success: true, task: updatedTask };
  } catch (error: any) {
    console.error("Failed to update task:", error);
    return { success: false, error: error.message };
  }
}

// ドキュメント名称変更アクション
export async function renameDocument(documentId: string, title: string) {
  try {
    const user = await getCurrentUser();

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc) throw new Error("Document not found");

    const oldTitle = doc.title;

    await prisma.document.update({
      where: { id: documentId },
      data: { title }
    });

    await addActivityLog("DOCUMENT_RENAMED", `書類の名称を「${oldTitle}」から「${title}」に変更しました`, doc.studentProfileId);

    revalidatePath(`/students/${doc.studentProfileId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to rename document:", error);
    return { success: false, error: error.message };
  }
}

// マイルストーン作成アクション
export async function createMilestone(studentId: string, title: string, dateStr: string, type: string, sendEmailNotification: boolean = false) {
  try {
    await getCurrentUser();

    await prisma.milestone.create({
      data: {
        id: generateId('milestone'),
        studentProfileId: studentId,
        title,
        date: new Date(dateStr),
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
    return { success: false, error: error.message };
  }
}

// ドキュメントアーカイブアクション
export async function archiveDocument(documentId: string) {
  try {
    await getCurrentUser();

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc) throw new Error("Document not found");

    await prisma.document.update({
      where: { id: documentId },
      data: { isArchived: true }
    });

    revalidatePath(`/students/${doc.studentProfileId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to archive document:", error);
    return { success: false, error: error.message };
  }
}

// 志望校追加アクション
export async function addUniversity(studentId: string, name: string, department: string, templateId?: string) {
  try {
    const user = await getCurrentUser();

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
    return { success: false, error: error.message };
  }
}

// 生徒削除（退会）アクション
export async function deleteStudent(studentId: string) {
  try {
    await getCurrentUser(); // 認証チェック

    // 関連データを物理削除
    await prisma.university.deleteMany({ where: { studentProfileId: studentId } });
    await prisma.task.deleteMany({ where: { studentProfileId: studentId } });
    await prisma.milestone.deleteMany({ where: { studentProfileId: studentId } });
    await prisma.document.deleteMany({ where: { studentProfileId: studentId } });

    await prisma.studentProfile.delete({
      where: { id: studentId }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete student:", error);
    return { success: false, error: error.message };
  }
}

// 志望校編集アクション（連動してタスク・ドキュメントの名前も置換する）
export async function editUniversity(universityId: string, name: string, department: string) {
  try {
    const user = await getCurrentUser();

    const existingUni = await prisma.university.findUnique({
      where: { id: universityId }
    });
    if (!existingUni) throw new Error("University not found");

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
    return { success: false, error: error.message };
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
      where: studentProfileId ? { studentProfileId } : { tenantId: user.tenantId },
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
    
    // @ts-ignore
    const comment = await prisma.taskComment.create({
      data: {
        id: generateId('comment'),
        taskId,
        content,
        authorId: user.id,
        authorName: user.name
      }
    });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
      await addActivityLog("COMMENT_ADDED", `タスク「${task.title}」にコメントが追加されました`, task.studentProfileId);
      revalidatePath(`/students/${task.studentProfileId}`);
    }

    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
}

// 生徒自身によるタスク追加（isSelfCreated=true）
export async function createStudentTask(title: string, dueDateStr?: string) {
  try {
    const user = await getCurrentUser();
    if (user.role !== "STUDENT" || !user.studentProfile) {
      throw new Error("Student profile not found");
    }

    const dueDate = dueDateStr ? new Date(dueDateStr) : null;

    const task = await prisma.task.create({
      data: {
        id: generateId('task'),
        studentProfileId: user.studentProfile.id,
        title,
        dueDate,
        type: "TODO",
        completed: false,
        isSelfCreated: true // @ts-ignore
      } as any
    });

    await addActivityLog("TASK_CREATED_BY_STUDENT", `生徒自身がタスク「${title}」を追加しました`, user.studentProfile.id);

    revalidatePath("/portal");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

