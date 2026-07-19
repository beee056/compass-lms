"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth-client";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    // 存在しないメールでも同じ表示にして、アカウントの有無を漏らさない
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="メールを送信しました">
        <div className="grid gap-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium leading-7 text-slate-600">
            入力されたメールアドレスが登録されていれば、パスワード再設定用のリンクを送信しました。メールをご確認ください。
          </p>
          <Link href="/sign-in" className="text-sm font-bold text-indigo-600 hover:underline">ログイン画面へ</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="パスワードの再設定"
      subtitle="登録済みのメールアドレスに再設定リンクを送ります。"
      footer={<Link href="/sign-in" className="font-bold text-indigo-600 hover:underline">ログインに戻る</Link>}
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-slate-700">メールアドレス</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "再設定リンクを送る"}
        </button>
      </form>
    </AuthShell>
  );
}
