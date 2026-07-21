"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Loader2, Trash2 } from "lucide-react";
import { editUniversity, deleteUniversity } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface EditUniversityDialogProps {
  university: {
    id: string;
    name: string;
    department: string;
  };
}

export default function EditUniversityDialog({ university }: EditUniversityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(university.name);
  const [department, setDepartment] = useState(university.department);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !department.trim()) return;

    startTransition(async () => {
      const result = await editUniversity(university.id, name, department);
      if (result.success) {
        toast.success("志望校を更新しました");
        setOpen(false);
      } else {
        toast.error("志望校の更新に失敗しました: " + result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUniversity(university.id);
      if (result.success) {
        toast.success("志望校を削除しました（書類・タスクは全体へ移動）");
        setConfirmDelete(false);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("志望校の削除に失敗しました: " + result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <div className="text-slate-400 hover:text-indigo-600 transition-colors ml-1.5 p-1 cursor-pointer bg-white rounded-full shadow-sm border border-slate-200" title="志望校を編集">
            <Edit2 className="h-3.5 w-3.5" />
          </div>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">志望校の編集</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            大学・学部名を変更すると、関連する自動生成タスクや書類の名称も自動的に新しい名称に更新されます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="uniName" className="text-slate-700 font-semibold text-sm">大学名</Label>
              <Input 
                id="uniName" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="例: 早稲田大学" 
                required 
                className="border-slate-200" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="uniDept" className="text-slate-700 font-semibold text-sm">学部名</Label>
              <Input 
                id="uniDept" 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)} 
                placeholder="例: 政治経済学部 (未定の場合は「学部未定」)" 
                required 
                className="border-slate-200" 
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="border-red-200 text-red-600 hover:bg-red-50 font-semibold gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              削除
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "更新する"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="この志望校を削除しますか？"
        description={`「${university.name} ${university.department}」のタブと、ひも付く募集要項・出願情報が削除されます。書類とタスクは「全体」タブへ移動して残ります。この操作は取り消せません。`}
        confirmLabel="削除する"
        destructive
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
