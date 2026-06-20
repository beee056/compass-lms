import { Plus, Bell, Link as LinkIcon, Trash2, Edit2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Tabs defaultValue="keio" className="w-full">
          <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 pb-2 gap-4">
            <TabsTrigger value="keio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 font-bold text-slate-800">
              慶應義塾大学 総合政策学部
            </TabsTrigger>
            <TabsTrigger value="waseda" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 font-bold text-slate-500 hover:text-slate-700">
              早稲田大学 経済学部
            </TabsTrigger>
            <button className="text-slate-400 hover:text-slate-600 ml-2">
              <Plus className="h-5 w-5" />
            </button>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          <Card className="rounded-xl border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 pt-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500">大学情報</CardTitle>
              <Edit2 className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </CardHeader>
            <CardContent>
              <h3 className="text-base font-bold text-indigo-900 mb-4">慶應義塾大学 総合政策学部</h3>
              <div className="inline-block bg-amber-100 text-amber-700 border-l-4 border-amber-500 px-3 py-1 font-bold text-xs rounded-r">
                併願校
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-0 pt-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500">カレンダー</CardTitle>
              <button className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
            </CardHeader>
            <CardContent className="p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={new Date(2026, 5, 21)}
                className="rounded-md border-0"
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 pt-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500">TODOタスク</CardTitle>
              <Plus className="h-4 w-4 text-slate-400 cursor-pointer hover:text-indigo-600" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox id="task1" className="mt-1 border-slate-300 data-[state=checked]:bg-indigo-600" />
                <div className="flex-1">
                  <label htmlFor="task1" className="text-sm text-slate-700 font-medium">備忘: 学校調査書取得</label>
                </div>
                <span className="text-xs text-slate-400 font-medium">2026/07/28</span>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="task2" checked className="mt-1 border-slate-300 data-[state=checked]:bg-indigo-600" />
                <div className="flex-1">
                  <label htmlFor="task2" className="text-sm text-slate-400 font-medium line-through">志望理由書第1稿完了</label>
                </div>
                <span className="text-xs text-slate-400 line-through">2026/07/01</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="w-full flex-1 flex flex-col gap-6 min-w-0">
          {/* Milestones / Timeline */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide bg-slate-100/60 p-4 rounded-xl border border-slate-200/60">
            <Card className="min-w-[160px] border-y-0 border-r-0 border-l-[6px] border-l-indigo-600 shadow-sm shrink-0 bg-white rounded-lg">
              <CardContent className="p-4">
                <div className="text-xs font-bold text-indigo-600 mb-1">2026/07/01</div>
                <div className="text-sm font-bold text-slate-800 mb-2 truncate">志望理由書第1稿完了</div>
                <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded inline-block">TODO</div>
              </CardContent>
            </Card>
            <Card className="min-w-[160px] border-y-0 border-r-0 border-l-[6px] border-l-slate-300 shadow-sm shrink-0 bg-white rounded-lg">
              <CardContent className="p-4">
                <div className="text-xs font-bold text-slate-500 mb-1">2026/07/28</div>
                <div className="text-sm font-bold text-slate-800 mb-2 truncate">備忘: 学校調査書取得</div>
                <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded inline-block">TODO</div>
              </CardContent>
            </Card>
            <Card className="min-w-[160px] border-y-0 border-r-0 border-l-[6px] border-l-slate-300 shadow-sm shrink-0 bg-white rounded-lg">
              <CardContent className="p-4">
                <div className="text-xs font-bold text-slate-500 mb-1">2026/09/01</div>
                <div className="text-sm font-bold text-slate-800 mb-2 truncate">志望理由書</div>
                <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded inline-block">資料</div>
              </CardContent>
            </Card>
            <Card className="min-w-[160px] border-y-0 border-r-0 border-l-[6px] border-l-slate-300 shadow-sm shrink-0 bg-white rounded-lg">
              <CardContent className="p-4">
                <div className="text-xs font-bold text-slate-500 mb-1">2026/09/01</div>
                <div className="text-sm font-bold text-slate-800 mb-2 truncate">自由記述</div>
                <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded inline-block">資料</div>
              </CardContent>
            </Card>
          </div>

          {/* Document Items */}
          <div className="space-y-4">
            <Card className="shadow-sm border-slate-200 bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-base mb-1 truncate">志望理由書</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>2026/09/01</span>
                      <Edit2 className="h-3.5 w-3.5 cursor-pointer hover:text-indigo-600" />
                      <Bell className="h-3.5 w-3.5 cursor-pointer hover:text-indigo-600" />
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-48 xl:w-64 mt-2 sm:mt-0 flex-shrink-0">
                  <div className="flex justify-end items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700">50%</span>
                  </div>
                  <Progress value={50} className="h-2.5 bg-slate-100" />
                </div>
                
                <div className="flex items-center gap-4 sm:ml-4 mt-4 sm:mt-0 justify-end">
                  <button className="text-slate-400 hover:text-indigo-600 transition-colors"><LinkIcon className="h-5 w-5" /></button>
                  <button className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">開く</button>
                  <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-5 w-5" /></button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-base mb-1 truncate">自由記述</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>2026/09/01</span>
                      <Edit2 className="h-3.5 w-3.5 cursor-pointer hover:text-indigo-600" />
                      <Bell className="h-3.5 w-3.5 cursor-pointer hover:text-indigo-600" />
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-48 xl:w-64 mt-2 sm:mt-0 flex-shrink-0">
                  <div className="flex justify-end items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700">40%</span>
                  </div>
                  <Progress value={40} className="h-2.5 bg-slate-100" />
                </div>
                
                <div className="flex items-center gap-4 sm:ml-4 mt-4 sm:mt-0 justify-end">
                  <button className="text-slate-400 hover:text-indigo-600 transition-colors"><LinkIcon className="h-5 w-5" /></button>
                  <button className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">開く</button>
                  <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-5 w-5" /></button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-base mb-1 truncate">任意提出資料</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>2026/09/01</span>
                      <Edit2 className="h-3.5 w-3.5 cursor-pointer hover:text-indigo-600" />
                      <Bell className="h-3.5 w-3.5 cursor-pointer hover:text-indigo-600" />
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-48 xl:w-64 mt-2 sm:mt-0 flex-shrink-0">
                  <div className="flex justify-end items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700">10%</span>
                  </div>
                  <Progress value={10} className="h-2.5 bg-slate-100" />
                </div>
                
                <div className="flex items-center gap-4 sm:ml-4 mt-4 sm:mt-0 justify-end">
                  <button className="text-slate-400 hover:text-indigo-600 transition-colors"><LinkIcon className="h-5 w-5" /></button>
                  <button className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">開く</button>
                  <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-5 w-5" /></button>
                </div>
              </CardContent>
            </Card>

            <button className="w-full mt-2 py-4 border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm">
              <Plus className="h-5 w-5" />
              新しい資料を追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
