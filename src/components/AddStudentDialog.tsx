"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddStudentDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    
    // Server Actions（ダミー）を呼ぶ想定
    setTimeout(() => {
      setIsPending(false);
      setOpen(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 flex items-center gap-2 shadow-sm font-bold h-12">
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
              <Input id="name" placeholder="例: 山田 太郎" required className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="university" className="text-slate-700 font-semibold text-sm">第一志望校</Label>
              <Input id="university" placeholder="例: 慶應義塾大学 総合政策学部" required className="border-slate-200" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase" className="text-slate-700 font-semibold text-sm">現在のフェーズ</Label>
              <Select defaultValue="自己分析">
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="フェーズを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="自己分析">自己分析</SelectItem>
                  <SelectItem value="書類作成">書類作成</SelectItem>
                  <SelectItem value="面接対策">面接対策</SelectItem>
                  <SelectItem value="直前期">直前期</SelectItem>
                </SelectContent>
              </Select>
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
