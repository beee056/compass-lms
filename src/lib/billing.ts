import prisma from "./prisma";

// 無料プランの生涯AI添削・採点回数
export const FREE_AI_LIMIT = 5;

// プラン定義（/upgrade 表示・案内の単一の真実源）
export const PLANS = [
  {
    id: "FREE",
    name: "無料",
    price: 0,
    tagline: "まずお試し",
    features: ["AI添削・採点 生涯5回", "生徒 3名まで", "メンター 1名"]
  },
  {
    id: "STANDARD",
    name: "スタンダード",
    price: 3980,
    tagline: "個人塾・少人数に",
    features: ["AI添削・採点 月50回", "生徒 20名まで", "メンター 5名まで"]
  },
  {
    id: "PRO",
    name: "プロ",
    price: 14800,
    tagline: "本格運用に",
    features: ["AI添削・採点 月300回", "生徒 無制限", "メンター 無制限", "優先サポート"]
  }
] as const;

export class QuotaExceededError extends Error {
  code = "QUOTA_EXCEEDED" as const;
  constructor(message = "無料プランのAI添削・採点回数（5回）を使い切りました。有料プランへのアップグレードをご検討ください。") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

// AI添削・採点の実行「前」に無料枠を確認する。運営者・有料プランは対象外。
// （プラン別の月次上限は将来 Phase 3 で追加。Phase 1 は FREE の生涯5回のみ）
export async function assertAiQuota(user: { isOperator?: boolean; tenantId: string }) {
  if (user.isOperator) return;
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { plan: true, aiUsageCount: true }
  });
  if (!tenant) return;
  if (tenant.plan === "FREE" && tenant.aiUsageCount >= FREE_AI_LIMIT) {
    throw new QuotaExceededError();
  }
}

// 成功したAI添削・採点を1回として計上する（生涯カウンタ +1）。
export async function consumeAiCredit(tenantId: string) {
  try {
    await prisma.tenant.update({ where: { id: tenantId }, data: { aiUsageCount: { increment: 1 } } });
  } catch (error) {
    console.error("Failed to consume AI credit:", error);
  }
}
