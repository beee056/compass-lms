"use client";

import { useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { Link2, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createStudentInvite } from "@/lib/actions/student-invites";

// メンター用: メールが分からなくても生徒ポータルへ招待できるリンクを発行するカード
export default function StudentInviteButton({ studentId, isLinked }: { studentId: string; isLinked: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);

  const buildUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createStudentInvite(studentId);
      if (result.success && (result as { token?: string }).token) {
        const link = buildUrl((result as { token: string }).token);
        setUrl(link);
        try {
          await navigator.clipboard.writeText(link);
          toast.success("招待リンクを発行し、コピーしました");
        } catch {
          toast.success("招待リンクを発行しました");
        }
      } else {
        toast.error(result.error ?? "発行に失敗しました");
      }
    });
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("コピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <Card className="border-slate-200/60 p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-slate-800">
        <Link2 className="h-4 w-4 text-indigo-500" />
        生徒ポータルへの招待
      </h3>
      <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">
        メールアドレスが分からなくても、このリンクを渡せば生徒本人がログイン／登録して自分のポータルに参加できます。
        {isLinked && (
          <span className="mt-1 block font-bold text-emerald-600">この生徒は既にポータルに参加済みです。</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          招待リンクを発行
        </button>
        {url && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            再コピー
          </button>
        )}
      </div>
      {url && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="truncate text-slate-600">{url}</span>
        </div>
      )}
      <p className="mt-2 text-[11px] font-medium text-slate-400">リンクの有効期限は30日です。新しく発行すると前のリンクは無効になります。</p>
    </Card>
  );
}
