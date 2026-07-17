"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { PenTool, Plus, Loader2, Sparkles, AlertCircle, BookOpen, Wand2, CheckCircle2, MinusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { evaluateWithRubric, generatePracticeQuestion } from "@/lib/actions/ai";
import { RUBRICS, type PracticeKind } from "@/lib/rubrics";
import { isStructuredPracticeFeedback } from "@/lib/practice-feedback";

const KIND_OPTIONS: PracticeKind[] = ["小論文", "志望理由書", "面接"];

// レベル別の配色
const LEVEL_STYLE: Record<number, string> = {
  4: "bg-emerald-50 text-emerald-700 border-emerald-200",
  3: "bg-indigo-50 text-indigo-700 border-indigo-200",
  2: "bg-amber-50 text-amber-700 border-amber-200",
  1: "bg-red-50 text-red-700 border-red-200"
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-indigo-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export default function PracticeSection({
  studentId,
  initialRecords,
  isMentorView = false,
  questionBank = []
}: {
  studentId: string;
  initialRecords: any[];
  isMentorView?: boolean;
  questionBank?: any[];
}) {
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerating] = useTransition();

  // 演習フォーム
  const [inputMode, setInputMode] = useState<"bank" | "custom">(questionBank.length > 0 ? "bank" : "custom");
  const [kind, setKind] = useState<PracticeKind>("小論文");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [universityName, setUniversityName] = useState("");
  const [charLimit, setCharLimit] = useState("");
  const [promptText, setPromptText] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 問題生成フォーム（メンター用）
  const [genKind, setGenKind] = useState<PracticeKind>("小論文");
  const [genUniversity, setGenUniversity] = useState("");
  const [genTheme, setGenTheme] = useState("");

  const [records] = useState(initialRecords || []);

  const rubric = RUBRICS[kind];

  const handleBankSelect = (questionId: string) => {
    setSelectedQuestionId(questionId);
    const q = questionBank.find((q) => q.id === questionId);
    if (q) {
      const k = KIND_OPTIONS.includes(q.category) ? (q.category as PracticeKind) : "志望理由書";
      setKind(k);
      setPromptText(q.prompt);
      if (q.university) setUniversityName(q.university);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !answer.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await evaluateWithRubric(studentId, kind, promptText, answer, {
        universityName: universityName.trim() || undefined,
        charLimit: charLimit ? parseInt(charLimit, 10) || undefined : undefined,
        questionId: inputMode === "bank" && selectedQuestionId ? selectedQuestionId : undefined
      });
      if (result.success) {
        toast.success("AI添削が完了しました");
        setOpen(false);
        setPromptText("");
        setAnswer("");
        setSelectedQuestionId("");
        window.location.reload();
      } else {
        setError(result.error ?? "添削に失敗しました");
      }
    });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    startGenerating(async () => {
      const result = await generatePracticeQuestion({
        kind: genKind,
        universityName: genUniversity.trim() || undefined,
        theme: genTheme.trim() || undefined
      });
      if (result.success) {
        toast.success(`問題「${result.title}」を問題バンクに追加しました`);
        setGenOpen(false);
        setGenUniversity("");
        setGenTheme("");
        window.location.reload();
      } else {
        toast.error(result.error ?? "問題の生成に失敗しました");
      }
    });
  };

  const parseFeedback = (feedbackStr: string) => {
    try {
      return JSON.parse(feedbackStr);
    } catch (e) {
      return null;
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
          <PenTool className="h-6 w-6 text-blue-500" />
          AI添削・問題演習
        </h2>
        <div className="flex items-center gap-2">
          {isMentorView && (
            <button
              onClick={() => setGenOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <Wand2 className="h-4 w-4" />
              AIで問題を生成
            </button>
          )}
          <button
            onClick={() => setOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 ${isMentorView ? "bg-slate-600 hover:bg-slate-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg text-sm font-bold transition-colors shadow-sm`}
          >
            <Plus className="h-4 w-4" />
            {isMentorView ? "演習をテスト実行する" : "新しい演習を始める"}
          </button>
        </div>
      </div>

      {/* ===== 演習・添削ダイアログ ===== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px] bg-white h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              AI添削の実行
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              設問と解答を入力すると、PIVOT&QUESTルーブリック（レベル1〜4）に基づいてAIが添削します。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid gap-5 py-2">
              {/* モード切替 */}
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInputMode("bank")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${
                    inputMode === "bank" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  問題バンクから選ぶ
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("custom")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${
                    inputMode === "custom" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <PenTool className="h-4 w-4" />
                  自分で設問を入力する
                </button>
              </div>

              {inputMode === "bank" && (
                <div className="grid gap-2">
                  <Label className="text-slate-700 font-semibold text-sm">演習問題を選択</Label>
                  <select
                    value={selectedQuestionId}
                    onChange={(e) => handleBankSelect(e.target.value)}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">練習したいテーマを選んでください</option>
                    {questionBank.map((q: any) => (
                      <option key={q.id} value={q.id}>
                        [{q.category}]{q.source === "AI_GENERATED" ? "（AI生成）" : q.source === "NOTEBOOKLM" ? "（NotebookLM）" : ""} {q.title}
                      </option>
                    ))}
                  </select>
                  {questionBank.length === 0 && (
                    <p className="text-xs text-slate-400">問題バンクが空です。「自分で設問を入力する」をご利用ください。</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-slate-700 font-semibold text-sm">演習の種類</Label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as PracticeKind)}
                    disabled={inputMode === "bank" && !!selectedQuestionId}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-700 font-semibold text-sm">志望大学・学部（任意）</Label>
                  <Input
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    placeholder="例: 慶應義塾大学 総合政策学部"
                    className="border-slate-200 h-11"
                  />
                </div>
                {kind !== "面接" && (
                  <div className="grid gap-2">
                    <Label className="text-slate-700 font-semibold text-sm">規定字数（任意）</Label>
                    <Input
                      type="number"
                      value={charLimit}
                      onChange={(e) => setCharLimit(e.target.value)}
                      placeholder="例: 800"
                      className="border-slate-200 h-11"
                    />
                  </div>
                )}
              </div>

              {/* 選択中の種別のルーブリック説明 */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  「{kind}」の評価軸（各レベル1〜4 / 総合 = 共通60% + 固有40%）
                </h4>
                <div className="text-xs text-blue-800/80 space-y-1">
                  <p>
                    <strong className="text-blue-900">共通5軸:</strong>{" "}
                    {rubric.commonAxes.map((a) => a.label).join(" / ")}
                  </p>
                  <p>
                    <strong className="text-blue-900">固有軸:</strong>{" "}
                    {rubric.specificAxes.map((a) => a.label + (a.aiEvaluable ? "" : "（対面評価）")).join(" / ")}
                  </p>
                  {kind === "面接" && (
                    <p className="text-blue-700/70">※ノンバーバル・緊張制御はテキスト演習では評価対象外です（対面練習でメンターが評価）。</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="promptText" className="text-slate-700 font-semibold text-sm">
                  {kind === "面接" ? "面接の質問（複数可）" : "設問（テーマ）"}
                </Label>
                <Textarea
                  id="promptText"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={
                    kind === "面接"
                      ? "例：本学を志望した理由を教えてください。／高校時代に最も力を入れたことは？"
                      : "例：AI技術の進化が社会に与える影響について、あなたの考えを述べなさい。（800字）"
                  }
                  required
                  readOnly={inputMode === "bank" && !!selectedQuestionId}
                  className={`border-slate-200 min-h-[100px] ${inputMode === "bank" && selectedQuestionId ? "bg-slate-50" : ""}`}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="answer" className="text-slate-700 font-semibold text-sm">
                  {kind === "面接" ? "あなたの回答（Q: 質問 / A: 回答 の形式推奨）" : "あなたの解答"}
                </Label>
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    kind === "面接"
                      ? "Q: 本学を志望した理由を教えてください。\nA: 私は〜"
                      : "解答を入力してください..."
                  }
                  required
                  className="border-slate-200 min-h-[240px]"
                />
                <div className="text-right text-xs text-slate-400">現在の文字数: {Array.from(answer).length} 字</div>
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[130px]">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    添削中...
                  </>
                ) : "AI添削を実行"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== 問題生成ダイアログ（メンター専用） ===== */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-indigo-500" />
              AIで演習問題を生成
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              大学名を指定すると、その大学の出題傾向を踏まえた過去問形式のオリジナル問題を生成します（実際の過去問の複製ではありません）。生成した問題は問題バンクに追加され、模範解答の要点はAI採点時に自動で参照されます。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-slate-700 font-semibold text-sm">種類</Label>
              <select
                value={genKind}
                onChange={(e) => setGenKind(e.target.value as PracticeKind)}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700 font-semibold text-sm">大学・学部（任意 / 過去問傾向を反映）</Label>
              <Input
                value={genUniversity}
                onChange={(e) => setGenUniversity(e.target.value)}
                placeholder="例: 慶應義塾大学 総合政策学部"
                className="border-slate-200 h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700 font-semibold text-sm">テーマ・分野（任意）</Label>
              <Input
                value={genTheme}
                onChange={(e) => setGenTheme(e.target.value)}
                placeholder="例: 地域医療、生成AIと教育、環境政策"
                className="border-slate-200 h-11"
              />
            </div>
            <DialogFooter className="mt-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                キャンセル
              </Button>
              <Button type="submit" disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[130px]">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    生成中...
                  </>
                ) : "問題を生成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== 演習記録 ===== */}
      <div className="grid gap-4">
        {records.length === 0 ? (
          <Card className="p-8 text-center border-slate-200/60 shadow-sm bg-white/80 backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-slate-500 font-semibold">まだ演習の記録がありません。</p>
            <p className="text-slate-400 text-sm mt-1">「新しい演習を始める」から解答を入力して、AIの添削を受けてみましょう。</p>
          </Card>
        ) : (
          records.map((record) => {
            const feedback = parseFeedback(record.feedback);
            const isV2 = isStructuredPracticeFeedback(feedback);
            return (
              <Card key={record.id} className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 font-bold rounded-sm">{record.type}</span>
                      {isV2 && feedback.universityName && (
                        <span className="text-xs py-0.5 px-2 bg-slate-100 text-slate-600 font-bold rounded-sm">{feedback.universityName}</span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(record.createdAt).toLocaleDateString("ja-JP", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo"
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{record.prompt}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500 font-semibold mb-1">総合評価（共通60%+固有40%）</div>
                    <div className={`text-2xl font-black ${scoreColor(record.score ?? 0)}`}>
                      {record.score}
                      <span className="text-sm font-bold text-slate-400 ml-1">/ 100</span>
                    </div>
                  </div>
                </div>

                {isV2 ? (
                  <div className="p-5">
                    <h4 className="font-bold text-slate-800 mb-2">総評</h4>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
                      {feedback.overallFeedback}
                    </p>

                    <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">ルーブリック評価（レベル1〜4）</h4>
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
                              <span className={`shrink-0 text-[11px] font-black px-2 py-0.5 rounded border ${LEVEL_STYLE[axis.level]}`}>
                                Lv.{axis.level} {axis.levelLabel}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-400">
                                対面評価
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
                ) : feedback ? (
                  /* 旧形式（3観点スコア）の表示互換 */
                  <div className="p-5">
                    <h4 className="font-bold text-slate-800 mb-2">総評</h4>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded-lg">{feedback.overallFeedback}</p>
                    {feedback.scores && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                          <div className="text-xs text-slate-500 font-semibold mb-1">論理的思考力</div>
                          <div className="text-lg font-bold text-indigo-600 mb-2">{feedback.scores.logicalThinking} 点</div>
                          <p className="text-xs text-slate-600">{feedback.comments?.logicalThinking}</p>
                        </div>
                        <div className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                          <div className="text-xs text-slate-500 font-semibold mb-1">独自性・問題意識</div>
                          <div className="text-lg font-bold text-emerald-600 mb-2">{feedback.scores.originality} 点</div>
                          <p className="text-xs text-slate-600">{feedback.comments?.originality}</p>
                        </div>
                        <div className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                          <div className="text-xs text-slate-500 font-semibold mb-1">表現・形式</div>
                          <div className="text-lg font-bold text-orange-600 mb-2">{feedback.scores.expression} 点</div>
                          <p className="text-xs text-slate-600">{feedback.comments?.expression}</p>
                        </div>
                      </div>
                    )}
                    {feedback.actionableAdvice && (
                      <>
                        <h4 className="font-bold text-slate-800 mb-2">次のステップ・改善点</h4>
                        <ul className="space-y-2 list-none">
                          {feedback.actionableAdvice.map((advice: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-sm text-slate-600">
                              <span className="text-blue-500 font-bold mt-0.5">•</span>
                              {advice}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
