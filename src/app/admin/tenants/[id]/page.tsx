import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, GraduationCap, ShieldCheck, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { getAdminTenantDetail } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "稼働中",
  PENDING: "承認待ち",
  SUSPENDED: "停止中"
};

export default async function AdminTenantDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user.isOperator) {
    redirect("/");
  }

  const { tenant } = await getAdminTenantDetail(params.id);
  if (!tenant) notFound();

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" })
      : "-";
  const mentors = tenant.users.filter((member: any) => member.role !== "STUDENT");

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
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            {tenant.name}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            状態: {STATUS_LABEL[tenant.status] ?? tenant.status} / 登録: {formatDate(tenant.createdAt)}
            {tenant.approvedAt ? ` / 承認: ${formatDate(tenant.approvedAt)}` : ""} / 直近30日のAI添削: {tenant.practiceCount30d}回
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
              <UsersRound className="h-5 w-5 text-indigo-500" />
              メンター（{mentors.length}名）
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {mentors.map((mentor: any) => (
              <div key={mentor.id} className="px-5 py-3">
                <p className="text-sm font-bold text-slate-800">
                  {mentor.name}
                  {mentor.isOperator && (
                    <span className="ml-2 rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">運営者</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {mentor.email} / 登録 {formatDate(mentor.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
              <GraduationCap className="h-5 w-5 text-emerald-500" />
              在籍生徒（{tenant.students.length}名）
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {tenant.students.map((student: any) => (
              <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {student.name}
                    {student.grade && <span className="ml-2 text-xs font-semibold text-slate-400">{student.grade}</span>}
                    {student.status === "ARCHIVED" && (
                      <span className="ml-2 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">卒業生</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {student.universities.map((u: any) => `${u.name} ${u.department}`).join(" / ") || "志望校未設定"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs font-semibold text-slate-500">
                  <span className="mr-3">演習{student._count.practiceRecords}回</span>
                  <span className="mr-3">書類{student._count.documents}件</span>
                  <span>最終更新 {formatDate(student.updatedAt)}</span>
                </div>
              </div>
            ))}
            {tenant.students.length === 0 && (
              <p className="px-5 py-8 text-center text-sm font-bold text-slate-400">在籍生徒はいません</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
