"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Milestone {
  id: string;
  title: string;
  date: string | Date;
  status: string;
  type: string;
  studentName?: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | Date;
  completed: boolean;
  type: string;
  studentName?: string;
}

interface ScheduleCalendarProps {
  milestones: Milestone[];
  tasks: Task[];
}

export default function ScheduleCalendar({ milestones, tasks }: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // カレンダーのセルの生成
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 日曜始まり
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;

  // 予定データのマッピング用
  const getDayEvents = (date: Date) => {
    const dayMilestones = milestones.filter(m => isSameDay(new Date(m.date), date));
    const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date));
    return { dayMilestones, dayTasks };
  };

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const { dayMilestones, dayTasks } = getDayEvents(cloneDay);
      
      days.push(
        <div 
          key={day.toString()} 
          className={`min-h-[120px] p-2 border-r border-b border-slate-100 flex flex-col ${
            !isSameMonth(day, monthStart) 
              ? "bg-slate-50/50 text-slate-400" 
              : "bg-white text-slate-700"
          } ${isSameDay(day, new Date()) ? "bg-indigo-50/30" : ""}`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
              isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : ""
            }`}>
              {format(day, dateFormat)}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
            {dayMilestones.map((m, i) => (
              <div key={`m-${i}`} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 p-1.5 rounded-md truncate shadow-sm flex flex-col gap-0.5" title={`${m.type}: ${m.title}`}>
                <span className="font-bold">{m.studentName}</span>
                <span className="text-[10px] opacity-90 truncate">{m.title}</span>
              </div>
            ))}
            {dayTasks.map((t, i) => (
              <div key={`t-${i}`} className={`text-xs p-1.5 rounded-md truncate flex flex-col gap-0.5 border ${
                t.completed ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm"
              }`} title={t.title}>
                <span className="font-bold flex items-center gap-1">
                  {t.completed ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  {t.studentName}
                </span>
                <span className="text-[10px] opacity-90 truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  // 月間サマリーの集計
  const currentMonthMilestones = milestones.filter(m => {
    const d = typeof m.date === 'string' ? parseISO(m.date) : new Date(m.date);
    return isSameMonth(d, currentMonth);
  });
  
  const typeCount = currentMonthMilestones.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="w-full">
      {/* カレンダーヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          {format(currentMonth, "yyyy年 M月")}
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            今日
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* サマリー領域 */}
      {Object.keys(typeCount).length > 0 && (
        <div className="mb-6 bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 mb-3">当月のイベントサマリー</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(typeCount).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                <span className="text-sm font-bold text-indigo-700">{type}</span>
                <span className="text-sm font-bold text-indigo-600 bg-white px-2 py-0.5 rounded shadow-sm">{count}件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カレンダー本体 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Weekdays */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {weekDays.map((day, i) => (
            <div key={day} className={`py-2.5 text-center text-xs font-bold ${i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-500"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="flex flex-col border-l border-slate-200">
          {rows}
        </div>
      </div>
    </div>
  );
}
