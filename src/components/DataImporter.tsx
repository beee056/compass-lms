"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Loader2, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { runImport, type ImportKind } from "@/lib/actions/import";

interface KindConfig {
  kind: ImportKind;
  label: string;
  headers: string[];
  hint: string;
}

const KINDS: KindConfig[] = [
  {
    kind: "students",
    label: "① 生徒基本情報",
    headers: ["氏名", "高校", "学年", "電話", "保護者メール", "生徒メール"],
    hint: "最初にこれを取り込みます（氏名が必須）。"
  },
  {
    kind: "universities",
    label: "② 志望校・出願締切",
    headers: ["生徒氏名", "大学", "学部", "入試方式", "出願締切", "締切区分", "塾内提出日"],
    hint: "生徒氏名で紐付けます（先に①を取込）。日付は 2026/9/7 形式。"
  },
  {
    kind: "documents",
    label: "③ 書類（記入情報）",
    headers: ["生徒氏名", "書類種類", "志望校", "提出期限", "設問", "本文"],
    hint: "アプリ内書類として作成（本文は後から編集可）。志望校は②で登録済みの名称と一致で紐付け。"
  }
];

type ImportResult = {
  success: boolean;
  kind?: string;
  total?: number;
  valid?: number;
  created?: number;
  errors?: string[];
  error?: string;
};

function ImportCard({ config, targetTenantId }: { config: KindConfig; targetTenantId?: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<"preview" | "commit" | null>(null);

  const run = (dryRun: boolean) => {
    if (!text.trim()) { toast.error("データを貼り付けるか、CSVを読み込んでください"); return; }
    setMode(dryRun ? "preview" : "commit");
    startTransition(async () => {
      const res = (await runImport(config.kind, text, dryRun, targetTenantId)) as ImportResult;
      setResult(res);
      if (!res.success) toast.error(res.error ?? "取込に失敗しました");
      else if (!dryRun) { toast.success(`${res.created} 件を取り込みました`); router.refresh(); }
      setMode(null);
    });
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setText(await file.text());
  };

  const downloadTemplate = () => {
    const csv = config.headers.join(",") + "\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.kind}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800">
          <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
          {config.label}
        </h3>
        <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" />
          テンプレDL
        </button>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-500">{config.hint}</p>
      <p className="mt-2 rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500 overflow-x-auto whitespace-nowrap">
        {config.headers.join(" , ")}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Googleスプレッドシートから範囲をコピーして貼り付け（1行目はヘッダ）／または下からCSVを読み込み"
        className="mt-3 h-32 w-full rounded-md border border-slate-200 p-2 text-xs font-mono"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" />
          CSVを読み込み
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={() => run(true)} disabled={isPending} className="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">
          {isPending && mode === "preview" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "プレビュー（検証のみ）"}
        </button>
        <button onClick={() => run(false)} disabled={isPending} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
          {isPending && mode === "commit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "取込を実行"}
        </button>
      </div>

      {result && result.success && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="font-bold text-slate-700">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
            {result.created ? `取込 ${result.created} 件` : `プレビュー: 取込可能 ${result.valid} / ${result.total} 行`}
          </p>
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[11px] font-semibold text-amber-700">
              {result.errors.slice(0, 50).map((e, i) => (
                <li key={i} className="flex items-start gap-1">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {e}
                </li>
              ))}
              {result.errors.length > 50 && <li>…ほか {result.errors.length - 50} 件</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataImporter({ targetTenantId }: { targetTenantId?: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 text-sm font-medium leading-6 text-slate-600">
        旧スプレッドシートからの引っ越し用。<strong className="text-slate-800">①生徒 →②志望校 →③書類 の順</strong>に取り込んでください
        （②③は生徒氏名で紐付けます）。まず「プレビュー」で検証し、問題なければ「取込を実行」。※初回セットアップ用のため、重複チェックは行いません。
      </div>
      {KINDS.map((c) => (
        <ImportCard key={c.kind} config={c} targetTenantId={targetTenantId} />
      ))}
    </div>
  );
}
