"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Edit2, Loader2 } from "lucide-react";
import { updateTask } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EditTaskDialogProps {
  task: {
    id: string;
    title: string;
    dueDate?: string | Date | null;
    universityId?: string | null;
  };
  universities?: { id: string; label: string }[];
  trigger?: React.ReactNode;
}

export default function EditTaskDialog({ task, universities = [], trigger }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);

  // yyyy-MM-dd に変換
  const defaultDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "";
  const [date, setDate] = useState(defaultDate);
  const [universityId, setUniversityId] = useState(task.universityId ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await updateTask(task.id, title, date || undefined, universityId || null);
      if (result.success) {
        toast.success("タスクを更新しました");
        setOpen(false);
      } else {
        toast.error("タスクの更新に失敗しました: " + result.error);
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
            <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="タスクを編集">
              <Edit2 className="h-4 w-4" />
            </button>
          ) as any
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">タスクの編集</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            タスクの内容や期日を変更します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taskTitle" className="text-slate-700 font-semibold text-sm">タスク名</Label>
              <Input 
                id="taskTitle" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="例: 自己推薦書 初稿" 
                required 
                className="border-slate-200" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taskDate" className="text-slate-700 font-semibold text-sm">期日 (任意)</Label>
              <Input
                id="taskDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-slate-200 text-slate-700"
              />
            </div>
            {universities.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="taskUniversity" className="text-slate-700 font-semibold text-sm">対象の志望校（タブの振り分け）</Label>
                <select
                  id="taskUniversity"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">全体（志望校の指定なし）</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
            )}
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
