import { Search, Plus, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getStudents } from "@/lib/actions";
import AddStudentDialog from "@/components/AddStudentDialog";

export default async function Dashboard() {
  const students = await getStudents();

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 mt-4">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <Input 
            className="w-full pl-12 h-12 rounded-full border-slate-200 shadow-sm bg-white"
            placeholder="名前、大学、タグで検索..." 
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="rounded-full bg-slate-200/50 p-1 flex">
            <button className="rounded-full px-6 py-2 text-sm bg-white text-indigo-600 shadow-sm font-semibold transition-all">在籍生</button>
            <button className="rounded-full px-6 py-2 text-sm text-slate-500 font-semibold hover:text-slate-700 transition-all">卒業生</button>
          </div>
          <AddStudentDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => (
          <Card key={student.id} className="p-6 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                {student.initial}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-8 mt-2">
              {student.universities.map((u, i) => (
                <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 py-1.5 px-3 font-medium">
                  {u}
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
