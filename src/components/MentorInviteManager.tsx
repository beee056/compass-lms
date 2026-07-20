"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { UserPlus, Loader2, XCircle, Mail, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTenantInvite, revokeTenantInvite } from "@/lib/actions/tenant-invites";

interface Invite {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
}
interface Mentor {
  id: string;
  name: string;
  email: string;
}

// 同じワークスペースに講師を招待する（メンター専用）
export default function MentorInviteManager({ invites, mentors }: { invites: Invite[]; mentors: Mentor[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await createTenantInvite(email);
      if (result.success) {
        toast.success("招待メールを送信しました");
        if ((result as any).emailError) toast.error((result as any).emailError);
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.error ?? "招待に失敗しました");
      }
    });
  }

  function handleRevoke(id: string) {
    if (!window.confirm("この招待を取り消しますか？")) return;
    setBusyId(id);
    startTransition(async () => {
      const result = await revokeTenantInvite(id);
      setBusyId(null);
      if (result.success) {
        toast.success("招待を取り消しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "取り消しに失敗しました");
      }
    });
  }

  const formatDate = (v: string) =>
    new Date(v).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });

  const pending = invites.filter((i) => !i.acceptedAt);

  return (
    <Card className="border-slate-200/60 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800">
        <UserPlus className="h-5 w-5 text-indigo-500" />
        講師（メンター）の招待
      </h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        同じワークスペースで生徒を共同指導する講師を招待できます。招待されたメールアドレスで新規登録すると、自動的にこのワークスペースに参加します。
      </p>

      <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label className="text-sm font-semibold text-slate-700">招待する講師のメールアドレス</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例: teacher@example.com"
            className="h-11 border-slate-200"
          />
        </div>
        <Button type="submit" disabled={isPending || !email.trim()} className="h-11 min-w-[120px] bg-indigo-600 font-bold text-white hover:bg-indigo-700">
          {isPending && !busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : "招待を送る"}
        </Button>
      </form>

      <div className="mt-6">
        <h4 className="text-sm font-black text-slate-700">現在のメンバー（{mentors.length}名）</h4>
        <ul className="mt-2 space-y-1.5">
          {mentors.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="font-bold text-slate-700">{m.name}</span>
              <span className="truncate text-xs text-slate-400">{m.email}</span>
            </li>
          ))}
        </ul>
      </div>

      {pending.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-black text-slate-700">招待中（{pending.length}件）</h4>
          <ul className="mt-2 space-y-1.5">
            {pending.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="truncate font-semibold text-slate-700">{invite.email}</span>
                  <span className="shrink-0 text-xs text-slate-400">期限 {formatDate(invite.expiresAt)}</span>
                </span>
                <button
                  onClick={() => handleRevoke(invite.id)}
                  disabled={busyId === invite.id}
                  className="shrink-0 rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-50 disabled:opacity-50"
                  title="招待を取り消す"
                >
                  {busyId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
