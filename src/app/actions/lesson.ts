"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// 生徒の解答を保存し、AIに添削を依頼するアクション
export async function submitStepAnswer(
  stepId: string, 
  studentProfileId: string, 
  content: string,
  prompt: string
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // 1. 解答を保存または更新 (studentProfileIdが存在する場合のみ)
    let stepAnswerId = null;
    
    if (studentProfileId) {
      let stepAnswer = await prisma.stepAnswer.findFirst({
        where: { stepId, studentProfileId }
      });

      if (stepAnswer) {
        stepAnswer = await prisma.stepAnswer.update({
          where: { id: stepAnswer.id },
          data: { content }
        });
      } else {
        stepAnswer = await prisma.stepAnswer.create({
          data: { stepId, studentProfileId, content }
        });
      }
      stepAnswerId = stepAnswer.id;
    }

    // 2. キャッシュのパージ
    revalidatePath("/materials");
    revalidatePath(`/students/${studentProfileId}`);

    return {
      success: true
    };
  } catch (error: any) {
    console.error("Error in submitStepAnswer:", error);
    // クライアントで詳細なエラー内容を把握できるように、throwせずにエラーメッセージを返す
    return {
      success: false,
      feedback: {
        content: `システムエラー詳細: ${error?.message || String(error)}`,
        score: 0
      }
    };
  }
}
