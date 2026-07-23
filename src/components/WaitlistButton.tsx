"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Loader2, Check } from "lucide-react";
import { joinBillingWaitlist } from "@/lib/actions/billing";

export default function WaitlistButton({ plan, planName, requested }: { plan: string; planName: string; requested: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(requested);

  const handle = () => {
    startTransition(async () => {
      const res = await joinBillingWaitlist(plan);
      if (res.success) {
        setDone(true);
        toast.success(`${planName}の先行登録を受け付けました。開始時にご連絡します。`);
        router.refresh();
      } else {
        toast.error(res.error ?? "登録に失敗しました");
      }
    });
  };

  if (done) {
    return (
      <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
        <Check className="h-4 w-4" />
        先行登録済み
      </div>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "先行登録して開始通知を受け取る"}
    </button>
  );
}
