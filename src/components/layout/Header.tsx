import { LayoutGrid, Calendar, Settings, LogIn } from "lucide-react";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/actions";
import Link from "next/link";

export default async function Header() {
  let userId = null;
  let user = null;
  
  try {
    const session = await auth();
    userId = session.userId;
    if (userId) {
      user = await getCurrentUser();
    }
  } catch (e) {
    console.warn("Clerk auth not available yet", e);
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 px-6 bg-white shadow-sm">
      <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
          C
        </div>
        <span className="text-lg font-bold text-slate-800">スカラ・コンパス</span>
      </Link>

      <div className="flex items-center gap-6">
        {userId ? (
          <>
            {user?.role === "STUDENT" ? (
              <div className="flex items-center gap-5 mr-4">
                <Link href="/portal" className="hover:text-emerald-600 transition-colors p-1 text-emerald-500" title="ポータル">
                  <LayoutGrid className="h-5 w-5" />
                </Link>
                <Link href="/portal/calendar" className="hover:text-emerald-600 transition-colors p-1 text-emerald-500" title="マイ・スケジュール">
                  <Calendar className="h-5 w-5" />
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
                <Link href="/" className="hover:text-indigo-600 transition-colors p-1" title="ダッシュボード">
                  <LayoutGrid className="h-5 w-5" />
                </Link>
                <Link href="/schedule" className="hover:text-indigo-600 transition-colors p-1" title="スケジュール">
                  <Calendar className="h-5 w-5" />
                </Link>
                <Link href="/settings" className="hover:text-indigo-600 transition-colors p-1" title="設定">
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
            )}
            <UserButton />
          </>
        ) : (
          <SignInButton mode="modal">
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
              <LogIn className="h-4 w-4" />
              ログイン
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
