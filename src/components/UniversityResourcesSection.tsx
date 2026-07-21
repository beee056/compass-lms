"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { createUniversityResource, deleteUniversityResource } from "@/lib/actions/university-resources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UniversityResource {
  id: string;
  title: string;
  kind: string;
  url: string;
  admissionYear: string | null;
  lastVerifiedAt: string | null;
  notes: string | null;
}

interface ResourceUniversity {
  id: string;
  name: string;
  department: string;
  resources?: UniversityResource[];
}

const RESOURCE_KINDS = ["募集要項", "出願フォーム", "アドミッション・ポリシー", "学部ページ", "過去問", "その他"];

export default function UniversityResourcesSection({ universities, isMentorView }: { universities: ResourceUniversity[]; isMentorView: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [title, setTitle] = useState("募集要項");
  const [kind, setKind] = useState("募集要項");
  const [url, setUrl] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [lastVerifiedAt, setLastVerifiedAt] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setTitle("募集要項");
    setKind("募集要項");
    setUrl("");
    setAdmissionYear("");
    setLastVerifiedAt("");
    setNotes("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedUniversityId) return;
    startTransition(async () => {
      const result = await createUniversityResource({ universityId: selectedUniversityId, title, kind, url, admissionYear, lastVerifiedAt, notes });
      if (result.success) {
        toast.success("参考資料を登録しました");
        setSelectedUniversityId(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error ?? "資料の登録に失敗しました");
      }
    });
  }

  function handleDelete(resourceId: string) {
    if (!window.confirm("この参考資料を削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteUniversityResource(resourceId);
      if (result.success) {
        toast.success("参考資料を削除しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "資料の削除に失敗しました");
      }
    });
  }

  if (universities.length === 0) return null;

  return (
    <section>
      <h2 className="mb-6 flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-800">
        <BookOpen className="h-6 w-6 text-emerald-600" />
        募集要項・参考資料
      </h2>
      <div className="grid gap-3">
        {universities.map((university) => (
          <div key={university.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-800">{university.name} {university.department}</h3>
              {isMentorView && (
                <button onClick={() => setSelectedUniversityId(university.id)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <Plus className="h-3.5 w-3.5" />資料を追加
                </button>
              )}
            </div>
            {(university.resources ?? []).length === 0 ? (
              <p className="mt-3 text-sm font-medium text-slate-400">募集要項や公式ページはまだ登録されていません。</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {(university.resources ?? []).map((resource) => (
                  <div key={resource.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:underline">
                        <span className="truncate">{resource.title}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {resource.kind}{resource.admissionYear ? `・${resource.admissionYear}` : ""}
                        {resource.lastVerifiedAt ? `・確認 ${new Date(resource.lastVerifiedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}` : ""}
                      </p>
                      {resource.notes && <p className="mt-1 text-xs leading-5 text-slate-500">{resource.notes}</p>}
                    </div>
                    {isMentorView && <button onClick={() => handleDelete(resource.id)} disabled={isPending} aria-label={`${resource.title}を削除`} className="rounded-md p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={selectedUniversityId !== null} onOpenChange={(open) => !open && setSelectedUniversityId(null)}>
        <DialogContent className="bg-white sm:max-w-[520px]">
          <DialogHeader><DialogTitle>参考資料を追加</DialogTitle><DialogDescription>大学公式ページまたはDrive上の資料URLを登録します。</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2"><Label>資料名</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} required /></div>
            <div className="grid gap-2"><Label>種別</Label><select value={kind} onChange={(event) => setKind(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">{RESOURCE_KINDS.map((value) => <option key={value}>{value}</option>)}</select></div>
            <div className="grid gap-2"><Label>URL</Label><Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." required /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2"><Label>入試年度</Label><Input value={admissionYear} onChange={(event) => setAdmissionYear(event.target.value)} placeholder="2027年度" /></div>
              <div className="grid gap-2"><Label>最終確認日</Label><Input type="date" value={lastVerifiedAt} onChange={(event) => setLastVerifiedAt(event.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label>メモ</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="参照ページや注意点" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setSelectedUniversityId(null)}>キャンセル</Button><Button type="submit" disabled={isPending} className="bg-indigo-600 text-white hover:bg-indigo-700">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "登録する"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
