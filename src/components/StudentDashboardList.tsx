"use client";

import { useState } from "react";
import { MoreHorizontal, Search, School } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import AddStudentDialog from "./AddStudentDialog";
import EditStudentDialog from "./EditStudentDialog";

interface StudentData {
  id: string;
  name: string;
  universities: string[];
  lastUpdated: string;
  initial: string;
  phase: string;
  highSchool: string;
  grade: string;
  phone: string;
  parentEmail: string;
  studentEmail?: string;
  status: string;
}

type SortKey = "stale" | "recent" | "name";

export default function StudentDashboardList({ initialStudents }: { initialStudents: StudentData[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [sortBy, setSortBy] = useState<SortKey>("stale");

  // フィルタリング
  const filteredStudents = initialStudents.filter((student) => {
    const matchStatus = student.status === statusFilter;

    const q = searchQuery.toLowerCase();
    const matchQuery =
      student.name.toLowerCase().includes(q) ||
      student.universities.some((u) => u.toLowerCase().includes(q)) ||
      student.highSchool.toLowerCase().includes(q) ||
      student.grade.toLowerCase().includes(q);

    return matchStatus && matchQuery;
  });

  // 並び替え（更新が古い順＝停滞発見をデフォルトに）
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "ja");
    if (sortBy === "recent") return b.lastUpdated.localeCompare(a.lastUpdated);
    return a.lastUpdated.localeCompare(b.lastUpdated); // stale: 古い順
  });

  return (
    <div className="w-full">
      {/* 検索・フィルターバー */}
      <div className="mb-10 mt-2 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <Input 
            className="h-12 w-full rounded-md border-[#d8dee4] bg-[#fbfcf8] pl-12 text-base shadow-none focus-visible:ring-[#3346a3]/30"
            placeholder="生徒名、大学、高校、学年で検索..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-3">
          <div className="flex w-full shrink-0 rounded-md border border-[#d8dee4] bg-[#fbfcf8] p-1 shadow-none md:w-auto">
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`flex-1 whitespace-nowrap rounded px-5 py-2.5 text-center text-sm font-bold transition-all md:flex-none ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-[#3346a3] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              在籍生
            </button>
            <button
              onClick={() => setStatusFilter("ARCHIVED")}
              className={`flex-1 whitespace-nowrap rounded px-5 py-2.5 text-center text-sm font-bold transition-all md:flex-none ${
                statusFilter === "ARCHIVED"
                  ? "bg-white text-[#3346a3] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              卒業生
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:flex md:w-auto md:gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="並び替え"
              className="h-11 w-full min-w-0 rounded-md border border-[#d8dee4] bg-[#fbfcf8] px-3 text-sm font-semibold text-slate-600 focus-visible:ring-[#3346a3]/30 md:w-auto"
            >
              <option value="stale">更新が古い順（要フォロー）</option>
              <option value="recent">更新が新しい順</option>
              <option value="name">名前順</option>
            </select>
          </div>

          <AddStudentDialog className="w-full md:w-auto" />
        </div>
      </div>

      {/* 生徒一覧カードグリッド */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedStudents.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d8dee4] bg-[#fbfcf8] py-20 text-slate-500">
            <p className="font-semibold text-lg mb-2">該当する生徒が見つかりません</p>
            <p className="text-sm">条件を変えて検索するか、生徒を追加してください。</p>
          </div>
        ) : (
          sortedStudents.map((student) => (
            <div key={student.id} className="block group relative">
              <Card className="relative flex flex-col overflow-hidden border-[#d8dee4] bg-white p-4 shadow-sm transition-all duration-300 group-hover:border-[#3346a3]/40 group-hover:shadow-[0_8px_24px_rgba(23,32,42,0.06)]">
                <Link href={`/students/${student.id}`} className="absolute inset-0 z-0" aria-label={`${student.name}の詳細を見る`} />

                <div className="relative z-10 mb-3 flex items-start justify-between gap-2 pointer-events-none">
                  <div className="min-w-0 flex-1">
                    <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-normal text-[#17202a] transition-colors group-hover:text-[#3346a3]">
                      <Link href={`/students/${student.id}`} className="hover:underline pointer-events-auto relative z-20">
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
                  <div className="relative z-20 flex shrink-0 items-start gap-1 pointer-events-auto sm:gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d8dee4] bg-[#fbfcf8] text-sm font-bold text-slate-500 transition-all group-hover:border-[#3346a3]/30 group-hover:bg-[#eef1ea] group-hover:text-[#3346a3] sm:h-10 sm:w-10 sm:text-base">
                      {student.initial}
                    </div>
                    <EditStudentDialog 
                      student={student} 
                      trigger={
                        <button 
                          aria-label={`${student.name}を編集`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none sm:h-10 sm:w-10"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      } 
                    />
                  </div>
                </div>

                {/* 志望大学 */}
                <div className="flex flex-wrap gap-1.5 mb-3 relative z-10 pointer-events-none">
                  {student.universities.map((u, i) => (
                    <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-600 py-1 px-2.5 font-medium border-slate-100 text-xs">
                      {u}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-end mt-auto pt-3 border-t border-slate-50 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>最終更新 {student.lastUpdated}</span>
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
