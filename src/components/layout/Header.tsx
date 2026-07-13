import { LayoutGrid, Calendar, Settings, LogIn, BookOpen, Compass, MonitorPlay } from "lucide-react";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Header() {
  let userId = null;
  let user = null;
  
  try {
    const session = await auth();
    userId = session.userId;
    if (userId) {
      const { getCurrentUser } = await import("@/lib/actions");
      user = await getCurrentUser();
    }
  } catch (e) {
    console.warn("Clerk auth not available yet", e);
  }

  return (
    <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-white/90 px-4 shadow-sm backdrop-blur sm:px-6">
      <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" aria-label="Scholar Compass ホーム">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-white">
          <Compass className="h-5 w-5" />
        </div>
        <div className="leading-none">
          <span className="block text-base font-bold text-foreground sm:text-lg">Scholar Compass</span>
          <span className="hidden text-[11px] font-semibold text-slate-500 sm:block">総合型選抜 指導管理</span>
        </div>
      </Link>

      <nav aria-label="メインナビゲーション" className="flex items-center gap-3 sm:gap-5">
        <Link
          href="/demo"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <MonitorPlay className="h-4 w-4" />
          <span className="hidden sm:inline">公開デモ</span>
        </Link>

        {userId ? (
          <>
            {user?.role === "STUDENT" ? (
              <div className="flex items-center gap-5 mr-4">
                <Link href="/portal" className="hover:text-emerald-600 transition-colors p-1 text-emerald-500" title="ポータル" aria-label="ポータル">
                  <LayoutGrid className="h-5 w-5" />
                </Link>
                <Link href="/portal/calendar" className="hover:text-emerald-600 transition-colors p-1 text-emerald-500" title="マイ・スケジュール" aria-label="マイ・スケジュール">
                  <Calendar className="h-5 w-5" />
                </Link>
                <Link href="/materials" className="hover:text-emerald-600 transition-colors p-1 text-emerald-500" title="学習資料・ガイダンス" aria-label="学習資料・ガイダンス">
                  <BookOpen className="h-5 w-5" />
                </Link>
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100 shadow-sm ml-2">
                  <span className="text-sm font-bold text-emerald-700">{user.name}</span>
                  <span className="text-xs font-semibold text-emerald-500">さんのマイページ</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 border border-indigo-100 shadow-sm">
                <span className="text-sm font-bold text-indigo-700">{user?.tenant?.name || `${user?.name}さんの指導`}</span>
              </div>
            )}

            {/* ナビゲーションリンクの有効化 (メンターのみ) */}
            {user?.role !== "STUDENT" && (
              <div className="flex items-center gap-5 text-slate-500 mr-4">
                <Link href="/" className="hover:text-indigo-600 transition-colors p-1" title="ダッシュボード" aria-label="ダッシュボード">
                  <LayoutGrid className="h-5 w-5" />
                </Link>
                <Link href="/schedule" className="hover:text-indigo-600 transition-colors p-1" title="スケジュール" aria-label="スケジュール">
                  <Calendar className="h-5 w-5" />
                </Link>
                <Link href="/materials" className="hover:text-indigo-600 transition-colors p-1" title="学習資料・ガイダンス" aria-label="学習資料・ガイダンス">
                  <BookOpen className="h-5 w-5" />
                </Link>
                <Link href="/settings" className="hover:text-indigo-600 transition-colors p-1" title="設定" aria-label="設定">
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
            )}
            <UserButton />
          </>
        ) : (
          <SignInButton mode="modal">
            <button className="flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-bold text-white transition-colors hover:bg-[#243447]">
              <LogIn className="h-4 w-4" />
              ログイン
            </button>
          </SignInButton>
        )}
      </nav>
    </header>
  );
}
