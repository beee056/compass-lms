"use client";

import { useState } from "react";
import { Folder, ExternalLink, FileText, Clock, Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { archiveDocument } from "@/lib/actions";
import CreateDocumentButton from "./CreateDocumentButton";
import EditDocumentDialog from "./EditDocumentDialog";

interface Document {
  id: string;
  title: string;
  url: string | null;
  type: string;
  isArchived: boolean;
  updatedAt: Date;
}

interface DocumentListProps {
  studentId: string;
  driveUrl: string | null;
  initialDocuments: Document[];
  universities: string[];
  isStudent?: boolean;
}

export default function DocumentList({ studentId, driveUrl, initialDocuments, universities, isStudent = false }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const handleArchive = async (docId: string) => {
    if (!confirm("この書類をアーカイブしますか？（一覧には表示されなくなります）")) return;

    // 楽観的アップデート
    const originalDocs = [...documents];
    setDocuments(prev => prev.filter(d => d.id !== docId));

    const result = await archiveDocument(docId);
    if (!result.success) {
      alert("書類のアーカイブに失敗しました: " + result.error);
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
                    {doc.url ? (
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
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] py-0.5 px-2 bg-slate-100/80 text-slate-500 font-bold rounded-sm border border-slate-200/50">
                        {doc.type}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        更新: {new Date(doc.updatedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                      </span>
                    </div>
                  </div>
                </div>
                {!isStudent && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditDocumentDialog document={doc} />
                    <button 
                      onClick={() => handleArchive(doc.id)}
                      className="p-2.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:opacity-100" 
                      title="アーカイブする"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
