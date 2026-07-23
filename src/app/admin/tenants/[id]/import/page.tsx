import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { getAdminTenantDetail } from "@/lib/actions/admin";
import DataImporter from "@/components/DataImporter";

export const dynamic = "force-dynamic";

export default async function AdminTenantImportPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user.isOperator) redirect("/");

  const { tenant } = await getAdminTenantDetail(params.id);
  if (!tenant) notFound();

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex items-start gap-4">
        <Link href={`/admin/tenants/${params.id}`} className="mt-1 rounded-full border border-slate-200/60 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:bg-slate-50">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            データ取込（代行）: {tenant.name}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">運営者として、この塾へ生徒・志望校・書類を取り込みます。</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl">
        <DataImporter targetTenantId={params.id} />
      </div>
    </div>
  );
}
