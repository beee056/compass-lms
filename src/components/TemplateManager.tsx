"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Save, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTemplate } from "@/lib/actions";

interface TemplateItem {
  title: string;
  type: string;
  daysOffset: number;
}

export default function TemplateManager({ initialTemplates }: { initialTemplates: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([{ title: "", type: "TODO", daysOffset: 7 }]);
  const [isPending, startTransition] = useTransition();

  const handleAddItem = () => {
    setItems([...items, { title: "", type: "TODO", daysOffset: 7 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleChangeItem = (index: number, field: keyof TemplateItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("テンプレート名を入力してください");
      return;
    }
    if (items.some(i => !i.title.trim())) {
      toast.error("すべてのタスクにタイトルを入力してください");
      return;
    }

    startTransition(async () => {
      const result = await createTemplate(name, items);
      if (result.success) {
        toast.success("テンプレートを保存しました");
        setTemplates([result.template, ...templates]);
        setIsCreating(false);
        setName("");
        setItems([{ title: "", type: "TODO", daysOffset: 7 }]);
      } else {
        toast.error("保存に失敗しました: " + result.error);
      }
    });
  };

  return (
    <Card className="p-6 border-slate-200 shadow-sm bg-white mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">タスクテンプレート管理</h2>
          <p className="text-xs text-slate-500 mt-1">志望校追加時に自動設定されるタスクのひな型を作成できます。</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold">
            <Plus className="h-4 w-4 mr-1.5" />
            新規作成
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6">
          <div className="mb-4">
            <Label className="text-slate-700 font-bold">テンプレート名</Label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="例: 早慶 総合型選抜用" 
              className="mt-1 bg-white"
            />
          </div>

          <div className="space-y-3 mb-4">
            <Label className="text-slate-700 font-bold">タスク一覧 (志望校追加日からの相対日数)</Label>
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="grid grid-cols-12 gap-3 flex-1">
                  <div className="col-span-6">
                    <Input 
                      value={item.title} 
                      onChange={e => handleChangeItem(index, 'title', e.target.value)} 
                      placeholder="タスク名" 
                    />
                  </div>
                  <div className="col-span-3">
                    <Select value={item.type} onValueChange={v => handleChangeItem(index, 'type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">TODO</SelectItem>
                        <SelectItem value="DOCUMENT">書類作成</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={item.daysOffset} 
                      onChange={e => handleChangeItem(index, 'daysOffset', parseInt(e.target.value) || 0)} 
                      min={0}
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">日後</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-slate-400 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleAddItem} className="text-indigo-600 border-indigo-200 bg-white hover:bg-indigo-50">
              <Plus className="h-4 w-4 mr-1.5" />
              タスクを追加
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setIsCreating(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> 保存する</>}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-100 border-dashed">
            テンプレートはまだありません。
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:border-indigo-200 transition-colors">
              <h3 className="font-bold text-slate-800 text-lg mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                {t.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {t.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    {item.type === "DOCUMENT" ? <FileText className="h-3.5 w-3.5 text-indigo-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    <span className="truncate flex-1 font-medium">{item.title}</span>
                    <Badge variant="secondary" className="text-[10px] bg-white">{item.daysOffset}日後</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
