import { CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/actions';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function StudentCalendarPage() {
  const user = await getCurrentUser();
  if (user.role !== 'STUDENT' || !user.studentProfile) {
    redirect('/');
  }

  const studentId = user.studentProfile.id;

  const milestones = await prisma.milestone.findMany({
    where: { studentProfileId: studentId },
    orderBy: { date: 'asc' }
  });

  const tasks = await prisma.task.findMany({
    where: { 
      studentProfileId: studentId,
      completed: false,
      dueDate: { not: null }
    },
    orderBy: { dueDate: 'asc' }
  });

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-indigo-600" />
          マイ・スケジュール
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">自身の直近の提出期限や面接日程をカレンダー形式で確認できます。</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <ScheduleCalendar milestones={milestones as any[]} tasks={tasks as any[]} />
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">直近のアラート</h2>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-slate-500 text-sm py-4">未完了のタスクはありません。</div>
            ) : (
              tasks.slice(0, 10).map((t: any) => (
                <Card key={t.id} className="p-4 border border-rose-200 bg-rose-50/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-3 items-start">
                    <button className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border border-rose-300 bg-white text-transparent flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3" />
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 leading-tight">{t.title}</h4>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-rose-600">
                        <Clock className="h-3 w-3" />
                        期限: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

