import { LayoutGrid, Calendar, Settings, LogIn, BookOpen, Compass, MonitorPlay, ShieldCheck } from "lucide-react";
import Link from "next/link";
import NavLink from "@/components/layout/NavLink";
import AccountMenu from "@/components/layout/AccountMenu";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

interface MembershipInfo {
  tenantId: string;
  tenantName: string;
  hasFullTenantAccess: boolean;
  isOwner: boolean;
}

export default async function Header() {
  // Better Auth のセッションから現在のユーザーを取得（未ログインなら null）
  let user: { name: string; email: string; role: string; isOperator: boolean } | null = null;
  let memberships: MembershipInfo[] = [];
  let activeTenantId = "";
  try {
    const { getCurrentUser } = await import("@/lib/actions");
    const u = await getCurrentUser();
    user = { name: u.name, email: u.email, role: u.role, isOperator: u.isOperator };
    memberships = ((u as unknown as { memberships?: MembershipInfo[] }).memberships) ?? [];
    activeTenantId = u.tenantId;
  } catch {
    user = null;
  }

  return (
    <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-white/90 px-3 shadow-sm backdrop-blur sm:gap-4 sm:px-6">
      <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity" aria-label="Scholar Compass ホーム">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-white">
          <Compass className="h-5 w-5" />
        </div>
        <div className="leading-none">
          <span className="block text-base font-bold text-foreground sm:text-lg">Scholar Compass</span>
          <span className="hidden text-[11px] font-semibold text-slate-500 sm:block">総合型選抜 指導管理</span>
        </div>
      </Link>

      <nav aria-label="メインナビゲーション" className="flex min-w-0 items-center gap-2 sm:gap-5">
        {!user && (
          <Link
            href="/demo"
            className="hidden sm:inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <MonitorPlay className="h-4 w-4" />
            <span className="hidden sm:inline">公開デモ</span>
          </Link>
        )}

        {user ? (
          <>
            {user.role === "STUDENT" ? (
              <div className="flex items-center gap-3 sm:gap-5 sm:mr-4">
                <NavLink href="/portal" exact title="ポータル" baseClassName="hover:text-emerald-600 transition-colors p-1 rounded-md text-emerald-500" activeClassName="text-emerald-700 bg-emerald-50">
                  <LayoutGrid className="h-5 w-5" />
                </NavLink>
                <NavLink href="/portal/calendar" title="マイ・スケジュール" baseClassName="hover:text-emerald-600 transition-colors p-1 rounded-md text-emerald-500" activeClassName="text-emerald-700 bg-emerald-50">
                  <Calendar className="h-5 w-5" />
                </NavLink>
                <NavLink href="/materials" title="学習資料・ガイダンス" baseClassName="hover:text-emerald-600 transition-colors p-1 rounded-md text-emerald-500" activeClassName="text-emerald-700 bg-emerald-50">
                  <BookOpen className="h-5 w-5" />
                </NavLink>
                <div className="hidden md:flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100 shadow-sm ml-2 max-w-[220px]">
                  <span className="truncate whitespace-nowrap text-sm font-bold text-emerald-700">{user.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-emerald-500">さんのマイページ</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 sm:mr-4 sm:gap-5">
                <NavLink href="/" exact title="ダッシュボード">
                  <LayoutGrid className="h-5 w-5" />
                </NavLink>
                <NavLink href="/schedule" title="スケジュール">
                  <Calendar className="h-5 w-5" />
                </NavLink>
                <NavLink href="/materials" title="学習資料・ガイダンス">
                  <BookOpen className="h-5 w-5" />
                </NavLink>
                <NavLink href="/settings" title="設定">
                  <Settings className="h-5 w-5" />
                </NavLink>
                {user.isOperator && (
                  <NavLink href="/admin" title="運営コンソール" baseClassName="hover:text-indigo-600 transition-colors p-1 rounded-md text-indigo-500" activeClassName="text-indigo-700 bg-indigo-50">
                    <ShieldCheck className="h-5 w-5" />
                  </NavLink>
                )}
              </div>
            )}
            {user.role !== "STUDENT" && memberships.length > 0 && (
              <WorkspaceSwitcher memberships={memberships} activeTenantId={activeTenantId} />
            )}
            <AccountMenu name={user.name} email={user.email} />
          </>
        ) : (
          <Link
            href="/sign-in"
            className="flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-bold text-white transition-colors hover:bg-[#243447]"
          >
            <LogIn className="h-4 w-4" />
            ログイン
          </Link>
        )}
      </nav>
    </header>
  );
}
