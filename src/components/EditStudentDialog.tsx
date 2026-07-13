"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Edit2, Loader2, Trash2 } from "lucide-react";
import { updateStudent, deleteStudent, archiveStudent } from "@/lib/actions";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface EditStudentDialogProps {
  student: {
    id: string;
    name: string;
    phase: string;
    highSchool?: string;
    grade?: string;
    phone?: string;
    parentEmail?: string;
    status?: string;
  };
  trigger?: React.ReactNode;
}

export default function EditStudentDialog({ student, trigger }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startUpdateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    startUpdateTransition(async () => {
      const result = await updateStudent(student.id, formData);
      if (result.success) {
        toast.success("プロフィールを更新しました");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleArchive = () => {
    startDeleteTransition(async () => {
      const result = await archiveStudent(student.id);
      if (result.success) {
        toast.success(`${student.name} さんを卒業生としてアーカイブしました`);
        setConfirmOpen(false);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("アーカイブに失敗しました: " + result.error);
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteStudent(student.id);
      if (result.success) {
        toast.success("生徒を完全に削除しました");
        setConfirmOpen(false);
        setOpen(false);
        router.push("/");
      } else {
        toast.error("生徒の削除に失敗しました: " + result.error);
      }
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            trigger
          ) : (
            <Button variant="outline" className="flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-4 py-2 rounded-lg text-sm shadow-sm h-10">
              <Edit2 className="h-4 w-4" />
              プロフィールを編集
            </Button>
          ) as any
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">生徒プロフィールの編集</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            生徒の基本情報や指導状況を更新します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-700 font-semibold text-sm">氏名</Label>
              <Input id="name" name="name" defaultValue={student.name} required className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="highSchool" className="text-slate-700 font-semibold text-sm">出身高校</Label>
              <Input id="highSchool" name="highSchool" defaultValue={student.highSchool || ""} placeholder="例: 港区立青葉高校" className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade" className="text-slate-700 font-semibold text-sm">学年</Label>
              <Select defaultValue={student.grade || "高3"} name="grade">
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="学年を選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="高3">高3</SelectItem>
                  <SelectItem value="高2">高2</SelectItem>
                  <SelectItem value="高1">高1</SelectItem>
                  <SelectItem value="既卒">既卒</SelectItem>
                  <SelectItem value="その他">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-slate-700 font-semibold text-sm">電話番号</Label>
              <Input id="phone" name="phone" defaultValue={student.phone || ""} placeholder="例: 090-0000-0000" className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentEmail" className="text-slate-700 font-semibold text-sm">保護者のメールアドレス</Label>
              <Input id="parentEmail" name="parentEmail" type="email" defaultValue={student.parentEmail || ""} placeholder="例: parent@example.com" className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentEmail" className="text-slate-700 font-semibold text-sm">生徒の招待用メールアドレス (生徒ポータル用)</Label>
              <Input id="studentEmail" name="studentEmail" type="email" defaultValue={student.studentEmail || ""} placeholder="例: student@example.com" className="border-slate-200" />
              <p className="text-xs text-slate-500">※生徒がこのアドレスでサインアップすると、このアカウントに自動的に紐付きます。</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase" className="text-slate-700 font-semibold text-sm">現在のフェーズ</Label>
              <Input 
                id="phase" 
                name="phase" 
                defaultValue={student.phase || "自己分析"} 
                placeholder="フェーズを入力..." 
                list="phase-options"
                className="border-slate-200" 
              />
              <datalist id="phase-options">
                <option value="自己分析" />
                <option value="書類作成" />
                <option value="面接対策" />
                <option value="直前期" />
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status" className="text-slate-700 font-semibold text-sm">在籍ステータス</Label>
              <Select defaultValue={student.status || "ACTIVE"} name="status">
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ACTIVE">在籍生</SelectItem>
                  <SelectItem value="ARCHIVED">卒業生</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              disabled={isPending || isDeleting}
              className="text-slate-500 hover:text-red-700 hover:bg-red-50 font-bold flex items-center gap-1.5 p-2 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
              退会・削除
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending || isDeleting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存する"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={`${student.name} さんの退会処理`}
      description={
        <>
          <span className="block mb-2">
            まずは<strong>アーカイブ（卒業生として保管）</strong>をおすすめします。データを残したまま在籍一覧から外せます。
          </span>
          <span className="block text-red-600">
            「完全に削除」を選ぶと、この生徒の<strong>志望校・タスク・書類・練習記録・活動ログがすべて消去</strong>され、元に戻せません。
          </span>
        </>
      }
      primaryAction={{ label: "アーカイブする", onClick: handleArchive }}
      confirmLabel="完全に削除"
      destructive
      loading={isDeleting}
      onConfirm={handleDelete}
    />
    </>
  );
}
