"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { UserPlus, Loader2, XCircle, Mail, CheckCircle2, Users, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTenantInvite, revokeTenantInvite, updateMentorAccess } from "@/lib/actions/tenant-invites";

interface Invite {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  grantFullAccess: boolean;
  studentIds: string[];
}
interface Mentor {
  id: string;
  name: string;
  email: string;
  hasFullTenantAccess: boolean;
  assignedStudentIds: string[];
}
interface StudentOption {
  id: string;
  name: string;
}

// 生徒選択チェックボックスリスト（招待・アクセス編集で共用）
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
    return <p className="text-xs font-medium text-slate-400">共有できる生徒がいません。先に生徒を登録してください。</p>;
  }
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
      {students.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => onToggle(s.id)} className="h-4 w-4 rounded border-slate-300" />
          <span className="font-medium text-slate-700">{s.name}</span>
        </label>
      ))}
    </div>
  );
}

// 同じワークスペースに講師を招待し、共有する生徒を選ぶ（メンター専用）
export default function MentorInviteManager({
  invites,
  mentors,
  students,
  canManageAccess
}: {
  invites: Invite[];
  mentors: Mentor[];
  students: StudentOption[];
  canManageAccess: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [grantFullAccess, setGrantFullAccess] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingMentorId, setEditingMentorId] = useState<string | null>(null);
  const [editFullAccess, setEditFullAccess] = useState(true);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);

  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  function toggleInviteStudent(id: string) {
    setSelectedStudentIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }
  function toggleEditStudent(id: string) {
    setEditStudentIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (!grantFullAccess && selectedStudentIds.length === 0) {
      toast.error("共有する生徒を1名以上選択してください");
      return;
    }
    startTransition(async () => {
      const result = await createTenantInvite(email, { grantFullAccess, studentIds: selectedStudentIds });
      if (result.success) {
        toast.success("招待メールを送信しました");
        if ((result as any).emailError) toast.error((result as any).emailError);
        setEmail("");
        setGrantFullAccess(true);
        setSelectedStudentIds([]);
        router.refresh();
      } else {
        toast.error(result.error ?? "招待に失敗しました");
      }
    });
  }

  function handleRevoke(id: string) {
    if (!window.confirm("この招待を取り消しますか？")) return;
    setBusyId(id);
    startTransition(async () => {
      const result = await revokeTenantInvite(id);
      setBusyId(null);
      if (result.success) {
        toast.success("招待を取り消しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "取り消しに失敗しました");
      }
    });
  }

  function openEditAccess(mentor: Mentor) {
    setEditingMentorId(mentor.id);
    setEditFullAccess(mentor.hasFullTenantAccess);
    setEditStudentIds(mentor.assignedStudentIds);
  }

  function handleSaveAccess(mentorId: string) {
    if (!editFullAccess && editStudentIds.length === 0) {
      toast.error("共有する生徒を1名以上選択してください");
      return;
    }
    setBusyId(mentorId);
    startTransition(async () => {
      const result = await updateMentorAccess(mentorId, { grantFullAccess: editFullAccess, studentIds: editStudentIds });
      setBusyId(null);
      if (result.success) {
        toast.success("アクセス範囲を更新しました");
        setEditingMentorId(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    });
  }

  const formatDate = (v: string) =>
    new Date(v).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });

  const pending = invites.filter((i) => !i.acceptedAt);

  return (
    <Card className="border-slate-200/60 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800">
        <UserPlus className="h-5 w-5 text-indigo-500" />
        講師（メンター）の招待
      </h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        同じワークスペースで生徒を共同指導する講師を招待できます。招待されたメールアドレスで新規登録すると、自動的にこのワークスペースに参加します。
      </p>

      {!canManageAccess && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs font-semibold text-amber-700">
          あなたは特定の生徒だけを共有された講師のため、招待やアクセス範囲の管理はできません。
        </p>
      )}

      {canManageAccess && (
        <form onSubmit={handleInvite} className="mt-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="grid gap-1.5">
            <Label className="text-sm font-semibold text-slate-700">招待する講師のメールアドレス</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例: teacher@example.com"
              className="h-11 border-slate-200 bg-white"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-sm font-semibold text-slate-700">共有する生徒</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGrantFullAccess(true)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
                  grantFullAccess ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                全ての生徒（フルアクセス）
              </button>
              <button
                type="button"
                onClick={() => setGrantFullAccess(false)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
                  !grantFullAccess ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                選択した生徒のみ
              </button>
            </div>
            {!grantFullAccess && (
              <div className="mt-2 bg-white">
                <StudentPicker students={students} selected={selectedStudentIds} onToggle={toggleInviteStudent} />
              </div>
            )}
          </div>

          <Button type="submit" disabled={isPending || !email.trim()} className="h-11 w-full bg-indigo-600 font-bold text-white hover:bg-indigo-700 sm:w-auto">
            {isPending && !busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : "招待を送る"}
          </Button>
        </form>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-black text-slate-700">現在のメンバー（{mentors.length}名）</h4>
        <ul className="mt-2 space-y-2">
          {mentors.map((m) => {
            const isEditing = editingMentorId === m.id;
            return (
              <li key={m.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="font-bold text-slate-700">{m.name}</span>
                    <span className="truncate text-xs text-slate-400">{m.email}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {m.hasFullTenantAccess ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <Users className="h-3 w-3" />
                        全生徒
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                        <Users className="h-3 w-3" />
                        {m.assignedStudentIds.length}名のみ
                      </span>
                    )}
                    {canManageAccess && (
                      <button
                        onClick={() => (isEditing ? setEditingMentorId(null) : openEditAccess(m))}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                        title="アクセス範囲を編集"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
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
                      <button
                        type="button"
                        onClick={() => setEditFullAccess(true)}
                        className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                          editFullAccess ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        全ての生徒
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFullAccess(false)}
                        className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                          !editFullAccess ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        選択した生徒のみ
                      </button>
                    </div>
                    {!editFullAccess && (
                      <div className="bg-white">
                        <StudentPicker students={students} selected={editStudentIds} onToggle={toggleEditStudent} />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingMentorId(null)} className="rounded-md px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleSaveAccess(m.id)}
                        disabled={busyId === m.id}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {busyId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "保存"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {pending.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-black text-slate-700">招待中（{pending.length}件）</h4>
          <ul className="mt-2 space-y-1.5">
            {pending.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="truncate font-semibold text-slate-700">{invite.email}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {invite.grantFullAccess ? "全生徒" : `${invite.studentIds.length}名`} / 期限 {formatDate(invite.expiresAt)}
                  </span>
                </span>
                {canManageAccess && (
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={busyId === invite.id}
                    className="shrink-0 rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-50 disabled:opacity-50"
                    title="招待を取り消す"
                  >
                    {busyId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
