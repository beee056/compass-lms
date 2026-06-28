"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateAiFeedback } from "@/lib/gemini";
import { auth } from "@clerk/nextjs/server";

// 生徒の解答を保存し、AIに添削を依頼するアクション
export async function submitStepAnswer(
  stepId: string, 
  studentProfileId: string, 
  content: string,
  prompt: string
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    // 1. 解答を保存または更新
    let stepAnswer = await prisma.stepAnswer.findFirst({
      where: {
        stepId,
        studentProfileId
      }
    });

    if (stepAnswer) {
      stepAnswer = await prisma.stepAnswer.update({
        where: { id: stepAnswer.id },
        data: { content }
      });
    } else {
      stepAnswer = await prisma.stepAnswer.create({
        data: {
          stepId,
          studentProfileId,
          content
        }
      });
    }

    // 2. AIフィードバックを生成
    let aiResponse = { content: "AIの初期化に失敗しました", score: null as number | null };
    try {
      aiResponse = await generateAiFeedback(prompt, content);
    } catch (e) {
      console.error("AI Feedback Generation failed:", e);
      aiResponse.content = "AIによる添削中にエラーが発生しました。時間を置いて再度お試しください。";
    }

    // 3. フィードバックをDBに保存
    const feedback = await prisma.aIFeedback.create({
      data: {
        stepAnswerId: stepAnswer.id,
        content: aiResponse.content,
        score: aiResponse.score
      }
    });

    // 4. キャッシュのパージ
    revalidatePath("/materials");
    revalidatePath(`/students/${studentProfileId}`);

    return {
      success: true,
      feedback: {
        content: feedback.content,
        score: feedback.score
      }
    };
  } catch (error) {
    console.error("Error in submitStepAnswer:", error);
    throw new Error("Failed to submit answer and generate feedback.");
  }
}
