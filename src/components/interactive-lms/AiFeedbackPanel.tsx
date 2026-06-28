"use client";

import { motion } from "framer-motion";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

type AiFeedbackProps = {
  feedback: string;
  isLoading?: boolean;
  score?: number | null;
};

export default function AiFeedbackPanel({ feedback, isLoading, score }: AiFeedbackProps) {
  if (isLoading) {
    return (
      <Card className="p-6 border-indigo-100 bg-indigo-50/50 flex flex-col items-center justify-center min-h-[200px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="h-8 w-8 text-indigo-400 mb-4" />
        </motion.div>
        <p className="text-sm font-medium text-indigo-600 animate-pulse">
          AIがあなたの論理を厳格にチェックしています...
        </p>
      </Card>
    );
  }

  if (!feedback) return null;

  const isPositive = score && score >= 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`p-6 border-l-4 ${isPositive ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-amber-500 bg-amber-50/30'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${isPositive ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isPositive ? (
              <CheckCircle2 className={`h-5 w-5 ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`} />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-bold mb-2 ${isPositive ? 'text-emerald-800' : 'text-amber-800'}`}>
              AIメンターからのフィードバック
            </h4>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {feedback}
            </div>
            {score !== undefined && score !== null && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-slate-100">
                <span className="text-slate-500">論理スコア:</span>
                <span className={score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}>
                  {score} / 100
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
