"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createStudentDocument } from "@/lib/actions/drive";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateDocumentButton({ studentId, universities }: { studentId: string; universities: string[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [docType, setDocType] = useState("自己推薦書");
  const [selectedUni, setSelectedUni] = useState("共通");

  const handleTypeChange = (value: string | null) => {
    if (value) {
      setDocType(value);
    }
  };

  const handleUniChange = (value: string | null) => {
    if (value) {
      setSelectedUni(value);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await createStudentDocument(studentId, docType, selectedUni);
      
      if (result.success) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            新規書類を作成
          </button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">新規ドキュメントの作成</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Google Drive上に新しく作成し、志望校と紐付けて連携します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            {/* 関連志望校の選択 */}
            <div className="grid gap-2">
              <Label htmlFor="selectedUni" className="text-slate-700 font-semibold text-sm">対象の志望校</Label>
              <Select value={selectedUni} onValueChange={handleUniChange}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="志望校を選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="共通">共通 (志望校の指定なし)</SelectItem>
                  {universities.map((uni, idx) => (
                    <SelectItem key={idx} value={uni}>{uni}</SelectItem>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "作成する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
