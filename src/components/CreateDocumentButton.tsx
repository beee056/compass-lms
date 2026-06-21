"use client";

import { useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createStudentDocument } from "@/lib/actions/drive";

export default function CreateDocumentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    // 実際は書類種別を選択するダイアログなどを出す想定。今回は固定。
    const docType = "志望理由書";
    
    startTransition(async () => {
      const result = await createStudentDocument(studentId, docType);
      if (!result.success) {
        alert(result.error);
      }
    });
  };

  return (
    <button 
      onClick={handleCreate}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {isPending ? "作成中..." : "新規書類を作成"}
    </button>
  );
}
