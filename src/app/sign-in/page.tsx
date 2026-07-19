"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import AuthShell from "@/components/auth/AuthShell";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerify(false);
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      // メール未確認の場合の案内
      if (error.status === 403 || /verif/i.test(error.message ?? "")) {
        setNeedsVerify(true);
        setError("メールアドレスの確認が完了していません。登録時に届いた確認メールをご確認ください。");
      } else {
        setError("メールアドレスまたはパスワードが正しくありません。");
      }
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      title="ログイン"
      subtitle="メールアドレスとパスワードでログインします。"
      footer={
        <>
          アカウントをお持ちでない方は{" "}
          <Link href="/sign-up" className="font-bold text-indigo-600 hover:underline">新規登録</Link>
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">パスワード</label>
            <Link href="/forgot-password" className="text-xs font-bold text-indigo-600 hover:underline">お忘れですか？</Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {needsVerify && (
          <Link href="/verify-email" className="text-center text-xs font-bold text-indigo-600 hover:underline">
            確認メールを再送する
          </Link>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ログイン"}
        </button>
      </form>
    </AuthShell>
  );
}
