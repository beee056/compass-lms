"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FilePenLine,
  MessageSquareText,
  Search,
  SearchCheck,
  Sparkles,
  Trash2
} from "lucide-react";
import { RUBRICS, describeTotalScoreFormula, type PracticeKind } from "@/lib/rubrics";
import { getInterviewMainQuestion } from "@/lib/practice-evaluation";

const KIND_OPTIONS: PracticeKind[] = ["志望理由書", "小論文", "面接"];
const PAGE_SIZE = 12;

const KIND_META: Record<PracticeKind, { icon: typeof FilePenLine; color: string; surface: string; note: string }> = {
  志望理由書: {
    icon: FilePenLine,
    color: "text-[#3346a3]",
    surface: "bg-[#eef1ff] border-[#cbd4ff]",
    note: "経験、価値観、大学接続を一本の線にする"
  },
  小論文: {
    icon: SearchCheck,
    color: "text-[#137a5b]",
    surface: "bg-[#eaf7f1] border-[#bfe7d5]",
    note: "設問要求、主張、根拠、反論を点検する"
  },
  面接: {
    icon: MessageSquareText,
    color: "text-[#a36200]",
    surface: "bg-[#fff6df] border-[#f1d99b]",
    note: "一問一答で、端的さと具体性を鍛える"
  }
};

interface PracticeQuestion {
  id: string;
  category: string;
  title: string;
  source: string;
  university: string | null;
}

interface PracticeQuestionDetail {
  prompt: string;
  modelAnswer: string | null;
}

interface GuidedPracticeLibraryProps {
  questions: PracticeQuestion[];
  // 生徒の場合はAI添削ページ（/portal）へのリンク。メンター等では null で非表示。
  practiceHref?: string | null;
}

export default function GuidedPracticeLibrary({ questions, practiceHref = null }: GuidedPracticeLibraryProps) {
  const [activeKind, setActiveKind] = useState<PracticeKind>("志望理由書");
  const [query, setQuery] = useState("");
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answerOpen, setAnswerOpen] = useState<Record<string, boolean>>({});
  const [questionDetails, setQuestionDetails] = useState<Record<string, PracticeQuestionDetail>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  const counts = useMemo(() => {
    return KIND_OPTIONS.reduce<Record<PracticeKind, number>>((acc, kind) => {
      acc[kind] = questions.filter((question) => question.category === kind).length;
      return acc;
    }, { 志望理由書: 0, 小論文: 0, 面接: 0 });
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return questions.filter((question) => {
      if (question.category !== activeKind) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        question.title,
        question.university ?? "",
        question.source
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeKind, query, questions]);

  const visibleQuestions = filteredQuestions.slice(0, visibleCount);
  const rubric = RUBRICS[activeKind];
  const activeMeta = KIND_META[activeKind];
  const ActiveIcon = activeMeta.icon;

  function selectKind(kind: PracticeKind) {
    setActiveKind(kind);
    setOpenQuestionId(null);
    setVisibleCount(PAGE_SIZE);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setOpenQuestionId(null);
    setVisibleCount(PAGE_SIZE);
  }

  function updateDraft(questionId: string, value: string) {
    setDrafts((current) => ({ ...current, [questionId]: value }));
  }

  function clearDraft(questionId: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  function toggleAnswer(questionId: string) {
    setAnswerOpen((current) => ({ ...current, [questionId]: !current[questionId] }));
  }

  async function loadQuestionDetail(questionId: string) {
    if (questionDetails[questionId] || loadingDetails[questionId]) return;

    setLoadingDetails((current) => ({ ...current, [questionId]: true }));
    setDetailErrors((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });

    try {
      const response = await fetch(`/api/question-bank/${encodeURIComponent(questionId)}`);
      if (!response.ok) throw new Error("設問の取得に失敗しました");
      const detail = await response.json() as PracticeQuestionDetail;
      setQuestionDetails((current) => ({ ...current, [questionId]: detail }));
    } catch (error) {
      setDetailErrors((current) => ({
        ...current,
        [questionId]: error instanceof Error ? error.message : "設問の取得に失敗しました"
      }));
    } finally {
      setLoadingDetails((current) => ({ ...current, [questionId]: false }));
    }
  }

  function toggleQuestion(questionId: string) {
    const isOpen = openQuestionId === questionId;
    setOpenQuestionId(isOpen ? null : questionId);
    if (!isOpen) {
      void loadQuestionDetail(questionId);
    }
  }

  return (
    <section aria-labelledby="guided-practice-heading" className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-lg border border-[#d8dee4] bg-white shadow-sm">
        <div className="grid h-1.5 grid-cols-4" aria-hidden="true">
          <span className="bg-[#3346a3]" />
          <span className="bg-[#137a5b]" />
          <span className="bg-[#d89b16]" />
          <span className="bg-[#c94d43]" />
        </div>

        <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#3346a3]">Practice desk</p>
              <h2 id="guided-practice-heading" className="mt-1 text-2xl font-black tracking-tight text-[#17202a]">
                学習資料・ガイダンスで演習する
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                ここでの入力は保存されません。教材を確認しながら、設問ごとに下書きと回答例の照合だけを行えます。
              </p>
            </div>

            <div className="rounded-lg border border-[#e3e7e0] bg-[#fbfcf8] p-4">
              <h3 className="text-sm font-black text-[#17202a]">進め方</h3>
              <ol className="mt-3 space-y-3">
                {[
                  ["基準を知る", "評価軸を読み、答案で何を見せるか決める"],
                  ["自分で解く", "下書き欄に一度、自分の言葉で書き切る"],
                  ["回答例と照合", "不足した根拠、構成、具体例を補う"]
                ].map(([title, description], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#17202a] text-[11px] font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-black text-[#17202a]">{title}</p>
                      <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3" aria-label="演習カテゴリ">
              {KIND_OPTIONS.map((kind) => {
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                const isActive = activeKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => selectKind(kind)}
                    className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3346a3] ${
                      isActive ? `${meta.surface} shadow-sm` : "border-[#d8dee4] bg-white hover:bg-[#fbfcf8]"
                    }`}
                    aria-pressed={isActive}
                  >
                    <span className={`flex items-center gap-2 text-sm font-black ${isActive ? meta.color : "text-slate-700"}`}>
                      <Icon className="h-4 w-4" />
                      {kind}
                    </span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{counts[kind]}問</span>
                  </button>
                );
              })}
            </div>

            <div className={`rounded-lg border p-4 ${activeMeta.surface}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-black text-[#17202a]">
                    <ActiveIcon className={`h-5 w-5 ${activeMeta.color}`} />
                    {activeKind}のルーブリック
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-600">{activeMeta.note}</p>
                </div>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#17202a] ring-1 ring-black/5">
                  {describeTotalScoreFormula(activeKind).replace("総合 = ", "")}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[...rubric.commonAxes, ...rubric.specificAxes].map((axis) => (
                  <details key={axis.key} className="group rounded-md border border-white/70 bg-white/80 p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-[#17202a]">
                      <span>
                        {axis.label}
                        <span className="ml-2 text-[11px] font-bold text-slate-400">
                          {axis.aiEvaluable ? "AI評価" : "対面評価"}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-600">{axis.focus}</p>
                    <div className="mt-3 space-y-2">
                      {(["4", "3", "2", "1"] as const).map((level) => (
                        <div key={level} className="rounded-md bg-[#fbfcf8] p-2 text-xs leading-5 text-slate-600">
                          <span className="font-black text-[#17202a]">Lv.{level}</span> {axis.levels[level]}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="タイトル・大学名で検索"
                  aria-label="問題を検索"
                  className="h-11 w-full rounded-md border border-[#d8dee4] bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#3346a3] focus:ring-2 focus:ring-[#3346a3]/15"
                />
              </div>
              <p className="text-xs font-bold text-slate-500">
                {filteredQuestions.length}問中 {visibleQuestions.length}問を表示
              </p>
            </div>

            <div className="space-y-3">
              {visibleQuestions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d8dee4] bg-[#fbfcf8] p-8 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-600">該当する演習問題がありません。</p>
                </div>
              ) : (
                visibleQuestions.map((question) => {
                  const isOpen = openQuestionId === question.id;
                  const draft = drafts[question.id] ?? "";
                  const detail = questionDetails[question.id];
                  const isLoadingDetail = !!loadingDetails[question.id];
                  const detailError = detailErrors[question.id];
                  const displayPrompt = detail
                    ? activeKind === "面接" ? getInterviewMainQuestion(detail.prompt) : detail.prompt
                    : "";
                  return (
                    <article key={question.id} className="overflow-hidden rounded-lg border border-[#d8dee4] bg-white">
                      <button
                        type="button"
                        onClick={() => toggleQuestion(question.id)}
                        className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-[#fbfcf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3346a3]"
                        aria-expanded={isOpen}
                      >
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                              {question.source === "NOTEBOOKLM" ? "NotebookLM" : question.source === "AI_GENERATED" ? "AI生成" : "教材"}
                            </span>
                            {question.university && (
                              <span className="rounded-sm bg-[#eef1ff] px-2 py-0.5 text-[11px] font-black text-[#3346a3]">
                                {question.university}
                              </span>
                            )}
                          </span>
                          <span className="mt-2 block text-base font-black leading-6 text-[#17202a]">{question.title}</span>
                        </span>
                        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-[#edf0ec] p-4">
                          {isLoadingDetail ? (
                            <div className="rounded-md bg-[#fbfcf8] p-5 text-sm font-bold text-slate-500 ring-1 ring-[#e3e7e0]">
                              設問を読み込んでいます...
                            </div>
                          ) : detailError ? (
                            <div className="rounded-md border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">
                              {detailError}
                            </div>
                          ) : detail ? (
                            <div className="space-y-4">
                              <section>
                                <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">設問</h4>
                                <p className="mt-2 whitespace-pre-wrap rounded-md bg-[#fbfcf8] p-4 text-sm font-medium leading-7 text-slate-700 ring-1 ring-[#e3e7e0]">
                                  {displayPrompt}
                                </p>
                              </section>

                              <section>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <h4 className="text-sm font-black text-[#17202a]">下書き</h4>
                                  {draft && (
                                    <button
                                      type="button"
                                      onClick={() => clearDraft(question.id)}
                                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      消す
                                    </button>
                                  )}
                                </div>
                                <textarea
                                  value={draft}
                                  onChange={(event) => updateDraft(question.id, event.target.value)}
                                  placeholder={activeKind === "面接" ? "この1問への回答を、まず60〜90秒程度で話すつもりで書いてみる" : "ここに自分の解答を書いてから、回答例と照合する"}
                                  className="min-h-[190px] w-full resize-y rounded-md border border-[#d8dee4] bg-white p-3 text-sm font-medium leading-7 text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#3346a3] focus:ring-2 focus:ring-[#3346a3]/15"
                                />
                                <p className="mt-1 text-right text-xs font-bold text-slate-400">
                                  {activeKind === "面接" ? getInterviewDraftLabel(draft) : `${Array.from(draft).length}字`}
                                </p>
                              </section>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-md border border-[#e3e7e0] bg-[#fbfcf8] p-3">
                                  <h4 className="flex items-center gap-2 text-sm font-black text-[#17202a]">
                                    <CheckCircle2 className="h-4 w-4 text-[#137a5b]" />
                                    セルフチェック
                                  </h4>
                                  <ul className="mt-2 space-y-2 text-xs font-medium leading-5 text-slate-600">
                                    {getSelfChecks(activeKind).map((item) => (
                                      <li key={item} className="flex gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#137a5b]" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="rounded-md border border-[#d8dee4] bg-white self-start">
                                  <button
                                    type="button"
                                    onClick={() => toggleAnswer(question.id)}
                                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm font-black text-[#17202a] transition-colors hover:bg-[#fbfcf8]"
                                    aria-expanded={!!answerOpen[question.id]}
                                  >
                                    回答例・採点ポイント
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${answerOpen[question.id] ? "rotate-180" : ""}`} />
                                  </button>
                                  {answerOpen[question.id] && (
                                    <div className="border-t border-[#edf0ec] p-3">
                                      {detail.modelAnswer ? (
                                        <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">{detail.modelAnswer}</p>
                                      ) : (
                                        <p className="text-sm font-medium leading-6 text-slate-500">回答例はまだ準備中です。</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {practiceHref && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#cbd4ff] bg-[#eef1ff] p-3">
                                  <p className="text-xs font-bold leading-5 text-[#3346a3]">
                                    書き上がったら、この問題のままAI添削へ進めます（下書きも引き継がれます）。
                                  </p>
                                  <a
                                    href={`${practiceHref}?practiceQuestion=${encodeURIComponent(question.id)}`}
                                    onClick={() => {
                                      try {
                                        sessionStorage.setItem(
                                          "practice-draft",
                                          JSON.stringify({ questionId: question.id, draft })
                                        );
                                      } catch {
                                        // sessionStorageが使えない環境では下書きなしで遷移する
                                      }
                                    }}
                                    className="inline-flex items-center gap-2 rounded-md bg-[#3346a3] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-[#2a3a8c]"
                                  >
                                    <Sparkles className="h-4 w-4" />
                                    この問題でAI添削を受ける
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

            {visibleCount < filteredQuestions.length && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-md border border-[#d8dee4] bg-white px-4 py-2 text-sm font-black text-[#17202a] transition-colors hover:bg-[#fbfcf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3346a3]"
                >
                  さらに表示
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getSelfChecks(kind: PracticeKind): string[] {
  if (kind === "面接") {
    return [
      "主質問に直接答えているか",
      "30〜90秒で話せる情報量に収まっているか",
      "次に深掘りされても答えられる具体例があるか"
    ];
  }
  if (kind === "小論文") {
    return [
      "設問が求める作業にすべて答えているか",
      "主張、根拠、具体例、反論対応の役割が分かれているか",
      "根拠から言える範囲を超えて断定していないか"
    ];
  }
  return [
    "原体験、価値観、課題意識がつながっているか",
    "大学固有の学びや研究と接続できているか",
    "将来像まで一貫した理由になっているか"
  ];
}

function getInterviewDraftLabel(draft: string): string {
  const count = Array.from(draft).length;
  if (count === 0) return "推定0秒";
  const seconds = Math.max(5, Math.round((count / 250) * 60));
  if (seconds < 60) return `推定${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds === 0 ? `推定${minutes}分` : `推定${minutes}分${restSeconds}秒`;
}
