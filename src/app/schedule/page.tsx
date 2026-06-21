import { CalendarIcon, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SchedulePage() {
  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-indigo-600" />
          全体スケジュール・マイルストーン
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">全生徒の直近の提出期限や面接日程を俯瞰できます。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 今月のマイルストーン */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">2026年 9月 (出願ラッシュ)</h2>
          
          <div className="space-y-4">
            {/* Item 1 */}
            <Card className="p-4 border-l-4 border-l-orange-500 border-y-slate-200 border-r-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer bg-white">
              <div className="flex items-center gap-4">
                <div className="text-center px-4 border-r border-slate-100">
                  <div className="text-xs font-bold text-slate-400">9月</div>
                  <div className="text-2xl font-black text-slate-800">01</div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">慶應義塾大学 SFC 出願受付開始</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 font-medium">山田 太郎</Badge>
                    <Badge variant="secondary" className="text-[10px] py-0 bg-orange-50 text-orange-600">出願</Badge>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex text-sm font-bold text-slate-400 items-center gap-1">
                <Clock className="h-4 w-4" />
                残り 14日
              </div>
            </Card>

            {/* Item 2 */}
            <Card className="p-4 border-l-4 border-l-emerald-500 border-y-slate-200 border-r-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer bg-white">
              <div className="flex items-center gap-4">
                <div className="text-center px-4 border-r border-slate-100">
                  <div className="text-xs font-bold text-slate-400">9月</div>
                  <div className="text-2xl font-black text-slate-800">15</div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">早稲田大学 1次選考 合格発表</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 font-medium">佐藤 花子</Badge>
                    <Badge variant="secondary" className="text-[10px] py-0 bg-emerald-50 text-emerald-600">発表</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 要注意の未完了タスク */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">期限切れ間近のタスク</h2>
          
          <div className="space-y-3">
            <Card className="p-4 border border-rose-200 bg-rose-50/50 shadow-sm">
              <div className="flex gap-3 items-start">
                <button className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border border-rose-300 bg-white text-transparent flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">志望理由書の第2稿提出</h4>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-rose-600">
                    <Clock className="h-3 w-3" />
                    明日が期限
                  </div>
                  <div className="mt-2 text-xs text-rose-700 font-medium bg-rose-100/50 inline-block px-2 py-1 rounded">山田 太郎</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
