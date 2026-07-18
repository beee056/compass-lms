"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { CheckCircle2, Loader2, Pause, Play } from "lucide-react";
import { setTenantStatusByOperator } from "@/lib/actions/admin";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SUSPENDED: "bg-red-50 text-red-600 border-red-200"
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "稼働中",
  PENDING: "承認待ち",
  SUSPENDED: "停止中"
};

export default function AdminTenantList({ tenants, ownTenantId }: { tenants: any[]; ownTenantId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" })
      : "-";

  const changeStatus = (tenantId: string, status: string, confirmMessage: string, successMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    setBusyId(tenantId);
    startTransition(async () => {
      const result = await setTenantStatusByOperator(tenantId, status);
      setBusyId(null);
      if (result.success) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error ?? "操作に失敗しました");
      }
    });
  };

  const pendingCount = tenants.filter((tenant) => tenant.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          承認待ちのワークスペースが{pendingCount}件あります。内容を確認して承認してください。
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black text-slate-500">
              <th className="px-4 py-3">ワークスペース</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">メンター</th>
              <th className="px-4 py-3 text-right">生徒数</th>
              <th className="px-4 py-3 text-right">AI添削(30日)</th>
              <th className="px-4 py-3">最終活動</th>
              <th className="px-4 py-3">登録日</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((tenant) => {
              const isBusy = busyId === tenant.id && isPending;
              const isOwn = tenant.id === ownTenantId;
              return (
                <tr key={tenant.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${tenant.id}`} className="font-bold text-slate-800 hover:text-indigo-600 hover:underline">
                      {tenant.name}
                    </Link>
                    {isOwn && <span className="ml-2 rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">自分</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-0.5 text-xs font-black ${STATUS_STYLE[tenant.status] ?? ""}`}>
                      {STATUS_LABEL[tenant.status] ?? tenant.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs font-semibold text-slate-600" title={tenant.mentorEmails.join(", ")}>
                    {tenant.mentorCount}名（{tenant.mentorEmails[0] ?? "-"}）
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">{tenant.studentCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">{tenant.practiceCount30d}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(tenant.lastActivityAt)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(tenant.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {isBusy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {tenant.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            changeStatus(tenant.id, "ACTIVE", `「${tenant.name}」を承認して利用開始しますか？`, "承認しました")
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          承認
                        </button>
                      )}
                      {tenant.status === "ACTIVE" && !isOwn && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            changeStatus(tenant.id, "SUSPENDED", `「${tenant.name}」を停止しますか？全ユーザーが利用できなくなります（データは残ります）`, "停止しました")
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          停止
                        </button>
                      )}
                      {tenant.status === "SUSPENDED" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => changeStatus(tenant.id, "ACTIVE", `「${tenant.name}」を再開しますか？`, "再開しました")}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          再開
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                  テナントがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
