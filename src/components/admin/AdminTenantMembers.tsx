"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { UserPlus, Loader2, XCircle, Users, Pencil, CheckCircle2, Mail } from "lucide-react";
import {
  adminAddMentorToTenant,
  adminUpdateMemberAccess,
  adminRemoveMember,
  adminRevokeInvite
} from "@/lib/actions/admin";

interface Member {
  userId: string;
  name: string;
  email: string;
  hasFullTenantAccess: boolean;
  assignedStudentIds: string[];
  isOwner: boolean;
}
interface StudentOption {
  id: string;
  name: string;
}
interface PendingInvite {
  id: string;
  email: string;
  grantFullAccess: boolean;
  studentIds: string[];
}

function StudentPicker({
  students,
  selected,
  onToggle
}: {
  students: StudentOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (students.length === 0) {
    return <p className="text-xs font-medium text-slate-400">この塾には生徒がいません。</p>;
  }
  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
      {students.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => onToggle(s.id)} className="h-4 w-4 rounded border-slate-300" />
          <span className="font-medium text-slate-700">{s.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function AdminTenantMembers({
  tenantId,
  members,
  students,
  pendingInvites
}: {
  tenantId: string;
  members: Member[];
  students: StudentOption[];
  pendingInvites: PendingInvite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [grantFullAccess, setGrantFullAccess] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFull, setEditFull] = useState(true);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);

  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!grantFullAccess && selectedStudentIds.length === 0) {
      toast.error("共有する生徒を1名以上選択してください");
      return;
    }
    startTransition(async () => {
      const result = await adminAddMentorToTenant(tenantId, email, { grantFullAccess, studentIds: selectedStudentIds });
      if (result.success) {
        toast.success(result.mode === "invited" ? "招待を作成しました（相手の登録待ち）" : "メンターを追加しました");
        setEmail("");
        setGrantFullAccess(true);
        setSelectedStudentIds([]);
        router.refresh();
      } else {
        toast.error(result.error ?? "追加に失敗しました");
      }
    });
  };

  const openEdit = (m: Member) => {
    setEditingId(m.userId);
    setEditFull(m.hasFullTenantAccess);
    setEditStudentIds(m.assignedStudentIds);
  };

  const handleSaveAccess = (userId: string) => {
    if (!editFull && editStudentIds.length === 0) {
      toast.error("共有する生徒を1名以上選択してください");
      return;
    }
    setBusyId(userId);
    startTransition(async () => {
      const result = await adminUpdateMemberAccess(tenantId, userId, { grantFullAccess: editFull, studentIds: editStudentIds });
      setBusyId(null);
      if (result.success) {
        toast.success("アクセス範囲を更新しました");
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    });
  };

  const handleRemove = (m: Member) => {
    if (!window.confirm(`${m.name} さんをこの塾から外しますか？（この塾での担当生徒の割当は解除されます）`)) return;
    setBusyId(m.userId);
    startTransition(async () => {
      const result = await adminRemoveMember(tenantId, m.userId);
      setBusyId(null);
      if (result.success) {
        toast.success("メンバーを外しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "削除に失敗しました");
      }
    });
  };

  const handleRevoke = (inviteId: string) => {
    setBusyId(inviteId);
    startTransition(async () => {
      const result = await adminRevokeInvite(tenantId, inviteId);
      setBusyId(null);
      if (result.success) {
        toast.success("招待を取り消しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "取り消しに失敗しました");
      }
    });
  };

  return (
    <div>
      {/* 追加フォーム */}
      <form onSubmit={handleAdd} className="space-y-3 border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-600">メンターを追加</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メンターのメールアドレス"
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setGrantFullAccess(true)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold transition-colors ${grantFullAccess ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}
          >
            全生徒（フルアクセス）
          </button>
          <button
            type="button"
            onClick={() => setGrantFullAccess(false)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold transition-colors ${!grantFullAccess ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}
          >
            選択した生徒のみ
          </button>
        </div>
        {!grantFullAccess && (
          <StudentPicker students={students} selected={selectedStudentIds} onToggle={(id) => setSelectedStudentIds((l) => toggle(l, id))} />
        )}
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending && !busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          追加する
        </button>
        <p className="text-[11px] font-medium text-slate-400">
          既に登録済みのメンターは即このワークスペースに追加されます。未登録の場合は招待を作成し、そのメールで登録すると参加します。
        </p>
      </form>

      {/* メンバー一覧 */}
      <div className="divide-y divide-slate-100">
        {members.map((m) => {
          const isEditing = editingId === m.userId;
          return (
            <div key={m.userId} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="font-bold text-slate-800">{m.name}</span>
                  <span className="truncate text-xs text-slate-400">{m.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {m.hasFullTenantAccess ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700"><Users className="h-3 w-3" />全生徒</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700"><Users className="h-3 w-3" />{m.assignedStudentIds.length}名のみ</span>
                  )}
                  {m.isOwner && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">オーナー</span>}
                  {!m.isOwner && (
                    <>
                      <button onClick={() => (isEditing ? setEditingId(null) : openEdit(m))} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600" title="アクセス範囲を編集">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleRemove(m)} disabled={busyId === m.userId} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50" title="この塾から外す">
                        {busyId === m.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      </button>
                    </>
                  )}
                </span>
              </div>
              {!m.hasFullTenantAccess && m.assignedStudentIds.length > 0 && !isEditing && (
                <p className="mt-1.5 truncate text-xs font-medium text-slate-500">
                  {m.assignedStudentIds.map((id) => studentNameById.get(id) ?? "?").join("、")}
                </p>
              )}
              {isEditing && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditFull(true)} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${editFull ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}>全生徒</button>
                    <button type="button" onClick={() => setEditFull(false)} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${!editFull ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}>選択した生徒のみ</button>
                  </div>
                  {!editFull && <StudentPicker students={students} selected={editStudentIds} onToggle={(id) => setEditStudentIds((l) => toggle(l, id))} />}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="rounded-md px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">キャンセル</button>
                    <button onClick={() => handleSaveAccess(m.userId)} disabled={busyId === m.userId} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                      {busyId === m.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "保存"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {members.length === 0 && <p className="px-5 py-6 text-center text-sm font-bold text-slate-400">メンバーがいません</p>}
      </div>

      {/* 招待中 */}
      {pendingInvites.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-xs font-black text-slate-500">招待中（{pendingInvites.length}件）</p>
          <ul className="mt-2 space-y-1.5">
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-amber-800">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{inv.email}</span>
                  <span className="shrink-0 text-[10px] font-semibold text-amber-600">{inv.grantFullAccess ? "全生徒" : `${inv.studentIds.length}名`}</span>
                </span>
                <button onClick={() => handleRevoke(inv.id)} disabled={busyId === inv.id} className="rounded-md p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700 disabled:opacity-50" title="招待を取り消す">
                  {busyId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
