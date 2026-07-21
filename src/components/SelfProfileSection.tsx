"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Sparkles, Loader2, Pencil, Check, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveSelfProfile } from "@/lib/actions/self-profile";
import { SELF_PROFILE_SECTIONS, type SelfProfileInput, type SelfProfileField } from "@/lib/self-profile-fields";
import { DIAGNOSTIC_TOOLS } from "@/lib/diagnostic-tools";

export default function SelfProfileSection({
  studentId,
  profile
}: {
  studentId: string;
  profile: Partial<Record<SelfProfileField, string | null>> | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SelfProfileInput>(() => {
    const initial: SelfProfileInput = {};
    for (const section of SELF_PROFILE_SECTIONS) {
      for (const f of section.fields) initial[f.key] = profile?.[f.key] ?? "";
    }
    return initial;
  });

  const filledCount = SELF_PROFILE_SECTIONS.flatMap((s) => s.fields).filter(
    (f) => (profile?.[f.key] ?? "").toString().trim()
  ).length;
  const totalCount = SELF_PROFILE_SECTIONS.flatMap((s) => s.fields).length;

  function handleSave() {
    startTransition(async () => {
      const result = await saveSelfProfile(studentId, form);
      if (result.success) {
        toast.success("自己分析を保存しました");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "保存に失敗しました");
      }
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-800">
          <Sparkles className="h-6 w-6 text-amber-500" />
          自己分析・将来ビジョン
        </h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            <Pencil className="h-4 w-4" />
            編集する
          </button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)} className="border-slate-200 font-semibold text-slate-600">
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="min-w-[100px] bg-amber-500 font-bold text-white hover:bg-amber-600">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存する"}
            </Button>
          </div>
        )}
      </div>

      {/* 診断ツールへの導線（別サイトで実施 → 結果を下の記録欄に貼り付け） */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-black text-slate-500">
          自己分析に迷ったら、まず診断ツールで自分を知ろう（別サイトで開きます）
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DIAGNOSTIC_TOOLS.map((tool) => (
            <a
              key={tool.key}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/40"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-sm font-black text-slate-700 group-hover:text-amber-700">
                  {tool.title}
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="ml-1 shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{tool.durationNote}</span>
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{tool.description}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <Card className="border-amber-200/60 bg-amber-50/30 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          <Sparkles className="h-3.5 w-3.5" />
          ここに書いた原体験や将来像・診断結果は、志望理由書・面接のAI添削で「あなたの背景」として参考にされ、より具体的な助言につながります。
          <span className="ml-auto shrink-0 font-black">{filledCount}/{totalCount} 記入済み</span>
        </div>

        {editing ? (
          <div className="space-y-6">
            {SELF_PROFILE_SECTIONS.map((section) => (
              <div key={section.group}>
                <h3 className="mb-3 text-sm font-black text-amber-700">{section.group}</h3>
                <div className="grid gap-4">
                  {section.fields.map((f) => (
                    <div key={f.key} className="grid gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">{f.label}</label>
                      <Textarea
                        value={form[f.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="min-h-[70px] border-slate-200 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {SELF_PROFILE_SECTIONS.map((section) => (
              <div key={section.group}>
                <h3 className="mb-2 text-sm font-black text-amber-700">{section.group}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.fields.map((f) => {
                    const value = (profile?.[f.key] ?? "").toString().trim();
                    return (
                      <div key={f.key} className={`rounded-md border p-3 ${value ? "border-slate-100 bg-white" : "border-dashed border-slate-200 bg-slate-50/50"}`}>
                        <p className="flex items-center gap-1.5 text-xs font-black text-slate-500">
                          {value && <Check className="h-3 w-3 text-emerald-500" />}
                          {f.label}
                        </p>
                        {value ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{value}</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">未記入</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
