import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { getBillingStatus } from "@/lib/actions/billing";
import { PLANS } from "@/lib/billing";
import WaitlistButton from "@/components/WaitlistButton";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") redirect("/portal");

  const status = await getBillingStatus();
  const usedRatio = Math.min(100, Math.round((status.aiUsageCount / status.freeLimit) * 100));

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex items-start gap-4">
        <Link href="/" className="mt-1 rounded-full border border-slate-200/60 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:bg-slate-50">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            プランのご案内
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">AI添削・採点をもっと使うには、有料プランへ。有料プランは近日開始です。</p>
        </div>
      </div>

      {status.plan === "FREE" && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-700">
              無料プランのAI添削・採点：<span className="text-indigo-600">{status.aiUsageCount} / {status.freeLimit} 回</span>
              {status.remaining === 0 ? "（使い切りました）" : `（残り ${status.remaining} 回）`}
            </p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${status.remaining === 0 ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${usedRatio}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = status.plan === p.id;
          const isPaid = p.id !== "FREE";
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${p.id === "STANDARD" ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800">{p.name}</h2>
                {isCurrent && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">現在のプラン</span>}
                {p.id === "STANDARD" && !isCurrent && <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-black text-indigo-700">おすすめ</span>}
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-400">{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">¥{p.price.toLocaleString()}</span>
                {isPaid && <span className="text-sm font-bold text-slate-400">/ 月</span>}
              </div>
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-medium text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <div className="inline-flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">利用中</div>
                ) : isPaid ? (
                  <WaitlistButton plan={p.id} planName={p.name} requested={status.waitlisted && (status.requestedPlan === p.id || status.requestedPlan === "ANY")} />
                ) : (
                  <div className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-400">無料で利用中</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs font-medium text-slate-400">
        ※ 有料プランは近日開始予定です。先行登録いただくと、開始時に優先してご案内します（この時点では課金は発生しません）。
      </p>
    </div>
  );
}
