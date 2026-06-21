"use client";

import { useState } from "react";
import { Search, GraduationCap, Phone, School, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import AddStudentDialog from "./AddStudentDialog";
import EditStudentDialog from "./EditStudentDialog";
import { MoreHorizontal } from "lucide-react";

interface StudentData {
  id: string;
  name: string;
  universities: string[];
  lastUpdated: string;
  initial: string;
  phase: string;
  highSchool: string;
  grade: string;
  contactInfo: string;
  status: string;
}

export default function StudentDashboardList({ initialStudents }: { initialStudents: StudentData[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  // フィルタリングロジック
  const filteredStudents = initialStudents.filter((student) => {
    // 1. ステータスフィルター
    const matchStatus = student.status === statusFilter;

    // 2. 検索クエリフィルター
    const q = searchQuery.toLowerCase();
    const matchQuery = 
      student.name.toLowerCase().includes(q) ||
      student.universities.some((u) => u.toLowerCase().includes(q)) ||
      student.highSchool.toLowerCase().includes(q) ||
      student.grade.toLowerCase().includes(q) ||
      student.phase.toLowerCase().includes(q);

    return matchStatus && matchQuery;
  });

  return (
    <div className="w-full">
      {/* 検索・フィルターバー */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16 mt-6">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-5 top-4 h-5 w-5 text-slate-400" />
          <Input 
            className="w-full pl-14 h-14 rounded-full border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-white/80 backdrop-blur-sm text-base focus-visible:ring-indigo-500/30"
            placeholder="生徒名、大学、高校、学年で検索..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="rounded-full bg-white border border-slate-200/60 p-1 flex shadow-sm w-full sm:w-auto justify-center">
            <button 
              onClick={() => setStatusFilter("ACTIVE")}
              className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all w-1/2 sm:w-auto text-center ${
                statusFilter === "ACTIVE" 
                  ? "bg-slate-50 text-indigo-700 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              在籍生
            </button>
            <button 
              onClick={() => setStatusFilter("ARCHIVED")}
              className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all w-1/2 sm:w-auto text-center ${
                statusFilter === "ARCHIVED" 
                  ? "bg-slate-50 text-indigo-700 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              卒業生
            </button>
          </div>
          <AddStudentDialog />
        </div>
      </div>

      {/* 生徒一覧カードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-white border border-slate-200/60 rounded-xl border-dashed">
            <p className="font-semibold text-lg mb-2">該当する生徒が見つかりません</p>
            <p className="text-sm">条件を変えて検索するか、生徒を追加してください。</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <Link href={`/students/${student.id}`} key={student.id} className="block group">
              <Card className="p-8 flex flex-col min-h-[260px] bg-white border-slate-200/60 shadow-sm group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:border-indigo-200 transition-all duration-300 relative overflow-hidden">
                {/* 装飾用の背景グラデーション効果 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/10 rounded-full blur-2xl group-hover:bg-indigo-50/30 transition-colors pointer-events-none"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="pr-10">
                    <h3 className="text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight flex items-center gap-2">
                      <Link href={`/students/${student.id}`} className="hover:underline">
                        {student.name}
                      </Link>
                      {student.grade && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {student.grade}
                        </span>
                      )}
                    </h3>
                    
                    {/* 出身高校 */}
                    {student.highSchool && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <School className="h-3 w-3" />
                        <span>{student.highSchool}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute top-4 right-4 z-20">
                    <EditStudentDialog 
                      student={student} 
                      trigger={
                        <button 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      } 
                    />
                  </div>
                  
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all ml-auto mt-2 mr-2 relative z-10">
                    {student.initial}
                  </div>
                </div>

                {/* 志望大学 */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {student.universities.map((u, i) => (
                    <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-600 py-1.5 px-3 font-medium border-slate-100">
                      {u}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <span className="text-xs font-semibold px-3 py-1 bg-indigo-50/50 text-indigo-600 rounded-full border border-indigo-100/50">
                    {student.phase}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{student.lastUpdated}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
