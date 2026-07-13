"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Folder, ExternalLink, FileText, Clock, Archive, Send, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { archiveDocument, submitDocument, setDocumentStatus } from "@/lib/actions";
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
  universities: string[];
  isStudent?: boolean;
}

export default function DocumentList({ studentId, driveUrl, initialDocuments, universities, isStudent = false }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
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
              <div key={doc.id} className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-indigo-50/50 text-indigo-600 rounded-xl border border-indigo-100/50">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    {doc.isInternal ? (
                      <a 
                        href={isStudent ? `/portal/documents/${doc.id}` : `/students/${studentId}/documents/${doc.id}`} 
                        className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-2 text-base"
                      >
                        {doc.title}
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-sm font-bold ml-1">アプリ内</span>
                      </a>
                    ) : doc.url ? (
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-2 text-base"
                      >
                        {doc.title}
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span className="font-bold text-slate-800 text-base">{doc.title}</span>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[11px] py-0.5 px-2 bg-slate-100/80 text-slate-500 font-bold rounded-sm border border-slate-200/50">
                        {doc.type}
                      </span>
                      {doc.isInternal && (
                        <span className={`text-[11px] py-0.5 px-2 font-bold rounded-sm border ${STATUS_STYLE[doc.status || "DRAFT"]}`}>
                          {STATUS_LABEL[doc.status || "DRAFT"]}
                        </span>
                      )}
                      {doc.dueDate && (
                        <span className="text-xs text-indigo-500 font-bold flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          期限: {new Date(doc.dueDate).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        更新: {new Date(doc.updatedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 生徒: 内部書類を提出するボタン（下書き/差し戻し時のみ） */}
                {isStudent && doc.isInternal && (doc.status === "DRAFT" || !doc.status) && (
                  <button
                    onClick={() => handleSubmit(doc.id)}
                    disabled={isPending}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    提出する
                  </button>
                )}
                {isStudent && doc.status === "DONE" && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    完了
                  </span>
                )}

                {!isStudent && (
                  <div className="flex items-center gap-1">
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditDocumentDialog document={doc} />
                      <button
                        onClick={() => setArchiveTargetId(doc.id)}
                        className="p-2.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:opacity-100"
                        title="アーカイブする"
                        aria-label="書類をアーカイブする"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
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
    </section>
  );
}
