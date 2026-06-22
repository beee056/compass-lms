import { getStudents, getCurrentUser, getScheduleData } from "@/lib/actions";
import StudentDashboardList from "@/components/StudentDashboardList";
import { redirect } from "next/navigation";
import { AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") {
    redirect("/portal");
  }

  const students = await getStudents();
  const { tasks } = await getScheduleData();

  // 型キャスト
  const castedStudents = students as any[];
  
  // 期限間近（または期限切れ）のタスクを抽出
  const alertTasks = tasks.filter((t: any) => t.dueDate && !t.completed).slice(0, 3);

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      
      {/* トップアラート領域 */}
      {alertTasks.length > 0 && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700 font-bold mb-3">
            <AlertCircle className="h-5 w-5" />
            <span>要注意・近日期限のタスク</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alertTasks.map((t: any) => (
              <Link href={`/students/${t.studentProfileId}`} key={t.id} className="bg-white rounded-lg p-3 border border-rose-100 shadow-sm hover:border-rose-300 transition-colors group">
                <div className="text-xs text-rose-500 font-semibold mb-1 truncate">{t.studentProfile?.name}</div>
                <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{t.title}</div>
                <div className="flex items-center gap-1 mt-2 text-xs font-bold text-rose-600">
                  <Clock className="h-3 w-3" />
                  {new Date(t.dueDate).toISOString().split('T')[0].replace(/-/g, '/')}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <StudentDashboardList initialStudents={castedStudents} />
    </div>
  );
}
