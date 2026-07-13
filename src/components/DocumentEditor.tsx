"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { ArrowLeft, Save, Loader2, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDocumentContent } from "@/lib/actions/document";
import { Badge } from "@/components/ui/badge";

export default function DocumentEditor({ 
  document, 
  backUrl 
}: { 
  document: any, 
  backUrl: string 
}) {
  const [content, setContent] = useState(document.content || "");
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

        <div>
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
    </div>
  );
}
