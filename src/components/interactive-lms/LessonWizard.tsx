"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Sparkles, Send } from "lucide-react";
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
  order: number;
};

export type LessonData = {
  id: string;
  title: string;
  content: string;
  steps: LessonStep[];
};

export default function LessonWizard({ lesson, studentProfileId }: { lesson: LessonData, studentProfileId: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, { content: string; score: number }>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

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
      {/* Header / Progress bar */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="text-indigo-600">{lesson.title}</span>
        </h2>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>{currentStepIndex + 1}</span>
          <span className="text-slate-300">/</span>
          <span>{lesson.steps.length}</span>
        </div>
      </div>
      
      {/* Context Header (Pinned Theme) */}
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

              {currentStep.hint && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg shadow-sm">
                  <div className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4" />
                    思考のヒント
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    {currentStep.hint.replace("💡 ", "")}
                  </p>
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
                  <span>あなたの思考を言語化する</span>
                  <span className="text-xs text-slate-400 font-normal">{currentAnswer.length} 文字</span>
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
