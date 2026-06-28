"use client";

import { useState, useTransition } from "react";
import { Edit2, Loader2 } from "lucide-react";
import { updateDocument } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EditDocumentDialogProps {
  document: {
    id: string;
    title: string;
    dueDate?: Date | null;
  };
  trigger?: React.ReactNode;
}

export default function EditDocumentDialog({ document, trigger }: EditDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(document.title);
  const [dueDate, setDueDate] = useState(document.dueDate ? new Date(document.dueDate).toISOString().split('T')[0] : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await updateDocument(document.id, title, dueDate || null);
      if (result.success) {
        setOpen(false);
      } else {
        alert("書類の更新に失敗しました: " + result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            trigger
          ) : (
            <button className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus:opacity-100" title="書類の編集">
              <Edit2 className="h-4 w-4" />
            </button>
          ) as any
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">書類の編集</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            書類の表示名や提出期限を変更します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="docTitle" className="text-slate-700 font-semibold text-sm">書類の名称</Label>
              <Input 
                id="docTitle" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="例: 【慶應義塾大学 総合政策学部】自己推薦書" 
                required 
                className="border-slate-200" 
              />
            </div>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "更新する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
