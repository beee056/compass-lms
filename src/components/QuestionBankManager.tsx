"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Pencil,
  Search
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_CATEGORIES, getDisplayFieldCategory } from "@/lib/field-category";
import {
  copyQuestionBankEntry,
  setQuestionBankStatus,
  updateQuestionBankEntry
} from "@/lib/actions/question-bank";

const CATEGORY_OPTIONS = ["すべて", "小論文", "志望理由書", "面接"];
const STATUS_OPTIONS = [
  { value: "すべて", label: "すべての状態" },
  { value: "PENDING", label: "承認待ち" },
  { value: "ACTIVE", label: "公開中" },
  { value: "ARCHIVED", label: "アーカイブ" }
];
const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200"
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "公開中",
  PENDING: "承認待ち",
  ARCHIVED: "アーカイブ"
};

function sourceLabel(question: any): string {
  if (question.tenantId === null) return "共通";
  if (question.source === "AI_GENERATED") return "AI生成";
  if (question.source === "CUSTOM") return "カスタム";
  return "自作";
}

interface EditState {
  id: string;
  category: string;
  title: string;
  prompt: string;
  fieldCategory: string;
  university: string;
  modelAnswer: string;
  followUpQuestions: string;
}

export default function QuestionBankManager({ questions }: { questions: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("すべて");
  const [status, setStatus] = useState("すべて");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => questions.filter((question) => question.status === "PENDING").length,
    [questions]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return questions.filter((question) => {
      if (category !== "すべて" && question.category !== category) return false;
      if (status !== "すべて" && question.status !== status) return false;
      if (!normalizedQuery) return true;
      const haystack = [question.title, question.prompt, question.fieldCategory ?? "", question.university ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [questions, category, status, query]);

  const visible = filtered.slice(0, visibleCount);

  function runStatusChange(questionId: string, nextStatus: string, message: string) {
    setBusyId(questionId);
    startTransition(async () => {
      const result = await setQuestionBankStatus(questionId, nextStatus);
      setBusyId(null);
      if (result.success) {
        toast.success(message);
        router.refresh();
      } else {
        toast.error(result.error ?? "操作に失敗しました");
      }
    });
  }

  function runCopy(questionId: string) {
    setBusyId(questionId);
    startTransition(async () => {
      const result = await copyQuestionBankEntry(questionId);
      setBusyId(null);
      if (result.success) {
        toast.success("コピーを作成しました。一覧から編集できます");
        router.refresh();
      } else {
        toast.error(result.error ?? "コピーに失敗しました");
      }
    });
  }

  function openEdit(question: any) {
    setEdit({
      id: question.id,
      category: question.category,
      title: question.title ?? "",
      prompt: question.prompt ?? "",
      fieldCategory: question.fieldCategory ?? "",
      university: question.university ?? "",
      modelAnswer: question.modelAnswer ?? "",
      followUpQuestions: question.followUpQuestions ?? ""
    });
  }

  function submitEdit() {
    if (!edit) return;
    startTransition(async () => {
      const result = await updateQuestionBankEntry(edit.id, {
        title: edit.title,
        prompt: edit.prompt,
        fieldCategory: edit.fieldCategory || null,
        university: edit.university || null,
        modelAnswer: edit.modelAnswer || null,
        followUpQuestions: edit.followUpQuestions || null
      });
      if (result.success) {
        toast.success("問題を更新しました");
        setEdit(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    });
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          生徒から提案された設問が{pendingCount}件、承認待ちです。内容を確認して「承認して公開」してください。
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="タイトル・設問文・系統で検索"
            className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setVisibleCount(PAGE_SIZE); }}
          className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>{option === "すべて" ? "すべての種類" : option}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setVisibleCount(PAGE_SIZE); }}
          className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <p className="text-xs font-bold text-slate-500 lg:ml-auto">{filtered.length}問中 {visible.length}問を表示</p>
      </div>

      <div className="space-y-2">
        {visible.map((question) => {
          const isCommon = question.tenantId === null;
          const isOpen = openId === question.id;
          const isBusy = busyId === question.id && isPending;
          const fieldCategory = getDisplayFieldCategory(question.fieldCategory, question.university);
          return (
            <div key={question.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : question.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-sm bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-700">{question.category}</span>
                    {fieldCategory && (
                      <span className="rounded-sm bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-600">{fieldCategory}</span>
                    )}
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-black ${STATUS_STYLE[question.status] ?? ""}`}>
                      {STATUS_LABEL[question.status] ?? question.status}
                    </span>
                    <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{sourceLabel(question)}</span>
                  </span>
                  <span className="mt-1.5 block truncate text-sm font-black text-slate-800">{question.title}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-slate-100 p-4">
                  <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">設問</p>
                    <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm font-medium leading-6 text-slate-700">{question.prompt}</p>
                  </div>
                  {question.followUpQuestions && (
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">深掘り質問</p>
                      <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm font-medium leading-6 text-slate-700">{question.followUpQuestions}</p>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">模範解答・採点ポイント</p>
                    {question.modelAnswer ? (
                      <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm font-medium leading-6 text-slate-700">{question.modelAnswer}</p>
                    ) : (
                      <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                        未登録です。登録するとAI採点の参照に使われ、採点精度が上がります。
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {isBusy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    {question.status === "PENDING" && !isCommon && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => runStatusChange(question.id, "ACTIVE", "承認して公開しました")}
                        className="bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        承認して公開
                      </Button>
                    )}
                    {!isCommon && (
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => openEdit(question)} className="font-bold">
                        <Pencil className="mr-1.5 h-4 w-4" />
                        編集
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => runCopy(question.id)} className="font-bold">
                      <Copy className="mr-1.5 h-4 w-4" />
                      コピーして編集
                    </Button>
                    {!isCommon && question.status !== "ARCHIVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runStatusChange(question.id, "ARCHIVED", "アーカイブしました（選択肢から非表示になります）")}
                        className="font-bold text-slate-500"
                      >
                        <Archive className="mr-1.5 h-4 w-4" />
                        アーカイブ
                      </Button>
                    )}
                    {!isCommon && question.status === "ARCHIVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runStatusChange(question.id, "ACTIVE", "公開に戻しました")}
                        className="font-bold"
                      >
                        <ArchiveRestore className="mr-1.5 h-4 w-4" />
                        公開に戻す
                      </Button>
                    )}
                    {isCommon && (
                      <p className="text-xs font-semibold text-slate-400">
                        共通問題は編集できません。「コピーして編集」で自分の問題として調整できます。
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
            該当する問題がありません。
          </p>
        )}
      </div>

      {visibleCount < filtered.length && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="font-bold">
            さらに表示
          </Button>
        </div>
      )}

      {/* 編集ダイアログ */}
      <Dialog open={!!edit} onOpenChange={(open) => { if (!open) setEdit(null); }}>
        <DialogContent className="sm:max-w-[680px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">問題を編集</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              変更は今後の演習にだけ反映されます。過去の演習記録には影響しません。
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">タイトル</Label>
                <Input value={edit.title} maxLength={60} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="h-10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">系統</Label>
                  <select
                    value={edit.fieldCategory}
                    onChange={(e) => setEdit({ ...edit, fieldCategory: e.target.value })}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">未設定</option>
                    {FIELD_CATEGORIES.map((field) => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">対象大学（任意）</Label>
                  <Input value={edit.university} onChange={(e) => setEdit({ ...edit, university: e.target.value })} className="h-10" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">
                  設問本文{edit.category === "面接" ? "（主質問1問のみ）" : ""}
                </Label>
                <Textarea value={edit.prompt} onChange={(e) => setEdit({ ...edit, prompt: e.target.value })} className="min-h-[120px]" />
              </div>
              {edit.category === "面接" && (
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">深掘り質問（1行1問）</Label>
                  <Textarea value={edit.followUpQuestions} onChange={(e) => setEdit({ ...edit, followUpQuestions: e.target.value })} className="min-h-[80px]" />
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">模範解答・採点ポイント（AI採点の参照に使われます）</Label>
                <Textarea value={edit.modelAnswer} onChange={(e) => setEdit({ ...edit, modelAnswer: e.target.value })} className="min-h-[120px]" />
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setEdit(null)} className="font-semibold">キャンセル</Button>
            <Button onClick={submitEdit} disabled={isPending} className="bg-blue-600 font-bold text-white hover:bg-blue-700 min-w-[110px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
