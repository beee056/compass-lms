import { Search, Plus, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const MOCK_STUDENTS = [
  {
    id: "1",
    name: "TEST",
    universities: ["慶應義塾大学 総合政策学部", "早稲田大学 経済学部"],
    lastUpdated: "2026/01/28"
  },
  {
    id: "2",
    name: "山口佳祐",
    universities: ["明治大学 心理学部 心理学科", "北里大学 医療衛生学部 健康科学科", "成城大学 経済学部"],
    lastUpdated: "2026/04/21"
  }
];

export default function DashboardPage() {
  return (
    <div className="relative min-h-[calc(100vh-100px)]">
      {/* Search and Tabs */}
      <div className="flex flex-col items-center justify-center gap-6 mb-12 mt-4">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input 
            className="w-full pl-12 h-12 rounded-full border-slate-200 shadow-sm bg-white"
            placeholder="名前、大学、タグで検索..." 
          />
        </div>
        
        <Tabs defaultValue="current" className="w-auto">
          <TabsList className="rounded-full bg-slate-100/80 p-1">
            <TabsTrigger value="current" className="rounded-full px-6 text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
              在籍生
            </TabsTrigger>
            <TabsTrigger value="graduated" className="rounded-full px-6 text-sm">
              卒業生
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_STUDENTS.map(student => (
          <Card key={student.id} className="p-6 hover:shadow-md transition-shadow bg-white rounded-xl border-slate-200 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
              <div className="flex gap-2">
                <Link href={`/students/${student.id}`} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8 mt-2">
              {student.universities.map(uni => (
                <Badge key={uni} variant="secondary" className="bg-slate-100/80 text-slate-600 hover:bg-slate-200 font-normal py-1 px-3 text-xs border border-slate-200/60">
                  {uni}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>最終更新: {student.lastUpdated}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 h-14 w-14 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600 hover:scale-105 transition-all">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
