import Link from "next/link";
import { ArrowLeft, School, Phone } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser, getTemplates, getActivityLogs } from "@/lib/actions";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import EditStudentDialog from "@/components/EditStudentDialog";
import AddUniversityDialog from "@/components/AddUniversityDialog";
import EditUniversityDialog from "@/components/EditUniversityDialog";
import DocumentList from "@/components/DocumentList";
import TaskSection from "@/components/TaskSection";
import MilestoneSection from "@/components/MilestoneSection";
import ActivityLogSection from "@/components/ActivityLogSection";
import PracticeSection from "@/components/PracticeSection";

// 仮データ（DB接続前用）
const MOCK_STUDENT = {
  id: "1",
  name: "TEST",
  initial: "TE",
  phase: "書類作成",
  universities: ["慶應義塾大学 総合政策学部", "早稲田大学 経済学部"],
  driveUrl: "https://drive.google.com/drive/folders/dummy",
  documents: [
    { id: "d1", title: "志望理由書_初稿", type: "志望理由書", url: "https://docs.google.com/document/d/dummy", status: "編集中", updatedAt: new Date(), isArchived: false }
  ],
  tasks: [],
  milestones: [],
  highSchool: "港区立青葉高校",
  grade: "高3",
  phone: "090-0000-0000",
  parentEmail: "parent@example.com",
  status: "ACTIVE"
};

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") {
    redirect("/portal");
  }

  // 問題バンクの取得 (Client Componentへの受け渡しのためシリアライズ)
  const rawQuestionBank = await prisma.questionBank.findMany({
    orderBy: { createdAt: "desc" }
  });
  const questionBank = JSON.parse(JSON.stringify(rawQuestionBank));

  // DBから生徒情報を取得
  const dbStudent = await prisma.studentProfile.findUnique({
    where: { id: params.id },
    include: {
      universities: true,
      documents: { orderBy: { updatedAt: 'desc' } },
      tasks: { 
        include: { comments: { orderBy: { createdAt: 'asc' } } },
        orderBy: { dueDate: 'asc' } 
      },
      milestones: { orderBy: { date: 'asc' } },
      practiceRecords: { orderBy: { createdAt: 'desc' } }
    }
  });

  const templates = await getTemplates();
  const logs = await getActivityLogs(params.id);

  const isMock = !dbStudent && params.id === "1";
  
  if (!dbStudent && !isMock) {
    notFound();
  }

  const sData = dbStudent as any;
  const student = {
    id: dbStudent ? dbStudent.id : MOCK_STUDENT.id,
    name: dbStudent ? dbStudent.name : MOCK_STUDENT.name,
    initial: dbStudent ? dbStudent.name.charAt(0) : MOCK_STUDENT.initial,
    phase: dbStudent ? dbStudent.phase : MOCK_STUDENT.phase,
    universities: dbStudent 
      ? dbStudent.universities 
      : MOCK_STUDENT.universities.map((name, i) => ({ id: `mock-u-${i}`, name: name.split(" ")[0], department: name.split(" ")[1] || "学部未定" })),
    driveUrl: dbStudent ? dbStudent.driveFolderUrl : MOCK_STUDENT.driveUrl,
    documents: dbStudent ? dbStudent.documents : MOCK_STUDENT.documents,
    tasks: dbStudent ? dbStudent.tasks : MOCK_STUDENT.tasks,
    milestones: dbStudent ? dbStudent.milestones : MOCK_STUDENT.milestones,
    practiceRecords: dbStudent ? dbStudent.practiceRecords : [],
    highSchool: sData ? (sData.highSchool || "") : MOCK_STUDENT.highSchool,
    grade: sData ? (sData.grade || "") : MOCK_STUDENT.grade,
    phone: sData ? (sData.phone || "") : MOCK_STUDENT.phone,
    parentEmail: sData ? (sData.parentEmail || "") : MOCK_STUDENT.parentEmail,
    status: sData ? (sData.status || "ACTIVE") : MOCK_STUDENT.status
  };

  // 期限が設定されている「未完了のタスク」をマイルストーン形式に自動変換してマージ
  const taskMilestones = student.tasks
    .filter((t: any) => !t.completed && t.dueDate)
    .map((t: any) => ({
      id: `task-${t.id}`,
      title: t.title,
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

  // Client Componentへの受け渡しのためシリアライズ (Dateオブジェクト対策)
  const safeStudent = JSON.parse(JSON.stringify(student));
  const safeCombinedMilestones = JSON.parse(JSON.stringify(combinedMilestones));

  // flat strings for DocumentList prop
  const flatUniversities = safeStudent.universities.map((u: any) => `${u.name} ${u.department}`);

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      {/* 戻るボタン & プロフィールヘッダー */}
      <div className="flex items-start gap-4 mb-12 mt-4">
        <Link href="/" className="p-2.5 bg-white border border-slate-200/60 rounded-full hover:bg-slate-50 transition-colors text-slate-500 shadow-sm mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4 tracking-tight">
              {safeStudent.name}
              <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-200/60 px-3 py-1 font-semibold text-sm rounded-full">
                {safeStudent.phase}
              </Badge>
              {safeStudent.status === "ARCHIVED" && (
                <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 px-3 py-1 font-semibold text-sm rounded-full">
                  卒業生
                </Badge>
              )}
            </h1>
            
            <div className="flex flex-wrap gap-3 mt-2.5 text-sm text-slate-500 items-center">
              {safeStudent.universities.map((u: any, i: number) => (
                <span key={i} className="font-semibold bg-slate-100/50 px-2.5 py-1 rounded-md flex items-center">
                  {u.name} {u.department}
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore */}
                  {u.id && !u.id.startsWith("mock") && <EditUniversityDialog university={u} />}
                </span>
              ))}
              
              {/* 志望校追加ボタンの配置 */}
              <AddUniversityDialog studentId={safeStudent.id} templates={templates as any[]} />

              {safeStudent.highSchool && (
                 <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md ml-2">
                  <School className="h-4 w-4 text-slate-400" />
                  <span>{safeStudent.highSchool} ({safeStudent.grade || "学年未設定"})</span>
                </span>
              )}
              {safeStudent.phone && (
                <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{safeStudent.phone}</span>
                </span>
              )}
              {safeStudent.parentEmail && (
                <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md">
                  <span className="text-slate-400 text-xs">@</span>
                  <span>{safeStudent.parentEmail}</span>
                </span>
              )}
            </div>
          </div>
          <div>
            <EditStudentDialog student={safeStudent} />
          </div>
        </div>
      </div>

      {/* コンテンツグリッド */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          {/* Documents Section */}
          <DocumentList 
            studentId={safeStudent.id} 
            driveUrl={safeStudent.driveUrl} 
            initialDocuments={safeStudent.documents as any[]} 
            universities={flatUniversities}
          />

          {/* Tasks Section */}
          <TaskSection 
            studentId={safeStudent.id} 
            initialTasks={safeStudent.tasks as any[]} 
          />

          {/* Practice Section */}
          <PracticeSection 
            studentId={safeStudent.id} 
            initialRecords={safeStudent.practiceRecords as any[]} 
            isMentorView={true}
            questionBank={questionBank}
          />
        </div>

        {/* Compass Signature Milestone Column & Activity Log */}
        <div className="space-y-8">
          <MilestoneSection 
            studentId={safeStudent.id} 
            initialMilestones={safeCombinedMilestones as any[]} 
          />
          
          <ActivityLogSection logs={JSON.parse(JSON.stringify(logs))} />
        </div>
      </div>
    </div>
  );
}
