"use client";
import { toast } from "@/lib/toast";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createStudent } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddStudentDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await createStudent(formData);
    
    setIsPending(false);
    if (result.success) {
      toast.success("生徒を追加しました");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className={cn("bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 flex items-center justify-center gap-2 shadow-sm font-bold h-12", className)}>
            <Plus className="h-5 w-5" />
            生徒を追加
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">新規生徒の登録</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            指導を開始する生徒の基本情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-700 font-semibold text-sm">氏名</Label>
              <Input id="name" name="name" placeholder="例: 山田 太郎" required className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="university" className="text-slate-700 font-semibold text-sm">第一志望校</Label>
              <Input id="university" name="university" placeholder="例: 慶應義塾大学 総合政策学部" required className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="highSchool" className="text-slate-700 font-semibold text-sm">出身高校 (任意)</Label>
              <Input id="highSchool" name="highSchool" placeholder="例: 港区立青葉高校" className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade" className="text-slate-700 font-semibold text-sm">学年 (任意)</Label>
              <Select defaultValue="高3" name="grade">
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
              <Label htmlFor="phone" className="text-slate-700 font-semibold text-sm">電話番号 (任意)</Label>
              <Input id="phone" name="phone" placeholder="例: 090-0000-0000" className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentEmail" className="text-slate-700 font-semibold text-sm">保護者のメールアドレス (任意)</Label>
              <Input id="parentEmail" name="parentEmail" type="email" placeholder="例: parent@example.com" className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentEmail" className="text-slate-700 font-semibold text-sm">生徒の招待用メールアドレス (生徒ポータル用・任意)</Label>
              <Input id="studentEmail" name="studentEmail" type="email" placeholder="例: student@example.com" className="border-slate-200" />
              <p className="text-xs text-slate-500">※生徒がこのアドレスでサインアップすると、自動的に紐付きます。</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase" className="text-slate-700 font-semibold text-sm">現在のフェーズ</Label>
              <Input 
                id="phase" 
                name="phase" 
                defaultValue="自己分析" 
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "登録する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
