"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { addUniversity } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddUniversityDialogProps {
  studentId: string;
  templates?: any[];
}

export default function AddUniversityDialog({ studentId, templates = [] }: AddUniversityDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !department.trim()) return;

    startTransition(async () => {
      const selectedTemplateId = templateId === "none" ? undefined : templateId;
      const result = await addUniversity(studentId, name, department, selectedTemplateId);
      if (result.success) {
        setName("");
        setDepartment("");
        setTemplateId("none");
        setOpen(false);
      } else {
        alert("志望校の追加に失敗しました: " + result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="flex items-center gap-1 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold px-2.5 py-1 rounded-md text-xs h-7">
            <Plus className="h-3 w-3" />
            志望校を追加
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">志望校の追加</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            受験を予定している大学・学部を登録します。テンプレートを選択すると、関連タスクが自動生成されます。
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
                placeholder="例: 政治経済学部" 
                required 
                className="border-slate-200" 
              />
            </div>

            {templates.length > 0 && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="template" className="text-slate-700 font-semibold text-sm">適用するタスクテンプレート</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="テンプレートを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">テンプレートを使用しない（デフォルトのタスク）</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "追加する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
