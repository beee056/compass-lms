"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Loader2, XCircle, Building2, Plus } from "lucide-react";
import { adminAssignMentor, adminRemoveMember } from "@/lib/actions/admin";

interface TenantRef {
  tenantId: string;
  tenantName: string;
  isOwner: boolean;
  hasFullTenantAccess: boolean;
  studentCount: number;
}
interface Mentor {
  userId: string;
  name: string;
  email: string;
  isOperator: boolean;
  tenants: TenantRef[];
  isUnassigned: boolean;
}
interface TenantOption {
  id: string;
  name: string;
  status: string;
}

export default function AdminMentorDirectory({ mentors, tenants }: { mentors: Mentor[]; tenants: TenantOption[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [assignChoice, setAssignChoice] = useState<Record<string, string>>({});

  const list = onlyUnassigned ? mentors.filter((m) => m.isUnassigned) : mentors;

  const handleAssign = (userId: string) => {
    const tenantId = assignChoice[userId];
    if (!tenantId) {
      toast.error("割り当て先の塾を選んでください");
      return;
    }
    setBusyId(userId);
    startTransition(async () => {
      const res = await adminAssignMentor(userId, tenantId);
      setBusyId(null);
      if (res.success) {
        toast.success("塾に割り当てました");
        setAssignChoice((s) => ({ ...s, [userId]: "" }));
        router.refresh();
      } else {
        toast.error(res.error ?? "割り当てに失敗しました");
      }
    });
  };

  const handleRemove = (userId: string, t: TenantRef) => {
    if (!window.confirm(`「${t.tenantName}」からこのメンターを外しますか？`)) return;
    setBusyId(userId + t.tenantId);
    startTransition(async () => {
      const res = await adminRemoveMember(t.tenantId, userId);
      setBusyId(null);
      if (res.success) {
        toast.success("外しました");
        router.refresh();
      } else {
        toast.error(res.error ?? "削除に失敗しました");
      }
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <input type="checkbox" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          未割当のみ表示
        </label>
        <span className="text-xs font-semibold text-slate-400">{list.length}名</span>
      </div>

      <div className="space-y-2">
        {list.map((m) => (
          <div key={m.userId} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  {m.name}
                  {m.isOperator && <span className="rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">運営者</span>}
                  {m.isUnassigned && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">未割当</span>}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{m.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={assignChoice[m.userId] ?? ""}
                  onChange={(e) => setAssignChoice((s) => ({ ...s, [m.userId]: e.target.value }))}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600"
                >
                  <option value="">塾を選択…</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAssign(m.userId)}
                  disabled={busyId === m.userId}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busyId === m.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  割り当て
                </button>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {m.tenants.length === 0 && <span className="text-xs font-medium text-slate-400">所属なし</span>}
              {m.tenants.map((t) => (
                <span key={t.tenantId} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  {t.tenantName}
                  {t.isOwner ? (
                    <span className="text-[10px] text-slate-400">(オーナー)</span>
                  ) : (
                    <button
                      onClick={() => handleRemove(m.userId, t)}
                      disabled={busyId === m.userId + t.tenantId}
                      className="ml-0.5 text-slate-400 transition-colors hover:text-red-500 disabled:opacity-50"
                      title="この塾から外す"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">該当するメンターはいません</p>}
      </div>
    </div>
  );
}
