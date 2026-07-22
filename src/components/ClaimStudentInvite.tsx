"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { claimStudentInvite } from "@/lib/actions/student-invites";

export default function ClaimStudentInvite({ token, studentName }: { token: string; studentName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClaim = () => {
    setError(null);
    startTransition(async () => {
      const result = await claimStudentInvite(token);
      if (result.success) {
        router.push("/portal");
        router.refresh();
      } else if ((result as { needAuth?: boolean }).needAuth) {
        router.push(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
      } else {
        setError(result.error ?? "参加に失敗しました。");
      }
    });
  };

  return (
    <div className="grid gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={handleClaim}
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <>
            {studentName} として参加する
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
