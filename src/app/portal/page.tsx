import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions";
import { School, Phone } from "lucide-react";
import DocumentList from "@/components/DocumentList";
import TaskSection from "@/components/TaskSection";
import MilestoneSection from "@/components/MilestoneSection";
import PracticeSection from "@/components/PracticeSection";
import LessonLogSection from "@/components/LessonLogSection";
import AdmissionTrackerSection from "@/components/AdmissionTrackerSection";
import SelfProfileSection from "@/components/SelfProfileSection";
import TenantStatusNotice from "@/components/TenantStatusNotice";
import { buildDerivedAdmissionMilestones } from "@/lib/admission-milestones";
import { StudentPathTabs } from "@/components/student-path-tabs";
import UniversityResourcesSection from "@/components/UniversityResourcesSection";

// AI添削（このページから呼ばれるServer Action）がタイムアウトしないよう上限を延長
export const maxDuration = 60;

export default async function StudentPortalPage({ searchParams }: { searchParams?: { university?: string } }) {
  const user = await getCurrentUser();

  // 問題バンクの取得: 共通問題(tenantId=null) + 自テナントのAI生成問題
  // 設問全文・模範解答は選択時にAPIで取得するため、一覧用の項目だけを渡す
  const rawQuestionBank = await prisma.questionBank.findMany({
    where: { status: "ACTIVE", OR: [{ tenantId: null }, { tenantId: user.tenantId }] },
    orderBy: { createdAt: "desc" },
    select: { id: true, category: true, title: true, university: true, fieldCategory: true }
  });
  const questionBank = JSON.parse(JSON.stringify(rawQuestionBank));

  // MENTORが直接 /portal にアクセスした場合は弾く（もしくは自分担当の生徒一覧にリダイレクト）
  if (user.role !== "STUDENT") {
    redirect("/");
  }

  // 所属テナントが停止中の場合は、生徒も利用できない
  const tenantStatus = (user.tenant as { status?: string } | null)?.status;
  if (tenantStatus === "SUSPENDED") {
    return <TenantStatusNotice status={tenantStatus} workspaceName={user.tenant?.name} />;
  }

  // 紐づく生徒プロフィールを取得
  const dbStudent = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      universities: { include: { resources: { orderBy: [{ kind: "asc" }, { createdAt: "desc" }] } } },
      documents: { orderBy: { updatedAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      milestones: { orderBy: { date: 'asc' } },
      practiceRecords: { where: { isArchived: false }, orderBy: { createdAt: 'desc' } },
        lessonLogs: { orderBy: { lessonDate: 'desc' }, take: 100 },
        selfProfile: true
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
    universities: dbStudent.universities,
    driveUrl: dbStudent.driveFolderUrl,
    documents: dbStudent.documents,
    tasks: dbStudent.tasks,
    milestones: dbStudent.milestones,
    practiceRecords: dbStudent.practiceRecords,
    lessonLogs: dbStudent.lessonLogs,
    selfProfile: dbStudent.selfProfile,
    highSchool: sData.highSchool || "",
    grade: sData.grade || "",
    phone: sData.phone || "",
    parentEmail: sData.parentEmail || "",
    status: sData.status || "ACTIVE"
  };

  // 期限が設定されている「未完了のタスク」をマイルストーン形式に自動変換してマージ
  const taskMilestones = student.tasks
    .filter((t: any) => !t.completed && t.dueDate)
    .map((t: any) => ({
      id: `task-${t.id}`,
      title: t.title,
      date: new Date(t.dueDate),
      status: "TODO",
      type: "タスク期限",
      universityId: t.universityId ?? null
    }));

  const admissionMilestones = buildDerivedAdmissionMilestones(
    student.universities,
    student.milestones.map((milestone: any) => milestone.sourceKey)
  );

  const combinedMilestones = [
    ...student.milestones.map((m: any) => ({
      id: m.id,
      title: m.title,
      date: new Date(m.date),
      status: m.status,
      type: m.type,
      universityId: m.universityId ?? null,
      sourceKey: m.sourceKey ?? null
    })),
    ...admissionMilestones,
    ...taskMilestones
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Client Componentへの受け渡しのためシリアライズ (Dateオブジェクト対策)
  const safeStudent = JSON.parse(JSON.stringify(student));
  const safeCombinedMilestones = JSON.parse(JSON.stringify(combinedMilestones));

  const universityOptions = safeStudent.universities.map((university: any) => ({
    id: university.id,
    label: `${university.name} ${university.department}`
  }));
  const requestedUniversityId = searchParams?.university ?? null;
  const selectedUniversityId = safeStudent.universities.some((university: any) => university.id === requestedUniversityId)
    ? requestedUniversityId
    : null;
  const visibleDocuments = selectedUniversityId
    ? safeStudent.documents.filter((document: any) => document.universityId === selectedUniversityId)
    : safeStudent.documents;
  const visibleTasks = selectedUniversityId
    ? safeStudent.tasks.filter((task: any) => task.universityId === selectedUniversityId)
    : safeStudent.tasks;
  const visibleMilestones = selectedUniversityId
    ? safeCombinedMilestones.filter((milestone: any) => milestone.universityId === selectedUniversityId)
    : safeCombinedMilestones;
  const visibleUniversities = selectedUniversityId
    ? safeStudent.universities.filter((university: any) => university.id === selectedUniversityId)
    : safeStudent.universities;

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20 mt-4">
      {/* プロフィールヘッダー */}
      <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4 tracking-tight">
            {safeStudent.name} さんのマイページ
          </h1>
          
          <div className="flex flex-wrap gap-3 mt-2.5 text-sm text-slate-500 items-center">
            {safeStudent.universities.map((u: any, i: number) => (
              <span key={i} className="font-semibold bg-slate-100/50 px-2.5 py-1 rounded-md flex items-center">
                {u.name} {u.department}
              </span>
            ))}

            {safeStudent.highSchool && (
              <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md ml-2">
                <School className="h-4 w-4 text-slate-400" />
                <span>{safeStudent.highSchool} ({safeStudent.grade || "学年未設定"})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <StudentPathTabs
        basePath="/portal"
        universities={safeStudent.universities}
        selectedUniversityId={selectedUniversityId}
      />

      {/* コンテンツグリッド */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          <UniversityResourcesSection universities={visibleUniversities as any[]} isMentorView={false} />

          {/* Tasks Section */}
          <TaskSection 
            studentId={safeStudent.id} 
            initialTasks={visibleTasks as any[]}
            isStudent={true}
          />

          {/* Documents Section */}
          <DocumentList 
            studentId={safeStudent.id} 
            driveUrl={safeStudent.driveUrl} 
            initialDocuments={visibleDocuments as any[]}
            universities={universityOptions}
            isStudent={true}
          />

          <PracticeSection 
            studentId={safeStudent.id} 
            initialRecords={safeStudent.practiceRecords as any[]} 
            questionBank={questionBank}
          />

          {/* 授業・面談記録（生徒は閲覧のみ） */}
          <LessonLogSection
            studentId={safeStudent.id}
            initialLogs={safeStudent.lessonLogs as any[]}
          />

          {/* 自己分析・将来ビジョン（生徒本人が記入） */}
          <SelfProfileSection studentId={safeStudent.id} profile={safeStudent.selfProfile} />

          {/* 入試状況（出願管理・生徒は閲覧のみ） */}
          <AdmissionTrackerSection universities={visibleUniversities as any[]} />
        </div>

        {/* Compass Signature Milestone Column */}
        <div className="space-y-8">
          <MilestoneSection 
            studentId={safeStudent.id} 
            initialMilestones={visibleMilestones as any[]}
            isStudent={true}
          />
        </div>
      </div>
    </div>
  );
}
