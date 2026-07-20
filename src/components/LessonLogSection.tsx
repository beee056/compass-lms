"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { BookMarked, Plus, Loader2, ChevronDown, Pencil, Trash2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createLessonLog, updateLessonLog, deleteLessonLog, type LessonLogInput } from "@/lib/actions/lesson-logs";

interface LessonLog {
  id: string;
  authorName: string;
  lessonDate: string;
  startTime: string | null;
  endTime: string | null;
  content: string;
  homework: string | null;
  nextPlan: string | null;
  memo: string | null;
}

const EMPTY: LessonLogInput = { lessonDate: "", startTime: "", endTime: "", content: "", homework: "", nextPlan: "", memo: "" };

function todayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function LessonLogSection({
  studentId,
  initialLogs,
  isMentorView = false
}: {
  studentId: string;
  initialLogs: LessonLog[];
  isMentorView?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonLogInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const logs = initialLogs || [];

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY, lessonDate: todayJST() });
    setError(null);
    setOpen(true);
  }

  function openEdit(log: LessonLog) {
    setEditingId(log.id);
    setForm({
      lessonDate: new Date(log.lessonDate).toISOString().slice(0, 10),
      startTime: log.startTime ?? "",
      endTime: log.endTime ?? "",
      content: log.content,
      homework: log.homework ?? "",
      nextPlan: log.nextPlan ?? "",
      memo: log.memo ?? ""
    });
    setError(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editingId ? await updateLessonLog(editingId, form) : await createLessonLog(studentId, form);
      if (result.success) {
        toast.success(editingId ? "授業記録を更新しました" : "授業記録を追加しました");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "保存に失敗しました");
      }
    });
  }

  function handleDelete(log: LessonLog) {
    if (!window.confirm("この授業記録を削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteLessonLog(log.id);
      if (result.success) {
        toast.success("授業記録を削除しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "削除に失敗しました");
      }
    });
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-800">
          <BookMarked className="h-6 w-6 text-violet-500" />
          授業・面談記録
        </h2>
        {isMentorView && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            記録を追加
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {editingId ? "授業記録の編集" : "授業記録の追加"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              実施した内容と宿題・次回予定を残します。生徒も閲覧できます。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">授業日</Label>
                <Input type="date" required value={form.lessonDate} onChange={(e) => setForm({ ...form, lessonDate: e.target.value })} className="h-11 border-slate-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">開始</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="h-11 border-slate-200" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">終了</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="h-11 border-slate-200" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">授業でやったこと</Label>
              <Textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="例：自己分析ワーク②の振り返り、志望理由書の構成案レビュー" className="min-h-[100px] border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">宿題</Label>
              <Textarea value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} placeholder="例：小論文ワーク3を1周、大学のAP読み込み" className="min-h-[70px] border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">次回授業の予定</Label>
              <Textarea value={form.nextPlan} onChange={(e) => setForm({ ...form, nextPlan: e.target.value })} placeholder="例：8/4(月)19:00 志望理由書 第2稿レビュー" className="min-h-[70px] border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">メモ（申し送り）</Label>
              <Textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="例：模試の結果待ち。保護者から進路相談の希望あり" className="min-h-[70px] border-slate-200" />
            </div>
            <DialogFooter className="mt-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 font-semibold text-slate-600">キャンセル</Button>
              <Button type="submit" disabled={isPending} className="min-w-[120px] bg-violet-600 font-bold text-white hover:bg-violet-700">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "更新する" : "追加する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {logs.length === 0 ? (
          <Card className="border-slate-200/60 bg-white/80 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BookMarked className="h-6 w-6" />
            </div>
            <p className="font-semibold text-slate-500">まだ授業記録がありません。</p>
            <p className="mt-1 text-sm text-slate-400">
              {isMentorView ? "面談のたびに記録を残すと、指導の連続性が保てます。" : "指導者が授業記録を追加すると、ここに表示されます。"}
            </p>
          </Card>
        ) : (
          logs.map((log, index) => (
            <Card key={log.id} className="overflow-hidden border-slate-200/60 bg-white shadow-sm">
              <details open={index === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50/60 p-4 transition-colors hover:bg-slate-100/60">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-800">{formatDate(log.lessonDate)}</span>
                      {(log.startTime || log.endTime) && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {log.startTime ?? "--"}〜{log.endTime ?? "--"}
                        </span>
                      )}
                      <span className="rounded-sm bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">{log.authorName}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-slate-600">{log.content}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-4">
                  {[
                    ["授業でやったこと", log.content],
                    ["宿題", log.homework],
                    ["次回授業の予定", log.nextPlan],
                    ["メモ（申し送り）", log.memo]
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label as string}>
                        <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                        <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm font-medium leading-7 text-slate-700">{value}</p>
                      </div>
                    ) : null
                  )}
                  {isMentorView && (
                    <div className="flex gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => openEdit(log)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50">
                        <Pencil className="h-3.5 w-3.5" />
                        編集
                      </button>
                      <button onClick={() => handleDelete(log)} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </details>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
