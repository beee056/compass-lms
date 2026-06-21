"use client";

import { Clock, CheckCircle2, FileText, MessageSquare, PlusCircle, AlertCircle } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  createdAt: Date;
}

export default function ActivityLogSection({ logs }: { logs: ActivityLog[] }) {
  const getIcon = (action: string) => {
    switch (action) {
      case "TASK_COMPLETED": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "COMMENT_ADDED": return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case "UNIVERSITY_ADDED": return <PlusCircle className="h-4 w-4 text-blue-500" />;
      case "UNIVERSITY_EDITED": return <PlusCircle className="h-4 w-4 text-slate-500" />;
      case "TASK_CREATED_BY_STUDENT": return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
      case "TASK_UNCOMPLETED": return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default: return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 mt-6 relative overflow-hidden">
      {/* 装飾 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full blur-2xl -mt-10 -mr-10 pointer-events-none"></div>

      <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-slate-400" />
        アクティビティログ
      </h3>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 relative z-10">
        {logs.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">履歴はありません</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 bg-slate-50 border border-slate-100 p-1.5 rounded-full shrink-0">
                {getIcon(log.action)}
              </div>
              <div>
                <p className="text-slate-700 font-medium">{log.details}</p>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
