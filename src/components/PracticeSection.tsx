"use client";

import { useState, useTransition } from "react";
import { PenTool, Plus, Loader2, Sparkles, AlertCircle, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { evaluatePractice } from "@/lib/actions/ai";

export default function PracticeSection({ 
  studentId, 
  initialRecords, 
  isMentorView = false,
  questionBank = []
}: { 
  studentId: string, 
  initialRecords: any[], 
  isMentorView?: boolean,
  questionBank?: any[]
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [inputMode, setInputMode] = useState<"bank" | "custom">("bank");
  const [type, setType] = useState("小論文");
  const [promptText, setPromptText] = useState("");
  const [answer, setAnswer] = useState("");
  const [records, setRecords] = useState(initialRecords || []);
  const [error, setError] = useState<string | null>(null);

  const handleBankSelect = (questionId: string) => {
    const q = questionBank.find(q => q.id === questionId);
    if (q) {
      setType(q.category);
      setPromptText(q.prompt);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !answer.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await evaluatePractice(studentId, type, promptText, answer);
      if (result.success) {
        setOpen(false);
        setPromptText("");
        setAnswer("");
        window.location.reload();
      } else {
        setError(result.error);
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
          <PenTool className="h-6 w-6 text-blue-500" />
          AI添削・問題演習
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className={`flex items-center gap-2 px-4 py-2.5 ${isMentorView ? "bg-slate-600 hover:bg-slate-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg text-sm font-bold transition-colors shadow-sm`}>
              <Plus className="h-4 w-4" />
              {isMentorView ? "演習をテスト実行する" : "新しい演習を始める"}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-white h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              AI添削の実行
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              設問とあなたの解答を入力してください。AIが以下のルーブリックに基づき添削します。
            </DialogDescription>
          </DialogHeader>

          {/* AI添削ロジック（ルーブリック）の説明 */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mt-2">
            <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4" />
              AIの評価観点（各10点満点）
            </h4>
            <ul className="space-y-1.5 text-sm text-blue-800/80">
              <li><strong className="text-blue-900">1. 論理的思考力:</strong> 結論と根拠が矛盾せず、一貫した論理で展開されているか。</li>
              <li><strong className="text-blue-900">2. 独自性・問題意識:</strong> 一般論に終始せず、独自の視点や深い当事者意識があるか。</li>
              <li><strong className="text-blue-900">3. 表現・形式:</strong> 適切な語彙、誤字脱字の少なさ、指定文字数（8割以上）を満たしているか。</li>
            </ul>
          </div>
            <form onSubmit={handleSubmit} className="mt-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              <div className="grid gap-6 py-2">
                {/* モード切替 */}
                <div className="flex p-1 bg-slate-100 rounded-lg mb-2">
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

                {inputMode === "bank" && questionBank.length > 0 && (
                  <div className="grid gap-2">
                    <Label className="text-slate-700 font-semibold text-sm">演習問題を選択</Label>
                    <Select onValueChange={handleBankSelect}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="練習したいテーマを選んでください" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {questionBank.map((q: any) => (
                          <SelectItem key={q.id} value={q.id}>
                            <span className="font-bold mr-2 text-blue-600">[{q.category}]</span> {q.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {inputMode === "custom" && (
                  <div className="grid gap-2 border-b border-slate-100 pb-4">
                    <Label htmlFor="type" className="text-slate-700 font-semibold text-sm">演習の種類</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="種類を選択" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="小論文">小論文</SelectItem>
                        <SelectItem value="志望理由書">志望理由書</SelectItem>
                        <SelectItem value="自己PR">自己PR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="promptText" className="text-slate-700 font-semibold text-sm">設問（テーマ）</Label>
                  <Textarea 
                    id="promptText" 
                    value={promptText} 
                    onChange={(e) => setPromptText(e.target.value)} 
                    placeholder="例：AI技術の進化が社会に与える影響について、あなたの考えを述べなさい。（800字）" 
                    required 
                    readOnly={inputMode === "bank"}
                    className={`border-slate-200 min-h-[100px] ${inputMode === "bank" ? "bg-slate-50" : ""}`} 
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="answer" className="text-slate-700 font-semibold text-sm">あなたの解答</Label>
                  <Textarea 
                    id="answer" 
                    value={answer} 
                    onChange={(e) => setAnswer(e.target.value)} 
                    placeholder="解答を入力してください..." 
                    required 
                    className="border-slate-200 min-h-[250px]" 
                  />
                  <div className="text-right text-xs text-slate-400">
                    現在の文字数: {answer.length} 字
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                  キャンセル
                </Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[120px]">
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
      </div>

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
            return (
              <Card key={record.id} className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 font-bold rounded-sm">
                        {record.type}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(record.createdAt).toLocaleDateString("ja-JP", { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{record.prompt}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-semibold mb-1">AI総合評価</div>
                    <div className="text-2xl font-black text-blue-600">
                      {record.score}<span className="text-sm font-bold text-slate-400 ml-1">/ 100</span>
                    </div>
                  </div>
                </div>

                {feedback && (
                  <div className="p-5">
                    <h4 className="font-bold text-slate-800 mb-2">総評</h4>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded-lg">
                      {feedback.overallFeedback}
                    </p>

                    <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">観点別評価</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold mb-1">論理的思考力</div>
                        <div className="text-lg font-bold text-indigo-600 mb-2">{feedback.scores.logicalThinking} 点</div>
                        <p className="text-xs text-slate-600">{feedback.comments.logicalThinking}</p>
                      </div>
                      <div className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold mb-1">独自性・問題意識</div>
                        <div className="text-lg font-bold text-emerald-600 mb-2">{feedback.scores.originality} 点</div>
                        <p className="text-xs text-slate-600">{feedback.comments.originality}</p>
                      </div>
                      <div className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold mb-1">表現・形式</div>
                        <div className="text-lg font-bold text-orange-600 mb-2">{feedback.scores.expression} 点</div>
                        <p className="text-xs text-slate-600">{feedback.comments.expression}</p>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 mb-2">次のステップ・改善点</h4>
                    <ul className="space-y-2 list-none">
                      {feedback.actionableAdvice.map((advice: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-sm text-slate-600">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          {advice}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
