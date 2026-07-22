import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { getAdminMentorDirectory } from "@/lib/actions/admin";
import AdminMentorDirectory from "@/components/admin/AdminMentorDirectory";

export const dynamic = "force-dynamic";

export default async function AdminMentorsPage() {
  const user = await getCurrentUser();
  if (!user.isOperator) {
    redirect("/");
  }

  const { mentors, tenants } = await getAdminMentorDirectory();

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex items-start gap-4">
        <Link
          href="/admin"
          className="mt-1 rounded-full border border-slate-200/60 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <UsersRound className="h-6 w-6 text-indigo-600" />
            メンター名簿
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            全塾のメンターを一覧し、任意の塾へ割り当て・解除できます（どの塾にも実所属していないメンターは「未割当」表示）。
          </p>
        </div>
      </div>

      <AdminMentorDirectory mentors={mentors as any[]} tenants={tenants as any[]} />
    </div>
  );
}
