"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { GraduationCap, Loader2, ChevronDown, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateAdmission } from "@/lib/actions/admissions";
import { PROGRESS_STATUSES, type AdmissionInput } from "@/lib/admissions-constants";

interface Admission {
  id: string;
  name: string;
  department: string;
  method: string;
  examName: string | null;
  openCampusAttended: boolean;
  applicationRequirements: string | null;
  declinePolicy: string | null;
  needsMotivationLetter: boolean;
  needsSelfRecommendation: boolean;
  needsActivityReport: boolean;
  otherDocuments: string | null;
  applicationDeadline: string | null;
  deadlineType: string | null;
  mentorSubmissionDueDate: string | null;
  progressStatus: string;
  progressNote: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  未着手: "bg-slate-100 text-slate-500 border-slate-200",
  準備中: "bg-amber-50 text-amber-700 border-amber-200",
  提出済: "bg-blue-50 text-blue-700 border-blue-200",
  選考中: "bg-violet-50 text-violet-700 border-violet-200",
  合格: "bg-emerald-50 text-emerald-700 border-emerald-200",
  不合格: "bg-red-50 text-red-600 border-red-200",
  辞退: "bg-slate-100 text-slate-400 border-slate-200"
};

const EMPTY: AdmissionInput = {
  examName: "",
  openCampusAttended: false,
  applicationRequirements: "",
  declinePolicy: "",
  needsMotivationLetter: false,
  needsSelfRecommendation: false,
  needsActivityReport: false,
  otherDocuments: "",
  applicationDeadline: "",
  deadlineType: "",
  mentorSubmissionDueDate: "",
  progressStatus: "未着手",
  progressNote: ""
};

function toDateInput(value: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
}

export default function AdmissionTrackerSection({
  universities,
  isMentorView = false
}: {
  universities: Admission[];
  isMentorView?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdmissionInput>(EMPTY);

  function openEdit(u: Admission) {
    setEditingId(u.id);
    setForm({
      examName: u.examName ?? "",
      openCampusAttended: u.openCampusAttended,
      applicationRequirements: u.applicationRequirements ?? "",
      declinePolicy: u.declinePolicy ?? "",
      needsMotivationLetter: u.needsMotivationLetter,
      needsSelfRecommendation: u.needsSelfRecommendation,
      needsActivityReport: u.needsActivityReport,
      otherDocuments: u.otherDocuments ?? "",
      applicationDeadline: toDateInput(u.applicationDeadline),
      deadlineType: u.deadlineType ?? "",
      mentorSubmissionDueDate: toDateInput(u.mentorSubmissionDueDate),
      progressStatus: u.progressStatus,
      progressNote: u.progressNote ?? ""
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    startTransition(async () => {
      const result = await updateAdmission(editingId, form);
      if (result.success) {
        toast.success("出願情報を更新しました");
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    });
  }

  if (universities.length === 0) return null;

  return (
    <section>
      <h2 className="mb-6 flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-800">
        <GraduationCap className="h-6 w-6 text-emerald-500" />
        入試状況（出願管理）
      </h2>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">出願情報の編集</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              出願条件・必要書類・期限・進捗を記録します。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">入試の名称</Label>
                <Input value={form.examName} onChange={(e) => setForm({ ...form, examName: e.target.value })} placeholder="例: 公募推薦、探究評価型" className="h-11 border-slate-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">進捗状況</Label>
                <select value={form.progressStatus} onChange={(e) => setForm({ ...form, progressStatus: e.target.value })} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm">
                  {PROGRESS_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.openCampusAttended} onChange={(e) => setForm({ ...form, openCampusAttended: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              オープンキャンパス参加済み
            </label>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">出願条件</Label>
              <Textarea value={form.applicationRequirements} onChange={(e) => setForm({ ...form, applicationRequirements: e.target.value })} placeholder="例：評定平均3.5以上、英語資格CEFR B2以上" className="min-h-[70px] border-slate-200" />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">合格時の辞退可否</Label>
              <div className="flex gap-2">
                {["", "可", "不可", "専願"].map((v) => (
                  <button
                    key={v || "未設定"}
                    type="button"
                    onClick={() => setForm({ ...form, declinePolicy: v })}
                    className={`flex-1 rounded-md border px-2 py-2 text-xs font-bold transition-colors ${
                      form.declinePolicy === v ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {v || "未設定"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">必要書類</Label>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={form.needsMotivationLetter} onChange={(e) => setForm({ ...form, needsMotivationLetter: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  志望理由書
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={form.needsSelfRecommendation} onChange={(e) => setForm({ ...form, needsSelfRecommendation: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  自己推薦書
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={form.needsActivityReport} onChange={(e) => setForm({ ...form, needsActivityReport: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  活動報告書
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">その他必要書類</Label>
              <Textarea value={form.otherDocuments} onChange={(e) => setForm({ ...form, otherDocuments: e.target.value })} placeholder="例：調査書、英語資格証明書コピー" className="min-h-[60px] border-slate-200" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">出願期限</Label>
                <Input type="date" value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} className="h-11 border-slate-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">期限区分</Label>
                <div className="flex gap-2">
                  {["", "必着", "消印有効"].map((v) => (
                    <button
                      key={v || "未設定"}
                      type="button"
                      onClick={() => setForm({ ...form, deadlineType: v })}
                      className={`flex-1 rounded-md border px-2 py-2 text-xs font-bold transition-colors ${
                        form.deadlineType === v ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {v || "未設定"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">講師への提出予定日</Label>
              <Input type="date" value={form.mentorSubmissionDueDate} onChange={(e) => setForm({ ...form, mentorSubmissionDueDate: e.target.value })} className="h-11 border-slate-200" />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">進捗メモ</Label>
              <Textarea value={form.progressNote} onChange={(e) => setForm({ ...form, progressNote: e.target.value })} placeholder="例：一次選考通過、二次は10/12" className="min-h-[60px] border-slate-200" />
            </div>

            <DialogFooter className="mt-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingId(null)} className="border-slate-200 font-semibold text-slate-600">キャンセル</Button>
              <Button type="submit" disabled={isPending} className="min-w-[100px] bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "更新する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {universities.map((u, index) => {
          const requiredDocs = [
            u.needsMotivationLetter && "志望理由書",
            u.needsSelfRecommendation && "自己推薦書",
            u.needsActivityReport && "活動報告書"
          ].filter(Boolean) as string[];
          return (
            <Card key={u.id} className="overflow-hidden border-slate-200/60 bg-white shadow-sm">
              <details open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/60 p-4 transition-colors hover:bg-slate-100/60">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-800">{u.name} {u.department}</span>
                      {u.examName && <span className="rounded-sm bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{u.examName}</span>}
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${STATUS_STYLE[u.progressStatus] ?? ""}`}>{u.progressStatus}</span>
                    </span>
                    {u.applicationDeadline && (
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        出願期限: {formatDate(u.applicationDeadline)}（{u.deadlineType || "区分未設定"}）
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">オープンキャンパス</p>
                      <p className="font-medium text-slate-700">{u.openCampusAttended ? "参加済み" : "未参加"}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">合格時の辞退可否</p>
                      <p className="font-medium text-slate-700">{u.declinePolicy || "未設定"}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">必要書類</p>
                      <p className="font-medium text-slate-700">{requiredDocs.length > 0 ? requiredDocs.join("・") : "未設定"}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">講師への提出予定日</p>
                      <p className="font-medium text-slate-700">{formatDate(u.mentorSubmissionDueDate) || "未設定"}</p>
                    </div>
                  </div>
                  {u.applicationRequirements && (
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">出願条件</p>
                      <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-medium leading-6 text-slate-700">{u.applicationRequirements}</p>
                    </div>
                  )}
                  {u.otherDocuments && (
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">その他必要書類</p>
                      <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-medium leading-6 text-slate-700">{u.otherDocuments}</p>
                    </div>
                  )}
                  {u.progressNote && (
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">進捗メモ</p>
                      <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-medium leading-6 text-slate-700">{u.progressNote}</p>
                    </div>
                  )}
                  {isMentorView && (
                    <button onClick={() => openEdit(u)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50">
                      <Pencil className="h-3.5 w-3.5" />
                      編集
                    </button>
                  )}
                </div>
              </details>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
