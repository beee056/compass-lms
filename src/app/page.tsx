import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getStudents } from "@/lib/actions";
import AddStudentDialog from "@/components/AddStudentDialog";

interface StudentData {
  id: string;
  name: string;
  universities: string[];
  lastUpdated: string;
  initial: string;
}

export default async function Dashboard() {
  const students = await getStudents();

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-16 mt-6">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-5 top-4 h-5 w-5 text-slate-400" />
          <Input 
            className="w-full pl-14 h-14 rounded-full border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-white/80 backdrop-blur-sm text-base focus-visible:ring-indigo-500/30"
            placeholder="生徒の名前、大学、タグで検索..." 
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="rounded-full bg-white border border-slate-200/60 p-1 flex shadow-sm">
            <button className="rounded-full px-6 py-2.5 text-sm bg-slate-50 text-indigo-700 font-bold transition-all">在籍生</button>
            <button className="rounded-full px-6 py-2.5 text-sm text-slate-500 font-semibold hover:text-slate-700 transition-all">卒業生</button>
          </div>
          <AddStudentDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student: StudentData) => (
          <Link href={`/students/${student.id}`} key={student.id} className="block group">
            <Card className="p-8 flex flex-col min-h-[220px] bg-white border-slate-200/60 shadow-sm group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:border-indigo-200 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">{student.name}</h3>
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                  {student.initial}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-8">
                {student.universities.map((u, i) => (
                  <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-600 py-1.5 px-3 font-medium border-slate-100">
                    {u}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-semibold px-3 py-1 bg-indigo-50/50 text-indigo-600 rounded-full border border-indigo-100/50">
                  書類作成フェーズ
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>{student.lastUpdated}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
