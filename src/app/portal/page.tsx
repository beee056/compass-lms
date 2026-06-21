import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { School, Phone } from "lucide-react";
import DocumentList from "@/components/DocumentList";
import TaskSection from "@/components/TaskSection";
import MilestoneSection from "@/components/MilestoneSection";

export default async function StudentPortalPage() {
  const user = await getCurrentUser();

  // MENTORが直接 /portal にアクセスした場合は弾く（もしくは自分担当の生徒一覧にリダイレクト）
  if (user.role !== "STUDENT") {
    redirect("/");
  }

  // 紐づく生徒プロフィールを取得
  const dbStudent = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      universities: true,
      documents: { orderBy: { updatedAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      milestones: { orderBy: { date: 'asc' } }
    }
  });

  if (!dbStudent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">生徒プロフィールの紐付けがありません</h1>
        <p className="text-slate-500">指導者（メンター）に招待メールアドレスの登録を依頼してください。</p>
      </div>
    );
  }

  const sData = dbStudent as any;
  const student = {
    id: dbStudent.id,
    name: dbStudent.name,
    phase: sData.phase,
    universities: dbStudent.universities,
    driveUrl: dbStudent.driveFolderUrl,
    documents: dbStudent.documents,
    tasks: dbStudent.tasks,
    milestones: dbStudent.milestones,
    highSchool: sData.highSchool || "",
    grade: sData.grade || "",
    phone: sData.phone || "",
    parentEmail: sData.parentEmail || "",
    studentEmail: sData.studentEmail || "",
    status: sData.status || "ACTIVE"
  };

  // 期限が設定されている「未完了のタスク」をマイルストーン形式に自動変換してマージ
  const taskMilestones = student.tasks
    .filter((t: any) => !t.completed && t.dueDate)
    .map((t: any) => ({
      id: `task-${t.id}`,
      title: `【タスク期限】${t.title}`,
      date: new Date(t.dueDate),
      status: "TODO",
      type: "タスク期限"
    }));

  const combinedMilestones = [
    ...student.milestones.map((m: any) => ({
      id: m.id,
      title: m.title,
      date: new Date(m.date),
      status: m.status,
      type: m.type
    })),
    ...taskMilestones
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // flat strings for DocumentList prop
  const flatUniversities = student.universities.map((u: any) => `${u.name} ${u.department}`);

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20 mt-4">
      {/* プロフィールヘッダー */}
      <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4 tracking-tight">
            {student.name} さんのマイページ
            <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-200/60 px-3 py-1 font-semibold text-sm rounded-full">
              {student.phase}
            </Badge>
          </h1>
          
          <div className="flex flex-wrap gap-3 mt-2.5 text-sm text-slate-500 items-center">
            {student.universities.map((u: any, i: number) => (
              <span key={i} className="font-semibold bg-slate-100/50 px-2.5 py-1 rounded-md flex items-center">
                {u.name} {u.department}
              </span>
            ))}

            {student.highSchool && (
              <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md ml-2">
                <School className="h-4 w-4 text-slate-400" />
                <span>{student.highSchool} ({student.grade || "学年未設定"})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* コンテンツグリッド */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          {/* Tasks Section */}
          <TaskSection 
            studentId={student.id} 
            initialTasks={student.tasks as any[]} 
            isStudent={true}
          />

          {/* Documents Section */}
          <DocumentList 
            studentId={student.id} 
            driveUrl={student.driveUrl} 
            initialDocuments={student.documents as any[]} 
            universities={flatUniversities}
            isStudent={true}
          />
        </div>

        {/* Compass Signature Milestone Column */}
        <div className="space-y-8">
          <MilestoneSection 
            studentId={student.id} 
            initialMilestones={combinedMilestones as any[]} 
            isStudent={true}
          />
        </div>
      </div>
    </div>
  );
}
