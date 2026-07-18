"use client";
import { toast } from "@/lib/toast";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenTool, Plus, Loader2, Sparkles, AlertCircle, BookOpen, Wand2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { evaluatePracticeInstant, evaluateWithRubric, generatePracticeQuestion } from "@/lib/actions/ai";
import { RUBRICS, type PracticeKind } from "@/lib/rubrics";
import { getInterviewMainQuestion, getInterviewResponseMetrics, inferCharLimit } from "@/lib/practice-evaluation";
import { isStructuredPracticeFeedback } from "@/lib/practice-feedback";
import { stripModelAnswerMetadata } from "@/lib/grading-context";
import { getFieldCategory } from "@/lib/field-category";
import PracticeFeedbackView from "@/components/PracticeFeedbackView";

const KIND_OPTIONS: PracticeKind[] = ["小論文", "志望理由書", "面接"];

interface QuestionDetail {
  prompt: string;
  modelAnswer: string | null;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-indigo-600";
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
  const [questionDetails, setQuestionDetails] = useState<Record<string, QuestionDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("");
  // 添削完了後、ダイアログを閉じずにその場で結果を表示する（スクロール位置を動かさない）
  const [dialogResult, setDialogResult] = useState<{ score: number; feedback: any } | null>(null);
  // メンターがカスタム設問を問題バンクへ保存するオプション
  const [saveToBank, setSaveToBank] = useState(false);
  const [bankTitle, setBankTitle] = useState("");

  // 問題生成フォーム（メンター用）
  const [genKind, setGenKind] = useState<PracticeKind>("小論文");
  const [genUniversity, setGenUniversity] = useState("");
  const [genTheme, setGenTheme] = useState("");

  const router = useRouter();
  // router.refresh()でサーバーから渡し直される最新値をそのまま使う（stateに固定しない）
  const records = initialRecords || [];

  const rubric = RUBRICS[kind];
  const interviewMetrics = kind === "面接" ? getInterviewResponseMetrics(answer) : null;
  const selectedQuestion = questionBank.find((q) => q.id === selectedQuestionId);
  const selectedQuestionDetail = selectedQuestionId ? questionDetails[selectedQuestionId] : undefined;

  // 選択中の演習種類に存在する系統ラベル（university欄を正規化した大くくり）の一覧
  const fieldOptions = useMemo(() => {
    const values = questionBank
      .filter((q) => q.category === kind)
      .map((q) => getFieldCategory(q.university))
      .filter((category): category is string => Boolean(category));
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ja"));
  }, [questionBank, kind]);

  // 選択中の演習種類（+系統フィルタ）に一致する問題を、系統→五十音順で表示する
  const bankQuestionsForKind = useMemo(() => {
    return questionBank
      .filter((q) => q.category === kind)
      .filter((q) => !fieldFilter || getFieldCategory(q.university) === fieldFilter)
      .sort((a, b) => {
        const fieldA = getFieldCategory(a.university) ?? "";
        const fieldB = getFieldCategory(b.university) ?? "";
        return fieldA.localeCompare(fieldB, "ja") || String(a.title).localeCompare(String(b.title), "ja");
      });
  }, [questionBank, kind, fieldFilter]);

  const applyQuestionDetail = (questionKind: PracticeKind, question: any, detail: QuestionDetail) => {
    setPromptText(questionKind === "面接" ? getInterviewMainQuestion(detail.prompt) : detail.prompt);
    if (question?.university) setUniversityName(question.university);
    if (questionKind !== "面接") {
      const inferredLimit = inferCharLimit(detail.prompt);
      setCharLimit(inferredLimit ? String(inferredLimit) : "");
    }
  };

  const handleBankSelect = async (questionId: string) => {
    setSelectedQuestionId(questionId);
    setError(null);
    if (!questionId) {
      setPromptText("");
      return;
    }
    const q = questionBank.find((entry) => entry.id === questionId);
    const k = q && KIND_OPTIONS.includes(q.category) ? (q.category as PracticeKind) : kind;
    setKind(k);

    const cached = questionDetails[questionId];
    if (cached) {
      applyQuestionDetail(k, q, cached);
      return;
    }
    setPromptText("");
    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/question-bank/${encodeURIComponent(questionId)}`);
      if (!response.ok) throw new Error("設問の取得に失敗しました");
      const detail = (await response.json()) as QuestionDetail;
      setQuestionDetails((current) => ({ ...current, [questionId]: detail }));
      applyQuestionDetail(k, q, detail);
    } catch {
      setError("設問の取得に失敗しました。もう一度選択してください");
      setSelectedQuestionId("");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleKindChange = (nextKind: PracticeKind) => {
    setKind(nextKind);
    setFieldFilter("");
    // 種類を切り替えたら、不一致になった選択中の問題はリセットする
    if (selectedQuestion && selectedQuestion.category !== nextKind) {
      setSelectedQuestionId("");
      setPromptText("");
    }
  };

  const resetPracticeForm = () => {
    setPromptText("");
    setAnswer("");
    setSelectedQuestionId("");
    setDialogResult(null);
    setError(null);
    setSaveToBank(false);
    setBankTitle("");
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetPracticeForm();
  };

  // 教材ライブラリ等から ?practiceQuestion=<id> で遷移した場合、その問題を選択した状態で開く。
  // 教材側で書いた下書きがあれば解答欄へ引き継ぐ。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionId = params.get("practiceQuestion");
    if (questionId && questionBank.some((q) => q.id === questionId)) {
      setOpen(true);
      setInputMode("bank");
      void handleBankSelect(questionId);
      try {
        const stored = sessionStorage.getItem("practice-draft");
        if (stored) {
          const parsed = JSON.parse(stored) as { questionId?: string; draft?: string };
          if (parsed.questionId === questionId && parsed.draft?.trim()) {
            setAnswer(parsed.draft);
          }
          sessionStorage.removeItem("practice-draft");
        }
      } catch {
        // 下書きの引き継ぎに失敗しても演習自体は続行できる
      }
      params.delete("practiceQuestion");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !answer.trim()) return;

    setError(null);
    startTransition(async () => {
      const commonOptions = {
        universityName: universityName.trim() || undefined,
        charLimit: kind !== "面接" && charLimit ? parseInt(charLimit, 10) || undefined : undefined,
        questionId: inputMode === "bank" && selectedQuestionId ? selectedQuestionId : undefined
      };
      // メンターのテスト実行は生徒の演習記録に残さない（インスタント添削）
      const result = isMentorView
        ? await evaluatePracticeInstant({
            type: kind,
            promptText,
            answer,
            ...commonOptions,
            saveQuestionToBank: inputMode === "custom" && saveToBank,
            questionTitle: bankTitle.trim() || undefined
          })
        : await evaluateWithRubric(studentId, kind, promptText, answer, commonOptions);
      if (result.success && (result as any).feedback) {
        toast.success(isMentorView ? "テスト添削が完了しました（記録には残りません）" : "AI添削が完了しました");
        if ((result as any).savedQuestionId) {
          toast.success("設問を問題バンクに追加しました");
        }
        if ((result as any).bankSaveError) {
          toast.error((result as any).bankSaveError);
        }
        // ダイアログは閉じず、その場で結果を表示する。記録一覧は裏で最新化する
        setDialogResult({ score: (result as any).score, feedback: (result as any).feedback });
        if (!isMentorView || (result as any).savedQuestionId) {
          router.refresh();
        }
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
        router.refresh();
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
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[720px] bg-white h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {dialogResult ? "AI添削の結果" : "AI添削の実行"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              {dialogResult
                ? isMentorView
                  ? "テスト実行のため、この結果は生徒の演習記録には保存されていません。"
                  : "この結果は演習記録にも保存されています。"
                : isMentorView
                  ? "テスト実行です。結果は生徒の演習記録に残りません。"
                  : "設問と解答を入力すると、PIVOT&QUESTルーブリックに基づいてAIが添削します。"}
            </DialogDescription>
          </DialogHeader>

          {dialogResult ? (
            <div className="mt-2">
              <div className="mb-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
                <span className="text-sm font-bold text-slate-600">総合評価（100点満点）</span>
                <span className={`text-3xl font-black ${scoreColor(dialogResult.score ?? 0)}`}>
                  {dialogResult.score}
                  <span className="ml-1 text-sm font-bold text-slate-400">/ 100</span>
                </span>
              </div>
              <PracticeFeedbackView feedback={dialogResult.feedback} />
              <DialogFooter className="mt-6 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetPracticeForm}
                  className="border-slate-200 text-slate-600 font-semibold"
                >
                  続けて演習する
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDialogOpenChange(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[130px]"
                >
                  閉じる
                </Button>
              </DialogFooter>
            </div>
          ) : (
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
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="grid gap-2">
                      <Label className="text-slate-700 font-semibold text-sm">
                        演習問題を選択
                        <span className="ml-2 font-medium text-slate-400">（「{kind}」{bankQuestionsForKind.length}問）</span>
                      </Label>
                      <select
                        value={selectedQuestionId}
                        onChange={(e) => handleBankSelect(e.target.value)}
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">練習したいテーマを選んでください</option>
                        {bankQuestionsForKind.map((q: any) => {
                          const fieldCategory = getFieldCategory(q.university);
                          return (
                            <option key={q.id} value={q.id}>
                              {fieldCategory ? `【${fieldCategory}】` : ""}{q.title}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-slate-700 font-semibold text-sm">系統で絞り込み</Label>
                      <select
                        value={fieldFilter}
                        onChange={(e) => setFieldFilter(e.target.value)}
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">すべての系統</option>
                        {fieldOptions.map((field) => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {bankQuestionsForKind.length === 0 && (
                    <p className="text-xs text-slate-400">
                      「{kind}」の問題がまだありません。演習の種類を変えるか、「自分で設問を入力する」をご利用ください。
                    </p>
                  )}
                  {selectedQuestionId && isDetailLoading && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      設問を読み込んでいます...
                    </div>
                  )}
                  {selectedQuestion && selectedQuestionDetail && (
                    <details open className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 bg-slate-50 px-4 py-3">
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="rounded-sm bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-700">
                              {selectedQuestion.category}
                            </span>
                            {selectedQuestion.university && (
                              <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                {selectedQuestion.university}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-sm font-black text-slate-800">{selectedQuestion.title}</span>
                        </span>
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-3 p-4">
                        <div>
                          <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            {kind === "面接" ? "主質問" : "設問"}
                          </p>
                          <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm font-medium leading-7 text-slate-700">
                            {kind === "面接" ? getInterviewMainQuestion(selectedQuestionDetail.prompt) : selectedQuestionDetail.prompt}
                          </p>
                        </div>
                        <details className="group/answer rounded-md border border-blue-100 bg-blue-50/40">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-black text-blue-900">
                            回答例・採点ポイント
                            <ChevronDown className="h-4 w-4 shrink-0 text-blue-400 transition-transform group-open/answer:rotate-180" />
                          </summary>
                          <div className="border-t border-blue-100 px-3 py-3">
                            {selectedQuestionDetail.modelAnswer ? (
                              <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                                {stripModelAnswerMetadata(selectedQuestionDetail.modelAnswer)}
                              </p>
                            ) : (
                              <p className="text-sm font-medium text-slate-500">回答例はまだ準備中です。</p>
                            )}
                          </div>
                        </details>
                      </div>
                    </details>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-slate-700 font-semibold text-sm">演習の種類</Label>
                  <select
                    value={kind}
                    onChange={(e) => handleKindChange(e.target.value as PracticeKind)}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
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
                  「{kind}」の評価軸（各軸0〜100点で採点）
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
                    <p className="text-blue-700/70">※一問一答で練習します。主質問にだけ答え、深掘りは回答後に次の1問として行います。質問内容に関係する軸だけを採点します。</p>
                  )}
                </div>
              </div>

              {!(inputMode === "bank" && selectedQuestionId) && (
                <div className="grid gap-2">
                  <Label htmlFor="promptText" className="text-slate-700 font-semibold text-sm">
                    {kind === "面接" ? "面接の主質問（1問）" : "設問（テーマ）"}
                  </Label>
                  <Textarea
                    id="promptText"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={
                      kind === "面接"
                        ? "例：本学を志望した理由を教えてください。"
                        : "例：AI技術の進化が社会に与える影響について、あなたの考えを述べなさい。（800字）"
                    }
                    required
                    className="border-slate-200 min-h-[100px]"
                  />
                  {isMentorView && inputMode === "custom" && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={saveToBank}
                          onChange={(e) => setSaveToBank(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        この設問を問題バンクにも追加する（テナント内で共有）
                      </label>
                      {saveToBank && (
                        <Input
                          value={bankTitle}
                          onChange={(e) => setBankTitle(e.target.value)}
                          placeholder="問題タイトル（未入力なら設問の冒頭から自動生成）"
                          maxLength={60}
                          className="mt-2 h-10 border-indigo-200 bg-white"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="answer" className="text-slate-700 font-semibold text-sm">
                  {kind === "面接" ? "この質問への回答" : "あなたの解答"}
                </Label>
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    kind === "面接"
                      ? "私は〜"
                      : "解答を入力してください..."
                  }
                  required
                  className="border-slate-200 min-h-[240px]"
                />
                <div className="text-right text-xs text-slate-400">
                  {kind === "面接" && interviewMetrics
                    ? `推定発話時間: 合計約${interviewMetrics.totalSeconds}秒 / ${interviewMetrics.responseCount}回答・平均約${interviewMetrics.averageSeconds}秒（参考）`
                    : `現在の文字数: ${Array.from(answer).length}字`}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending || isDetailLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[130px]">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    添削中...
                  </>
                ) : "AI添削を実行"}
              </Button>
            </DialogFooter>
          </form>
          )}
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
          records.map((record, recordIndex) => {
            const feedback = parseFeedback(record.feedback);
            const isV2 = isStructuredPracticeFeedback(feedback);
            return (
              <Card key={record.id} className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
                <details open={recordIndex === 0} className="group/record">
                  <summary className="cursor-pointer list-none p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 transition-colors hover:bg-slate-100/60">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 font-bold rounded-sm">{record.type}</span>
                      {isV2 && feedback.universityName && (
                        <span className="text-xs py-0.5 px-2 bg-slate-100 text-slate-600 font-bold rounded-sm">{feedback.universityName}</span>
                      )}
                      {isV2 && feedback.essayProfile?.label && (
                        <span className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 font-bold rounded-sm">
                          {feedback.essayProfile.label}
                        </span>
                      )}
                      {isV2 && feedback.universityProfile?.label && (
                        <span className="text-xs py-0.5 px-2 bg-violet-100 text-violet-700 font-bold rounded-sm">
                          {feedback.universityProfile.label}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(record.createdAt).toLocaleDateString("ja-JP", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo"
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{record.prompt}</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-semibold mb-1">総合評価（100点満点）</div>
                      <div className={`text-2xl font-black ${scoreColor(record.score ?? 0)}`}>
                        {record.score}
                        <span className="text-sm font-bold text-slate-400 ml-1">/ 100</span>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open/record:rotate-180" />
                  </div>
                  </summary>

                <details className="mx-5 mt-4 rounded-lg border border-slate-200 bg-slate-50/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold text-slate-700">
                    設問と自分の解答（{Array.from(String(record.answer ?? "")).length}字）
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </summary>
                  <div className="space-y-3 border-t border-slate-200 p-4">
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">設問</p>
                      <p className="whitespace-pre-wrap rounded-md bg-white p-3 text-sm font-medium leading-7 text-slate-700">{record.prompt}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">自分の解答</p>
                      <p className="whitespace-pre-wrap rounded-md bg-white p-3 text-sm font-medium leading-7 text-slate-700">{record.answer}</p>
                    </div>
                  </div>
                </details>

                {isV2 ? (
                  <div className="p-5">
                    <PracticeFeedbackView feedback={feedback} />
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
                </details>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
