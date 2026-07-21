"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Calendar as CalendarIcon, Plus, Loader2 } from "lucide-react";
import { createMilestone } from "@/lib/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Milestone {
  id: string;
  title: string;
  date: Date;
  status: string;
  type: string;
}

interface MilestoneSectionProps {
  studentId: string;
  initialMilestones: Milestone[];
  isStudent?: boolean;
  universities?: { id: string; label: string }[];
}

export default function MilestoneSection({ studentId, initialMilestones, isStudent = false, universities = [] }: MilestoneSectionProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("書類提出");
  const [universityId, setUniversityId] = useState("common");

  const [sendEmail, setSendEmail] = useState(false);

  const handleTypeChange = (value: string | null) => {
    if (value) {
      setType(value);
    }
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    startTransition(async () => {
      const result = await createMilestone(studentId, title, date, type, sendEmail, universityId === "common" ? null : universityId);
      if (result.success) {
        toast.success("マイルストーンを追加しました");
        setTitle("");
        setDate("");
        setType("書類提出");
        setUniversityId("common");
        setSendEmail(false);
        setOpen(false);
      } else {
        toast.error("マイルストーンの追加に失敗しました: " + result.error);
      }
    });
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-indigo-500 flex-shrink-0" />
          スケジュール
        </h2>

        {/* マイルストーン追加ダイアログ (生徒には非表示) */}
        {!isStudent && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" className="flex items-center gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs h-9">
                  <Plus className="h-4 w-4" />
                  予定を追加
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">マイルストーンの追加</DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  出願日や面接試験など、重要な日程を登録します。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMilestone}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="milestoneTitle" className="text-slate-700 font-semibold text-sm">イベント名</Label>
                    <Input 
                      id="milestoneTitle" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="例: 出願書類締め切り、一次面接試験" 
                      required 
                      className="border-slate-200" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="milestoneDate" className="text-slate-700 font-semibold text-sm">日時</Label>
                    <Input 
                      id="milestoneDate" 
                      type="date"
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      required
                      className="border-slate-200" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="milestoneType" className="text-slate-700 font-semibold text-sm">種別</Label>
                    <Select value={type} onValueChange={handleTypeChange}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="種別を選択" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="書類提出">書類提出</SelectItem>
                        <SelectItem value="面接">面接対策</SelectItem>
                        <SelectItem value="出願期限">出願期限</SelectItem>
                        <SelectItem value="二次試験">二次試験</SelectItem>
                        <SelectItem value="その他">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {universities.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="text-slate-700 font-semibold text-sm">対象の志望校</Label>
                      <Select value={universityId} onValueChange={(value) => setUniversityId(value ?? "common")}>
                        <SelectTrigger className="border-slate-200">
                          <SelectValue placeholder="志望校を選択" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="common">共通（志望校の指定なし）</SelectItem>
                          {universities.map((university) => (
                            <SelectItem key={university.id} value={university.id}>{university.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="sendEmail" 
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <Label htmlFor="sendEmail" className="text-slate-700 text-sm font-medium">生徒へメールで通知する</Label>
                  </div>
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
        )}
      </div>

      <Card className="p-8 border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-gradient-to-b from-white to-slate-50/50">
        <div className="space-y-0 relative">
          {/* The central axis of the compass */}
          <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent"></div>
          
          {initialMilestones.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 pl-4">マイルストーンはまだありません。</div>
          ) : (
            initialMilestones.map((m, i) => {
              const isActive = m.status !== "DONE";
              return (
                <div key={m.id} className={`relative pl-8 pb-8 ${i === initialMilestones.length - 1 ? 'pb-2' : ''}`}>
                  {/* Compass node */}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${isActive ? 'bg-indigo-500 ring-4 ring-indigo-50' : 'bg-slate-300'}`}>
                    {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                  
                  <div className={`text-xs font-bold mb-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {new Date(m.date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                  </div>
                  <h4 className={`text-base font-bold tracking-tight ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{m.title}</h4>
                  <span className={`inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded border font-bold ${isActive ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{m.type}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </section>
  );
}
