"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Sparkles, Send, Map, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AiFeedbackPanel from "./AiFeedbackPanel";
import { submitStepAnswer } from "@/app/actions/lesson";

export type LessonStep = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  hint?: string | null;
  placeholder?: string | null;
  goodExample?: string | null;
  goodReason?: string | null;
  badExample?: string | null;
  badReason?: string | null;
  order: number;
};

export type LessonData = {
  id: string;
  title: string;
  content: string;
  overview?: string | null;
  steps: LessonStep[];
};

export default function LessonWizard({ lesson, studentProfileId }: { lesson: LessonData, studentProfileId: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, { content: string; score: number }>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const currentStep = lesson.steps[currentStepIndex];
  const isLastStep = currentStepIndex === lesson.steps.length - 1;
  const currentAnswer = answers[currentStep?.id] || "";

  const handleNext = () => {
    if (currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleAiFeedbackRequest = async () => {
    if (!currentAnswer.trim()) return;
    
    setIsAiLoading(true);
    try {
      // 本来は studentProfileId を渡す必要があるが、
      // 簡単のためLessonWizardの親から渡されるプロパティか、あるいは
      // ServerAction側で auth() と連携して解決させるかが必要。
      // ここでは仮の studentProfileId（テスト用）または undefined を渡す設計にするか
      // LessonWizard に studentProfileId をpropsで持たせるように修正が必要。
      
      const res = await submitStepAnswer(
        currentStep.id, 
        studentProfileId, // ※後でPropsに追加
        currentAnswer, 
        currentStep.prompt
      );
      
      if (res.success && res.feedback) {
        setFeedbacks({
          ...feedbacks,
          [currentStep.id]: {
            content: res.feedback.content,
            score: res.feedback.score || 0
          }
        });
      }
    } catch (e) {
      console.error(e);
      setFeedbacks({
        ...feedbacks,
        [currentStep.id]: {
          content: "エラーが発生しました。時間を置いて再度お試しください。",
          score: 0
        }
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!lesson.steps || lesson.steps.length === 0) {
    return <Card className="p-8 text-center text-slate-500">このレッスンにはステップが設定されていません。</Card>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-120px)] bg-slate-50 rounded-xl overflow-hidden shadow-sm border border-slate-200/60">
      {/* Header / Clickable Stepper Navigation */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 overflow-x-auto">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap mr-6">
          <span className="text-indigo-600">{lesson.title}</span>
        </h2>
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          {lesson.steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all
                  ${idx === currentStepIndex 
                    ? "bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100" 
                    : answers[step.id] && answers[step.id].trim().length > 0
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
              >
                {idx + 1}
              </button>
              {idx < lesson.steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full ${idx < currentStepIndex ? "bg-indigo-600" : "bg-slate-100"}`} />
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 ml-4 shrink-0" onClick={() => setShowMap(true)}>
          <Map size={16} />
          全体マップを見る
        </Button>
      </div>

      {/* Overview Map Modal / Overlay */}
      <AnimatePresence>
        {showMap && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8"
          >
            <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                <Map className="text-indigo-600" size={32} />
                これから構築する「志望理由」の全体像
              </h2>
              <p className="text-slate-500 mb-8 text-lg">{lesson.overview || "このステップを完了すると、論理的で説得力のある構造が完成します。"}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {lesson.steps.map((step, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border-2 ${idx === currentStepIndex ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
                    <div className="text-xs font-bold text-indigo-500 mb-1">STEP {idx + 1}</div>
                    <div className="font-bold text-slate-800 mb-2 text-sm">{step.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{step.description}</div>
                  </div>
                ))}
                <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 flex flex-col items-center justify-center text-center">
                  <Check className="text-emerald-600 mb-2" size={32} />
                  <div className="font-bold text-emerald-800 text-sm">完成！</div>
                  <div className="text-xs text-emerald-600 mt-1">論理構造フレームワーク</div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-12 text-lg shadow-lg" onClick={() => setShowMap(false)}>
                  ワークを開始する <ArrowRight className="ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-800 text-slate-100 px-6 py-3 shadow-md z-20 flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs">
            Q
          </span>
        </div>
        <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
          {lesson.content}
        </div>
      </div>
      
      {/* Progress Line */}
      <div className="h-1 bg-slate-100 w-full">
        <motion.div 
          className="h-full bg-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Context & Instructions */}
        <div className="w-1/3 bg-slate-50/50 p-6 overflow-y-auto border-r border-slate-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id + "-instruction"}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div>
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full mb-3">
                  STEP {currentStep.order}
                </span>
                <h3 className="text-xl font-bold text-slate-800 leading-tight">
                  {currentStep.title}
                </h3>
              </div>
              
              <div className="prose prose-sm prose-slate">
                <p className="text-slate-600 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {currentStep.goodExample && (
                <div className="mt-6 flex flex-col gap-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={18} /> 思考のヒント（比較事例）
                  </h4>
                  
                  {/* Good Example */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 p-2 rounded-full shrink-0">
                        <ThumbsUp className="text-emerald-600" size={16} />
                      </div>
                      <div>
                        <h5 className="font-bold text-emerald-800 mb-1 text-sm">Good: 説得力のある回答例</h5>
                        <p className="text-slate-700 text-sm mb-3">{currentStep.goodExample}</p>
                        <div className="bg-white/60 p-3 rounded-lg text-xs text-emerald-900 border border-emerald-100">
                          <span className="font-bold">なぜ良いのか？：</span> {currentStep.goodReason}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bad Example */}
                  {currentStep.badExample && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                      <div className="flex items-start gap-3">
                        <div className="bg-rose-100 p-2 rounded-full shrink-0">
                          <ThumbsDown className="text-rose-600" size={16} />
                        </div>
                        <div>
                          <h5 className="font-bold text-rose-800 mb-1 text-sm">Bad: よくある失敗例</h5>
                          <p className="text-slate-700 text-sm mb-3">{currentStep.badExample}</p>
                          <div className="bg-white/60 p-3 rounded-lg text-xs text-rose-900 border border-rose-100">
                            <span className="font-bold">なぜダメなのか？：</span> {currentStep.badReason}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Panel: Input & Feedback */}
        <div className="w-2/3 bg-white p-6 overflow-y-auto flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id + "-input"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-bold text-slate-700 mb-2 flex justify-between items-end">
                  <span>あなたの思考を言語化する (約100字〜150字)</span>
                  <span className={`text-xs font-bold ${
                    currentAnswer.length > 200 ? 'text-red-500' : 
                    currentAnswer.length > 100 ? 'text-emerald-500' : 
                    'text-slate-400'
                  }`}>
                    {currentAnswer.length} / 150 文字目安
                  </span>
                </label>
                <Textarea 
                  value={currentAnswer}
                  onChange={(e) => setAnswers({...answers, [currentStep.id]: e.target.value})}
                  placeholder={currentStep.placeholder || "ここに文章を入力してください..."}
                  className="flex-1 min-h-[250px] resize-none text-base leading-relaxed p-5 bg-white border border-slate-200 focus-visible:ring-indigo-500 shadow-inner placeholder:text-slate-300"
                />
              </div>

              {/* AI Interaction Area */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAiFeedbackRequest} 
                    disabled={isAiLoading || currentAnswer.trim().length < 10}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md rounded-full px-6"
                  >
                    {isAiLoading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AIメンターに添削を依頼する
                  </Button>
                </div>

                {/* AI Feedback Panel */}
                {(feedbacks[currentStep.id] || isAiLoading) && (
                  <AiFeedbackPanel 
                    feedback={feedbacks[currentStep.id]?.content} 
                    score={feedbacks[currentStep.id]?.score}
                    isLoading={isAiLoading} 
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              前のステップ
            </Button>
            
            {!isLastStep ? (
              <Button onClick={handleNext} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white">
                次のステップへ
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                <Check className="h-4 w-4" />
                ワークシートを提出する
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
