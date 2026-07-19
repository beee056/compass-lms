"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { sendVerificationEmail } from "@/lib/auth-client";
import AuthShell from "@/components/auth/AuthShell";

// 確認メールの再送ページ
export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await sendVerificationEmail({ email, callbackURL: "/" });
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="確認メールを再送しました">
        <div className="grid gap-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium leading-7 text-slate-600">
            登録済みのメールアドレスであれば、確認メールを再送しました。メール内のリンクを開いてください。
          </p>
          <Link href="/sign-in" className="text-sm font-bold text-indigo-600 hover:underline">ログイン画面へ</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="確認メールの再送"
      subtitle="登録に使ったメールアドレスを入力してください。"
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認メールを再送する"}
        </button>
      </form>
    </AuthShell>
  );
}
