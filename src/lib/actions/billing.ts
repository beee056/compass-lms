"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertMentor, toClientError } from "../authz";
import { sendAuthEmail } from "../auth-email";
import { FREE_AI_LIMIT } from "../billing";

const VALID_PLANS = ["STANDARD", "PRO", "ANY"];

// 有料プランの先行登録（ウェイティングリスト）。塾ごとに1件・上書き。
export async function joinBillingWaitlist(requestedPlan: string, note?: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const plan = VALID_PLANS.includes(requestedPlan) ? requestedPlan : "ANY";
    const cleanNote = note?.slice(0, 1000) || null;

    await prisma.billingWaitlist.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, requestedPlan: plan, email: user.email, note: cleanNote },
      update: { requestedPlan: plan, email: user.email, note: cleanNote }
    });

    // 運営者へ通知（ベストエフォート）
    const operatorEmails = (process.env.OPERATOR_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
    const appUrl = process.env.BETTER_AUTH_URL || "https://compass.p-quest.com";
    for (const to of operatorEmails) {
      try {
        await sendAuthEmail({
          to,
          subject: `【Scholar Compass】有料プラン先行登録: ${user.tenant?.name ?? "ワークスペース"}`,
          heading: "有料プランの先行登録がありました",
          body: `${user.name}（${user.email}）が「${plan}」に関心を示しました。ワークスペース: ${user.tenant?.name ?? "-"}`,
          actionLabel: "運営コンソールを開く",
          actionUrl: `${appUrl}/admin`
        });
      } catch (mailError) {
        console.error("waitlist notify mail failed:", mailError);
      }
    }

    revalidatePath("/upgrade");
    return { success: true };
  } catch (error) {
    console.error("Failed to join waitlist:", error);
    return { success: false, error: toClientError(error, "先行登録に失敗しました") };
  }
}

export async function getBillingStatus() {
  try {
    const user = await getCurrentUser();
    const [tenant, waitlist] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plan: true, aiUsageCount: true } }),
      prisma.billingWaitlist.findUnique({ where: { tenantId: user.tenantId }, select: { requestedPlan: true } })
    ]);
    const plan = tenant?.plan ?? "FREE";
    const used = tenant?.aiUsageCount ?? 0;
    return {
      plan,
      aiUsageCount: used,
      freeLimit: FREE_AI_LIMIT,
      remaining: plan === "FREE" ? Math.max(0, FREE_AI_LIMIT - used) : null,
      waitlisted: !!waitlist,
      requestedPlan: waitlist?.requestedPlan ?? null
    };
  } catch {
    return { plan: "FREE", aiUsageCount: 0, freeLimit: FREE_AI_LIMIT, remaining: FREE_AI_LIMIT, waitlisted: false, requestedPlan: null };
  }
}
