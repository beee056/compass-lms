"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { generateText } from "ai";
import { getAIModel } from "../ai-model";
import { getCurrentUser } from "../actions";
import { assertMentor, assertStudentAccess, findAuthorizedDocument, toClientError } from "../authz";
import { endOfDayJST } from "../dates";

const documentDraftPrompt = `
あなたは大学受験の総合型選抜（旧AO入試）の専門プロ指導者です。
生徒が入力したキーワードやアピールポイントを元に、志望理由書または小論文の「初稿（構成案を含む下書き）」を作成してください。
この初稿は、生徒が自分自身の言葉でブラッシュアップするための「土台」となる文章です。

以下の点に注意してください：
- 指定された文字数や形式に合わせて出力してください
- 論理的な構成（PREP法：結論、理由、具体例、結論）を意識してください
- 生徒の独自性や経験が生きるように、不自然にならない範囲で肉付けしてください
- 最終的に生徒がこのテキストをエディタで直接編集しますので、不要な前置き（「それでは作成します」等）は省略し、いきなり本文から書き始めてください
`;

export async function generateDocumentDraft(studentId: string, type: string, universityName: string, keywords: string, dueDateStr?: string | null) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    await assertStudentAccess(user, studentId);

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId }
    });
    if (!student) throw new Error("Student not found");

    // AIで初稿を生成
    const { text: draftContent } = await generateText({
      model: getAIModel(),
      system: documentDraftPrompt,
      prompt: `
【書類の種類】
${type}

【志望大学・学部】
${universityName}

【生徒が入力したキーワード・アピールポイント】
${keywords}
      `
    });

    // DBに内部ドキュメントとして保存（期限はJSTのその日の終わりとして保存）
    const parsedDueDate = dueDateStr ? endOfDayJST(dueDateStr) : null;

    const docId = `doc-${randomUUID()}`;
    const newDoc = await prisma.document.create({
      data: {
        id: docId,
        studentProfileId: studentId,
        title: `${type}_${universityName}_AIドラフト`,
        type: type,
        dueDate: parsedDueDate,
        content: draftContent,
        isInternal: true, // システム内エディタで編集するフラグ
        url: null
      }
    });

    // ログに記録
    const tenantId = student.tenantId || "default_tenant";
    await prisma.activityLog.create({
      data: {
        id: `log-${randomUUID()}`,
        tenantId,
        studentProfileId: student.id,
        action: "DOCUMENT_ADDED",
        details: `「${newDoc.title}」をAIアシストで作成しました。`
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/portal`);

    return { success: true, documentId: newDoc.id };
  } catch (error: any) {
    console.error("AI Draft Generation failed:", error);
    return { success: false, error: toClientError(error, "初稿の生成に失敗しました") };
  }
}

export async function updateDocumentContent(documentId: string, content: string) {
  try {
    const user = await getCurrentUser();
    // 生徒は自分の書類のみ、メンターは自テナントの書類のみ編集可能
    await findAuthorizedDocument(user, documentId);

    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: { content: content }
    });

    revalidatePath(`/students/${updatedDoc.studentProfileId}`);
    revalidatePath(`/portal`);
    revalidatePath(`/students/${updatedDoc.studentProfileId}/documents/${documentId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Document update failed:", error);
    return { success: false, error: toClientError(error, "保存に失敗しました") };
  }
}
