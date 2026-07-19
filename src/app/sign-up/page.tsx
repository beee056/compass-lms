"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, MailCheck } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import AuthShell from "@/components/auth/AuthShell";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      return;
    }
    setLoading(true);
    const { error } = await signUp.email({ email, password, name });
    setLoading(false);
    if (error) {
      if (error.status === 422 || /exist|unique|already/i.test(error.message ?? "")) {
        setError("このメールアドレスは既に登録されています。ログインするか、パスワード再設定をご利用ください。");
      } else {
        setError("登録に失敗しました。時間をおいて再度お試しください。");
      }
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="確認メールを送信しました">
        <div className="grid gap-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium leading-7 text-slate-600">
            <strong className="text-slate-800">{email}</strong> 宛に確認メールを送信しました。
            メール内のリンクを開くと登録が完了し、ログインできるようになります。
          </p>
          <Link href="/sign-in" className="text-sm font-bold text-indigo-600 hover:underline">
            ログイン画面へ
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="新規登録"
      subtitle="メールアドレスとパスワードで登録します。"
      footer={
        <>
          既にアカウントをお持ちの方は{" "}
          <Link href="/sign-in" className="font-bold text-indigo-600 hover:underline">ログイン</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-slate-700">お名前</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田 太郎"
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
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
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-slate-700">パスワード（8文字以上）</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "登録する"}
        </button>
      </form>
    </AuthShell>
  );
}
