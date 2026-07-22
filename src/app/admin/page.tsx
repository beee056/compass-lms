import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { getAdminTenantList } from "@/lib/actions/admin";
import AdminTenantList from "@/components/AdminTenantList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user.isOperator) {
    redirect("/");
  }

  const { tenants } = await getAdminTenantList();

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            運営コンソール
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            全ワークスペース（テナント）の承認・停止・利用状況を管理します。詳細の閲覧はプロフィールと統計までで、答案・添削の本文は表示されません。閲覧・操作はすべて監査ログに記録されます。
          </p>
        </div>
        <Link
          href="/admin/mentors"
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
        >
          <UsersRound className="h-4 w-4" />
          メンター名簿
        </Link>
      </div>

      <AdminTenantList tenants={tenants} ownTenantId={user.tenantId} />
    </div>
  );
}
