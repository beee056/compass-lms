"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Plus, Loader2, FileText, Sparkles } from "lucide-react";
import { createStudentDocument } from "@/lib/actions/drive";
import { createBlankDocument, generateDocumentDraft } from "@/lib/actions/document";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface UniversityOption {
  id: string;
  label: string;
}

export default function CreateDocumentButton({ studentId, universities }: { studentId: string; universities: UniversityOption[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"docs" | "ai" | "blank">("blank");
  const [docType, setDocType] = useState("自己推薦書");
  const [selectedUniversityId, setSelectedUniversityId] = useState("common");
  const [dueDate, setDueDate] = useState("");
  const [keywords, setKeywords] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUniversity = universities.find((university) => university.id === selectedUniversityId);
    const universityName = selectedUniversity?.label ?? "共通";
    const universityId = selectedUniversity?.id ?? null;

    startTransition(async () => {
      let result;
      if (mode === "docs") {
        result = await createStudentDocument(studentId, docType, universityName, dueDate || null, universityId);
      } else if (mode === "blank") {
        result = await createBlankDocument(studentId, docType, universityName, dueDate || null, universityId);
      } else {
        result = await generateDocumentDraft(studentId, docType, universityName, keywords, dueDate || null, universityId);
      }
      
      if (result.success) {
        toast.success("書類を作成しました");
        setOpen(false);
        setKeywords("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm" />}>
        <Plus className="h-4 w-4" />
        新規書類を作成
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">新規ドキュメントの作成</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            作成方法を選択してください。
          </DialogDescription>
        </DialogHeader>

        {/* モード切替タブ */}
        <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setMode("blank")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${
              mode === "blank" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            空白から作成
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${
              mode === "ai" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AIドラフト
          </button>
          <button
            type="button"
            onClick={() => setMode("docs")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-md transition-all ${
              mode === "docs" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            Google Docs
          </button>
        </div>
        <p className="mb-2 -mt-2 text-xs font-medium text-slate-400">
          {mode === "blank"
            ? "アプリ内エディタで白紙から書き始めます。"
            : mode === "ai"
              ? "入力したポイントをもとにAIが初稿を作成し、アプリ内エディタで編集できます。"
              : "Google Driveに空のドキュメントを作成してリンクします。"}
        </p>

        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-2">
            {/* 関連志望校の選択 */}
            <div className="grid gap-2">
              <Label htmlFor="selectedUni" className="text-slate-700 font-semibold text-sm">対象の志望校</Label>
              <Select value={selectedUniversityId} onValueChange={(value) => setSelectedUniversityId(value ?? "common")}>
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue placeholder="志望校を選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="common">共通 (志望校の指定なし)</SelectItem>
                  {universities.map((university) => (
                    <SelectItem key={university.id} value={university.id}>{university.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 書類種類の選択 */}
            <div className="grid gap-2">
              <Label htmlFor="docType" className="text-slate-700 font-semibold text-sm">書類の種類</Label>
              <Input 
                id="docType" 
                value={docType} 
                onChange={(e) => setDocType(e.target.value)}
                placeholder="書類の種類を入力..." 
                list="doc-options"
                className="border-slate-200" 
              />
              <datalist id="doc-options">
                <option value="自己推薦書" />
                <option value="活動報告書" />
                <option value="小論文" />
                <option value="プレゼンテーション" />
                <option value="面接準備" />
                <option value="備忘メモ" />
              </datalist>
            </div>

            {/* AIモード専用フィールド */}
            {mode === "ai" && (
              <div className="grid gap-2">
                <Label htmlFor="keywords" className="text-slate-700 font-semibold text-sm">
                  アピールポイント・構成案（AIドラフト作成用）
                </Label>
                <Textarea 
                  id="keywords" 
                  value={keywords} 
                  onChange={(e) => setKeywords(e.target.value)} 
                  placeholder="例：高校時代のボランティア経験、リーダーシップ、マーケティングへの興味など、書類に盛り込みたい要素を自由に入力してください。" 
                  className="border-slate-200 min-h-[100px]" 
                  required
                />
              </div>
            )}

            {/* 提出期限の選択 */}
            <div className="grid gap-2">
              <Label htmlFor="dueDate" className="text-slate-700 font-semibold text-sm">提出期限 (任意)</Label>
              <Input 
                id="dueDate" 
                type="date"
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="border-slate-200" 
              />
            </div>
          </div>
          <DialogFooter className="mt-4 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[140px]">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {mode === "ai" ? "AIで作成中..." : "作成中..."}
                </>
              ) : mode === "ai" ? (
                "AIドラフトを作成"
              ) : mode === "blank" ? (
                "空白ドキュメントを作成"
              ) : (
                "Google Docsを作成"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
