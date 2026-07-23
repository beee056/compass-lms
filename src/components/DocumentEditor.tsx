"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { ArrowLeft, Save, Loader2, FileText, CheckCircle2, Sparkles, History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDocumentContent } from "@/lib/actions/document";
import { createDocumentRevision, reviewDocumentWithAI, updateDocumentBrief } from "@/lib/actions/document-revisions";
import { Badge } from "@/components/ui/badge";

export default function DocumentEditor({ 
  document, 
  backUrl,
  isMentorView
}: { 
  document: any, 
  backUrl: string,
  isMentorView: boolean
}) {
  const router = useRouter();
  const [content, setContent] = useState(document.content || "");
  const [prompt, setPrompt] = useState(document.prompt || "");
  const [requirements, setRequirements] = useState(document.requirements || "");
  const [charLimit, setCharLimit] = useState(document.charLimit?.toString() || "");
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateDocumentContent(document.id, content);
      if (result.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        toast.error(result.error);
        setSaveStatus("idle");
      }
    });
  };

  const handleBriefSave = () => {
    startTransition(async () => {
      const result = await updateDocumentBrief(document.id, { prompt, requirements, charLimit: charLimit ? Number(charLimit) : null });
      if (result.success) toast.success("設問と条件を保存しました");
      else toast.error(result.error);
    });
  };

  const handleCreateRevision = () => {
    startTransition(async () => {
      const result = await createDocumentRevision(document.id, content);
      if (result.success) {
        toast.success(`第${result.revisionNumber}稿を確定しました`);
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const handleAIReview = () => {
    startTransition(async () => {
      const result = await reviewDocumentWithAI(document.id, content);
      if (result.success) {
        toast.success(`第${result.revisionNumber}稿のAI添削が完了しました`);
        router.refresh();
      } else if ((result as { quotaExceeded?: boolean }).quotaExceeded) {
        toast.error(result.error);
        router.push("/upgrade");
      } else toast.error(result.error);
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={backUrl} className="p-2.5 bg-white border border-slate-200/60 rounded-full hover:bg-slate-50 transition-colors text-slate-500 shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {document.title}
              </h1>
              <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-200/60">
                {document.type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <FileText className="h-4 w-4" />
              <span>文字数: {content.length}字</span>
              {document.dueDate && (
                <span className="ml-2 text-slate-400">
                  提出期限: {new Date(document.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={handleCreateRevision} disabled={isPending} variant="outline" className="font-bold">
            <History className="mr-2 h-4 w-4" />稿を確定
          </Button>
          <Button onClick={handleAIReview} disabled={isPending} className="bg-violet-600 font-bold text-white hover:bg-violet-700">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}AI添削
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending || saveStatus === "saving"}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[120px] transition-all"
          >
            {saveStatus === "saving" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</>
            ) : saveStatus === "saved" ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" />保存しました</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />保存する</>
            )}
          </Button>
        </div>
      </div>

      <section className="mb-5 rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">設問・提出条件</p>
          {isMentorView && <Button type="button" size="sm" variant="outline" onClick={handleBriefSave} disabled={isPending} className="h-8 bg-white text-xs font-bold">条件を保存</Button>}
        </div>
        {isMentorView ? (
          <div className="mt-3 grid gap-3">
            <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="設問本文を入力" className="min-h-[90px] bg-white font-medium" />
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <Textarea value={requirements} onChange={(event) => setRequirements(event.target.value)} placeholder="提出形式、評価観点など" className="min-h-[64px] bg-white" />
              <div><label className="mb-1 block text-xs font-bold text-slate-600">字数上限</label><input type="number" min="1" max="20000" value={charLimit} onChange={(event) => setCharLimit(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" /></div>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{prompt || "設問はまだ登録されていません。"}</p>
            {(requirements || charLimit) && <p className="whitespace-pre-wrap text-xs font-medium text-slate-600">{requirements}{requirements && charLimit ? " / " : ""}{charLimit ? `${charLimit}字以内` : ""}</p>}
          </div>
        )}
      </section>

      {/* Editor Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-[70vh]">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>エディタ</span>
          {saveStatus === "saved" && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />最新の状態が保存されています</span>}
        </div>
        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (saveStatus === "saved") setSaveStatus("idle");
          }}
          className="flex-1 w-full p-6 border-0 focus-visible:ring-0 resize-none text-base leading-relaxed text-slate-700 font-serif"
          placeholder="ここに文章を入力してください..."
        />
      </div>

      {document.revisions?.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-black text-slate-800"><History className="h-5 w-5 text-indigo-600" />稿・AI添削履歴</h2>
          <div className="mt-4 space-y-4">
            {document.revisions.map((revision: any) => (
              <details key={revision.id} className="rounded-lg border border-slate-200 p-4" open={revision.revisionNumber === document.revisions[0].revisionNumber}>
                <summary className="cursor-pointer font-bold text-slate-700">第{revision.revisionNumber}稿 <span className="ml-2 text-xs font-medium text-slate-400">{new Date(revision.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</span></summary>
                <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{revision.content}</p>
                {revision.reviews?.map((review: any, index: number) => (
                  <div key={review.id} className="mt-3 rounded-md border-l-4 border-violet-400 bg-violet-50/60 p-3">
                    <p className="text-xs font-black text-violet-700">AI添削 {revision.reviews.length - index}回目・{new Date(review.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.feedback}</p>
                  </div>
                ))}
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
