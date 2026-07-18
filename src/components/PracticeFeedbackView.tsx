"use client";

import { AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";

// レベル別の配色
const LEVEL_STYLE: Record<number, string> = {
  4: "bg-emerald-50 text-emerald-700 border-emerald-200",
  3: "bg-indigo-50 text-indigo-700 border-indigo-200",
  2: "bg-amber-50 text-amber-700 border-amber-200",
  1: "bg-red-50 text-red-700 border-red-200"
};

// v2以降の構造化フィードバックの表示。演習記録・添削ダイアログ・教材ライブラリで共用する。
export default function PracticeFeedbackView({ feedback }: { feedback: any }) {
  return (
    <div>
      <h4 className="font-bold text-slate-800 mb-2">総評</h4>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
        {feedback.overallFeedback}
      </p>

      <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">
        {feedback.version >= 4 ? "ルーブリック評価（各軸100点・レベル併記）" : "ルーブリック評価（レベル1〜4）"}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {feedback.axes.map((axis: any) => (
          <div key={axis.key} className={`border rounded-lg p-3.5 ${axis.level ? "border-slate-100 bg-white" : "border-dashed border-slate-200 bg-slate-50/50"}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-xs font-bold text-slate-700">
                {axis.label}
                <span className="ml-1.5 font-semibold text-slate-400">
                  {axis.group === "common" ? "共通" : "固有"}
                </span>
              </div>
              {axis.level ? (
                <div className="flex items-center gap-1.5">
                  {typeof axis.score === "number" && (
                    <span className="shrink-0 text-xs font-black text-slate-800">{axis.score}点</span>
                  )}
                  <span className={`shrink-0 text-[11px] font-black px-2 py-0.5 rounded border ${LEVEL_STYLE[axis.level]}`}>
                    Lv.{axis.level} {axis.levelLabel}
                  </span>
                </div>
              ) : (
                <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-400">
                  {axis.aiEvaluable === true ? "今回対象外" : "対面評価"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{axis.comment}</p>
          </div>
        ))}
      </div>

      {feedback.deductions && feedback.deductions.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <MinusCircle className="h-4 w-4 text-red-500" />
            減点事項
          </h4>
          <ul className="space-y-1.5">
            {feedback.deductions.map((d: any, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className={`shrink-0 text-[11px] font-black px-1.5 py-0.5 rounded self-start mt-0.5 ${d.severity === "大幅" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {d.severity}
                </span>
                <span><strong>{d.item}:</strong> {d.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.checklist && feedback.checklist.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold text-slate-800 mb-2">要点カバレッジ（志望理由書 43要点ガイド）</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {feedback.checklist.map((c: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600 border border-slate-100 rounded-md p-2.5">
                <span className={`shrink-0 font-black px-1.5 py-0.5 rounded text-[10px] ${
                  c.coverage === "十分" ? "bg-emerald-100 text-emerald-700" : c.coverage === "部分的" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}>
                  {c.coverage}
                </span>
                <span><strong className="text-slate-700">{c.category}</strong><br />{c.comment}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <h4 className="font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            強み・評価点
          </h4>
          <ul className="space-y-1.5">
            {feedback.strengths?.map((s: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            改善点・課題
          </h4>
          <ul className="space-y-1.5">
            {feedback.improvements?.map((s: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h4 className="font-bold text-slate-800 mb-2">次のアクション</h4>
      <ul className="space-y-2">
        {feedback.nextActions?.map((advice: string, idx: number) => (
          <li key={idx} className="flex gap-2 text-sm text-slate-600">
            <span className="text-blue-500 font-bold mt-0.5">{idx + 1}.</span>
            {advice}
          </li>
        ))}
      </ul>
    </div>
  );
}
