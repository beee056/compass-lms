import Link from "next/link";
import { headers } from "next/headers";
import { Compass } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ClaimStudentInvite from "@/components/ClaimStudentInvite";

// 生徒ポータルへの招待ページ（ログイン不要でアクセス可能）。
// トークンが有効なら、生徒本人がサインイン/登録して自分のプロフィールに参加できる。
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f4] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-white">
            <Compass className="h-5 w-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Scholar Compass</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function StudentInvitePage({ params }: { params: { token: string } }) {
  const invite = await prisma.studentInviteToken.findUnique({
    where: { token: params.token },
    include: { studentProfile: { select: { id: true, name: true, userId: true } } }
  });

  const isValid = invite && !invite.revokedAt && !invite.usedAt && invite.expiresAt > new Date();

  if (!isValid) {
    return (
      <Shell>
        <h1 className="text-xl font-black text-slate-800">この招待リンクは無効です</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          リンクの有効期限が切れているか、すでに使用済み・失効されています。塾の担当者に新しいリンクの発行を依頼してください。
        </p>
      </Shell>
    );
  }

  const studentName = invite.studentProfile.name;
  const session = await auth.api.getSession({ headers: await headers() });
  const nextUrl = `/invite/${params.token}`;

  return (
    <Shell>
      <h1 className="text-xl font-black text-slate-800">生徒ポータルへの招待</h1>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
        <span className="font-black text-slate-800">{studentName}</span> さんの学習ポータルに参加します。
        参加すると、書類・課題・面談記録・AI添削などを自分のアカウントで使えるようになります。
      </p>

      <div className="mt-6">
        {session?.user ? (
          <ClaimStudentInvite token={params.token} studentName={studentName} />
        ) : (
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-slate-500">
              参加するには、ログインまたは新規登録が必要です。
            </p>
            <Link
              href={`/sign-up?next=${encodeURIComponent(nextUrl)}`}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-indigo-600 px-6 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              新規登録して参加する
            </Link>
            <Link
              href={`/sign-in?next=${encodeURIComponent(nextUrl)}`}
              className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              既にアカウントをお持ちの方はログイン
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}
