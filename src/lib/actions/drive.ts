"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";

export async function createStudentDocument(studentId: string, documentType: string, universityName?: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // GASのWebhook URLが環境変数にあるかチェック
    const webhookUrl = process.env.GAS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("GAS_WEBHOOK_URL is not set.");
      // ローカル開発用：モックとして待機
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockTitle = universityName && universityName !== "共通"
        ? `【${universityName}】${documentType}`
        : documentType;

      await prisma.document.create({
        data: {
          studentProfileId: studentId,
          title: `${mockTitle} (新規デモ)`,
          type: documentType,
          url: "https://docs.google.com/document/d/dummy"
        }
      });
      revalidatePath(`/students/${studentId}`);
      return { success: true, message: "Mock document created" };
    }

    // 生徒情報をDBから取得
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId }
    });

    if (!student) throw new Error("Student not found");

    // 1. GASへPOSTリクエストを送信してGoogle Docsを生成
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.id,
        studentName: student.name,
        documentType: documentType,
        universityName: universityName || "共通", // GAS側へ大学名を送信
        driveFolderId: student.driveFolderId // 既存フォルダがあれば渡す
      })
    });

    if (!response.ok) {
      throw new Error(`GAS Webhook failed: ${response.statusText}`);
    }

    const data = await response.json();
    // GASからの戻り値想定: { success: true, docUrl: "...", folderId: "...", title: "..." }

    // 2. Prismaに生成されたドキュメントを保存
    const customTitle = universityName && universityName !== "共通"
      ? `【${universityName}】${data.title || documentType}`
      : data.title || `${documentType} (新規)`;

    await prisma.document.create({
      data: {
        studentProfileId: student.id,
        title: customTitle,
        type: documentType,
        url: data.docUrl
      }
    });

    // 初回生成時に生徒のdriveFolderIdが発行されていれば保存
    if (data.folderId && !student.driveFolderId) {
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: { 
          driveFolderId: data.folderId,
          driveFolderUrl: data.folderUrl || null
        }
      });
    }

    // 3. 画面のキャッシュをクリアして最新状態を即時反映
    revalidatePath(`/students/${studentId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to create document:", error);
    return { success: false, error: "ドキュメントの生成に失敗しました" };
  }
}
