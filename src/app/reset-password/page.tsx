"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { resetPassword } from "@/lib/auth-client";
import AuthShell from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("パスワードは8文字以上で設定してください。");
    if (password !== confirm) return setError("パスワードが一致しません。");
    if (!token) return setError("リンクが無効です。お手数ですが再度お試しください。");

    setLoading(true);
    const { error } = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) {
      setError("再設定に失敗しました。リンクの有効期限が切れている可能性があります。");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <AuthShell title="新しいパスワードの設定">
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-slate-700">新しいパスワード（8文字以上）</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-slate-700">確認のため再入力</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "パスワードを設定する"}
        </button>
        <Link href="/sign-in" className="text-center text-xs font-bold text-slate-500 hover:underline">ログインに戻る</Link>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="読み込み中..."><div className="h-11" /></AuthShell>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
