"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Folder, ExternalLink, FileText, Clock, Archive, Send, CheckCircle2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { archiveDocument, deleteDocument, submitDocument, setDocumentStatus } from "@/lib/actions";
import CreateDocumentButton from "./CreateDocumentButton";
import EditDocumentDialog from "./EditDocumentDialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface Document {
  id: string;
  title: string;
  url: string | null;
  type: string;
  dueDate?: Date | null;
  isInternal?: boolean;
  content?: string | null;
  isArchived: boolean;
  status?: string;
  universityId?: string | null;
  updatedAt: Date;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-500 border-slate-200",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
  REVIEWING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200"
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済み",
  REVIEWING: "レビュー中",
  DONE: "完了"
};

interface DocumentListProps {
  studentId: string;
  driveUrl: string | null;
  initialDocuments: Document[];
  universities: { id: string; label: string }[];
  isStudent?: boolean;
}

export default function DocumentList({ studentId, driveUrl, initialDocuments, universities, isStudent = false }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (docId: string) => {
    startTransition(async () => {
      const result = await submitDocument(docId);
      if (result.success) {
        toast.success("書類を提出しました");
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: "SUBMITTED" } : d));
      } else {
        toast.error("提出に失敗しました: " + result.error);
      }
    });
  };

  const handleStatusChange = (docId: string, status: string) => {
    startTransition(async () => {
      const result = await setDocumentStatus(docId, status);
      if (result.success) {
        toast.success(`ステータスを「${STATUS_LABEL[status]}」に更新しました`);
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
      } else {
        toast.error("更新に失敗しました: " + result.error);
      }
    });
  };

  const handleArchive = async () => {
    const docId = archiveTargetId;
    if (!docId) return;
    setArchiveTargetId(null);

    // 楽観的アップデート
    const originalDocs = [...documents];
    setDocuments(prev => prev.filter(d => d.id !== docId));

    const result = await archiveDocument(docId);
    if (result.success) {
      toast.success("書類をアーカイブしました");
    } else {
      toast.error("書類のアーカイブに失敗しました: " + result.error);
      setDocuments(originalDocs);
    }
  };

  const handleDelete = async () => {
    const docId = deleteTargetId;
    if (!docId) return;
    setDeleteTargetId(null);

    const originalDocs = [...documents];
    setDocuments(prev => prev.filter(d => d.id !== docId));

    const result = await deleteDocument(docId);
    if (result.success) {
      toast.success("書類を削除しました");
    } else {
      toast.error("書類の削除に失敗しました: " + result.error);
      setDocuments(originalDocs);
    }
  };

  // Propsの更新を監視してステートを更新
  const [prevInitialDocs, setPrevInitialDocs] = useState(initialDocuments);
  if (initialDocuments !== prevInitialDocs) {
    setDocuments(initialDocuments);
    setPrevInitialDocs(initialDocuments);
  }

  const activeDocs = documents.filter(d => !d.isArchived);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
          <Folder className="h-6 w-6 text-indigo-500" />
          提出書類・ドキュメント
        </h2>
        <div className="flex gap-3">
          {driveUrl && (
            <a 
              href={driveUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/60 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ExternalLink className="h-4 w-4" />
              生徒フォルダ (Drive)
            </a>
          )}
          {!isStudent && <CreateDocumentButton studentId={studentId} universities={universities} />}
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden bg-white/80 backdrop-blur-sm">
        <div className="divide-y divide-slate-100">
          {activeDocs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-sm">
              ドキュメントがまだありません。
            </div>
          ) : (
            activeDocs.map((doc) => (
              <div
                key={doc.id}
                className="group flex flex-wrap items-center gap-x-4 gap-y-3 p-5 transition-colors hover:bg-slate-50/80"
              >
                {/* アイコン */}
                <div className="hidden shrink-0 rounded-xl border border-indigo-100/50 bg-indigo-50/50 p-3 text-indigo-600 sm:block">
                  <FileText className="h-5 w-5" />
                </div>

                {/* 1カラム目: タイトル（1行・省略）＋種別/ステータス */}
                <div className="min-w-0 flex-1 basis-[16rem]">
                  {doc.isInternal ? (
                    <a
                      href={isStudent ? `/portal/documents/${doc.id}` : `/students/${studentId}/documents/${doc.id}`}
                      className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-800 transition-colors hover:text-indigo-600"
                    >
                      <span className="truncate">{doc.title}</span>
                      <span className="shrink-0 whitespace-nowrap rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">アプリ内</span>
                    </a>
                  ) : doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-800 transition-colors hover:text-indigo-600"
                    >
                      <span className="truncate">{doc.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  ) : (
                    <span className="block truncate text-base font-bold text-slate-800">{doc.title}</span>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-sm border border-slate-200/50 bg-slate-100/80 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                      {doc.type}
                    </span>
                    {doc.isInternal && (
                      <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[doc.status || "DRAFT"]}`}>
                        {STATUS_LABEL[doc.status || "DRAFT"]}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2カラム目: 期限・更新（2列で整列） */}
                <div className="flex shrink-0 items-start gap-6">
                  <div className="w-[92px]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">期限</div>
                    <div className="mt-0.5 text-xs font-bold text-indigo-500">
                      {doc.dueDate ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {new Date(doc.dueDate).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                        </span>
                      ) : (
                        <span className="text-slate-300">未設定</span>
                      )}
                    </div>
                  </div>
                  <div className="w-[72px]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">更新</div>
                    <div className="mt-0.5 whitespace-nowrap text-xs font-medium text-slate-500">
                      {new Date(doc.updatedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </div>
                  </div>
                </div>

                {/* 3カラム目: 操作 */}
                <div className="flex shrink-0 items-center gap-1">
                  {/* 生徒: 内部書類を提出するボタン（下書き/差し戻し時のみ） */}
                  {isStudent && doc.isInternal && (doc.status === "DRAFT" || !doc.status) && (
                    <button
                      onClick={() => handleSubmit(doc.id)}
                      disabled={isPending}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      提出する
                    </button>
                  )}
                  {isStudent && doc.status === "DONE" && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      完了
                    </span>
                  )}

                  {!isStudent && (
                    <>
                      {/* メンター: ステータス変更 */}
                      {doc.isInternal && (
                        <select
                          value={doc.status || "DRAFT"}
                          onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                          disabled={isPending}
                          aria-label="書類のステータスを変更"
                          className="mr-1 h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 focus-visible:ring-[#3346a3]/30"
                        >
                          <option value="DRAFT">下書き</option>
                          <option value="SUBMITTED">提出済み</option>
                          <option value="REVIEWING">レビュー中</option>
                          <option value="DONE">完了</option>
                        </select>
                      )}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <EditDocumentDialog document={doc} universities={universities} />
                        <button
                          onClick={() => setArchiveTargetId(doc.id)}
                          className="rounded-lg p-2.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:opacity-100"
                          title="アーカイブする"
                          aria-label="書類をアーカイブする"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(doc.id)}
                          className="rounded-lg p-2.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 focus:opacity-100"
                          title="完全に削除する"
                          aria-label="書類を削除する"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={archiveTargetId !== null}
        onOpenChange={(o) => { if (!o) setArchiveTargetId(null); }}
        title="書類をアーカイブしますか？"
        description="一覧には表示されなくなります（データは残ります）。"
        confirmLabel="アーカイブする"
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => { if (!o) setDeleteTargetId(null); }}
        title="書類を完全に削除しますか？"
        description="本文・稿・AI添削履歴もすべて削除されます。アーカイブと違い、この操作は取り消せません。"
        confirmLabel="削除する"
        destructive
        onConfirm={handleDelete}
      />
    </section>
  );
}
