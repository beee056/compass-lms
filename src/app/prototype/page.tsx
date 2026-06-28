"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, Sparkles, Map, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function UXPrototype() {
  const [showMap, setShowMap] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answer, setAnswer] = useState("");

  const steps = [
    { title: "意見の言語化", goal: "なぜ自分がやるのか" },
    { title: "望む結果の定義", goal: "面接官にどう思わせるか" },
    { title: "論点の特定", goal: "他大学との違いは何か" },
    { title: "読み手の想定", goal: "相手の専門性を認識する" },
    { title: "自分の立場の確立", goal: "原体験と実績の整理" },
    { title: "論拠の提示", goal: "客観的データの提示" },
    { title: "根本思想の深化", goal: "自分の究極的な目標" }
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header Navigation */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shadow-sm relative">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <Sparkles size={18} />
              </span>
              慶應SFC 志望理由書ドリル
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-2xl justify-center">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all shadow-sm
                    ${idx === currentStepIndex 
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110" 
                      : idx < currentStepIndex
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200"
                    }`}
                >
                  {idx + 1}
                </button>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${idx < currentStepIndex ? "bg-emerald-400" : "bg-slate-100"}`} />
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => setShowMap(true)}>
            <Map size={16} />
            全体マップを見る
          </Button>
        </div>

        {/* Overview Map Modal / Overlay */}
        <AnimatePresence>
          {showMap && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8"
            >
              <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                  <Map className="text-indigo-600" size={32} />
                  これから構築する「志望理由」の全体像
                </h2>
                <p className="text-slate-500 mb-8 text-lg">この7つのステップを完了すると、論理的で説得力のある800字の構造が自動的に完成します。</p>
                
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {steps.map((step, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border-2 ${idx === currentStepIndex ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
                      <div className="text-xs font-bold text-indigo-500 mb-1">STEP {idx + 1}</div>
                      <div className="font-bold text-slate-800 mb-2">{step.title}</div>
                      <div className="text-sm text-slate-500">{step.goal}</div>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 flex flex-col items-center justify-center text-center">
                    <Check className="text-emerald-600 mb-2" size={32} />
                    <div className="font-bold text-emerald-800">完成！</div>
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

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel: Examples and Scaffolding */}
          <div className="w-1/2 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-6 bg-white border-b border-slate-100">
              <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full mb-3">STEP {currentStepIndex + 1}</span>
              <h3 className="text-2xl font-bold text-slate-800 leading-tight mb-2">{steps[currentStepIndex].title}</h3>
              <p className="text-slate-600">提示された「問い」に対し、あなたが導き出した「答え（意見）」を100字程度で端的に書いてください。</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={18} /> 思考のヒント（比較事例）
              </h4>
              
              <div className="flex flex-col gap-4">
                {/* Good Example */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full mt-1">
                      <ThumbsUp className="text-emerald-600" size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-emerald-800 mb-1">Good: 説得力のある回答例</h5>
                      <p className="text-slate-700 text-sm mb-3">
                        「私は高校2年時の限界集落でのボランティア経験から、日本の一次産業における高齢化と労働力不足という課題を、ドローン技術を用いて解決したいと考えています。」
                      </p>
                      <div className="bg-white/60 p-3 rounded-lg text-sm text-emerald-900 border border-emerald-100">
                        <span className="font-bold">なぜ良いのか？：</span> 
                        「限界集落でのボランティア」という具体的な原体験と、「ドローンを用いた解決」という独自のアプローチがセットになっており、志望動機の解像度が非常に高いため。
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bad Example */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  <div className="flex items-start gap-3">
                    <div className="bg-rose-100 p-2 rounded-full mt-1">
                      <ThumbsDown className="text-rose-600" size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-rose-800 mb-1">Bad: よくある失敗例</h5>
                      <p className="text-slate-700 text-sm mb-3">
                        「私は将来、社会に貢献できる人間になりたいです。貴学の充実した設備を使って様々なことを学び、グローバルに活躍したいと考えています。」
                      </p>
                      <div className="bg-white/60 p-3 rounded-lg text-sm text-rose-900 border border-rose-100">
                        <span className="font-bold">なぜダメなのか？：</span> 
                        「社会に貢献」「グローバルに活躍」は誰にでも言える一般論であり、あなたの原体験が見えません。「どんな課題」を「どう解決するのか」という論点が完全に欠落しています。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Input Area */}
          <div className="w-1/2 bg-white p-8 flex flex-col">
            <label className="text-sm font-bold text-slate-700 mb-2 flex justify-between items-end">
              <span>あなたの思考を言語化する (約100字〜150字)</span>
              <span className={`text-xs font-bold ${answer.length > 200 ? 'text-red-500' : answer.length > 100 ? 'text-emerald-500' : 'text-slate-400'}`}>
                {answer.length} / 150 文字目安
              </span>
            </label>
            <Textarea 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Good事例を参考に、あなたの原体験をベースにした意見を書いてみましょう..."
              className="flex-1 resize-none text-base leading-relaxed p-6 bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 shadow-inner rounded-xl"
            />
            
            <div className="mt-6 flex justify-end">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 py-6 text-lg shadow-md gap-2" disabled={answer.length < 10}>
                <Sparkles size={20} /> AIメンターに壁打ちを依頼する
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
