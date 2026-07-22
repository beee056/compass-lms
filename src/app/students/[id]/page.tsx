import Link from "next/link";
import { ArrowLeft, School, Phone } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser, getTemplates, getActivityLogs } from "@/lib/actions";
import { getRestrictedStudentIds } from "@/lib/authz";
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
import LessonLogSection from "@/components/LessonLogSection";
import AdmissionTrackerSection from "@/components/AdmissionTrackerSection";
import SelfProfileSection from "@/components/SelfProfileSection";
import ShareLinkManager from "@/components/ShareLinkManager";
import StudentInviteButton from "@/components/StudentInviteButton";
import { buildDerivedAdmissionMilestones } from "@/lib/admission-milestones";
import { StudentPathTabs } from "@/components/student-path-tabs";
import UniversityResourcesSection from "@/components/UniversityResourcesSection";

// AI添削・問題生成（このページから呼ばれるServer Action）が
// Vercelの既定タイムアウトを超えないよう上限を延長
export const maxDuration = 60;

export default async function StudentDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { university?: string };
}) {
  const user = await getCurrentUser();
  // 生徒は「自分の生徒ページ」だけ閲覧できる（メンターとURLを共有できる）。
  // 他の生徒のページを開こうとした場合は自分のページ（無ければポータル）へ戻す。
  const isStudentViewer = user.role === "STUDENT";
  if (isStudentViewer) {
    const ownStudentProfileId = user.studentProfile?.id ?? null;
    if (!ownStudentProfileId) {
      redirect("/portal");
    }
    if (ownStudentProfileId !== params.id) {
      redirect(`/students/${ownStudentProfileId}`);
    }
  }

  // 限定アクセス講師（招待時に生徒を選んで渡された講師）は、割り当てられた生徒のみ閲覧可能
  const restrictedIds = isStudentViewer ? null : await getRestrictedStudentIds(user);

  // 独立した4クエリを並列取得（直列awaitによる体感遅延を解消）
  const [rawQuestionBank, dbStudent, templates, logs] = await Promise.all([
    prisma.questionBank.findMany({
      // 共通問題(tenantId=null) + 自テナントのAI生成問題
      // 設問全文・模範解答は選択時にAPIで取得するため、一覧用の項目だけを渡す
      where: { status: "ACTIVE", OR: [{ tenantId: null }, { tenantId: user.tenantId }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, category: true, title: true, university: true, fieldCategory: true }
    }),
    prisma.studentProfile.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId,
        ...(restrictedIds ? { id: { in: restrictedIds } } : {})
      },
      include: {
        universities: { include: { resources: { orderBy: [{ kind: "asc" }, { createdAt: "desc" }] } } },
        documents: { orderBy: { updatedAt: 'desc' } },
        tasks: {
          include: { comments: { orderBy: { createdAt: 'asc' } } },
          orderBy: { dueDate: 'asc' }
        },
        milestones: { orderBy: { date: 'asc' } },
        practiceRecords: { where: { isArchived: false }, orderBy: { createdAt: 'desc' } },
        lessonLogs: { orderBy: { lessonDate: 'desc' }, take: 100 },
        selfProfile: true
      }
    }),
    getTemplates(),
    getActivityLogs(params.id)
  ]);
  const questionBank = JSON.parse(JSON.stringify(rawQuestionBank));

  if (!dbStudent) {
    notFound();
  }

  // 保護者向け共有リンク（メンター表示用。有効なものだけ）
  const shareLinks = isStudentViewer
    ? []
    : JSON.parse(JSON.stringify(
        await prisma.sharedAccessToken.findMany({
          where: { studentProfileId: params.id, revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, token: true, expiresAt: true, createdAt: true }
        })
      ));

  const student = {
    id: dbStudent.id,
    name: dbStudent.name,
    initial: dbStudent.name.charAt(0),
    universities: dbStudent.universities,
    driveUrl: dbStudent.driveFolderUrl,
    documents: dbStudent.documents,
    tasks: dbStudent.tasks,
    milestones: dbStudent.milestones,
    practiceRecords: dbStudent.practiceRecords,
    lessonLogs: dbStudent.lessonLogs,
    selfProfile: dbStudent.selfProfile,
    highSchool: dbStudent.highSchool || "",
    grade: dbStudent.grade || "",
    phone: dbStudent.phone || "",
    parentEmail: dbStudent.parentEmail || "",
    status: dbStudent.status || "ACTIVE"
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

  // 書類の提出期限もマイルストーン化（完了・アーカイブは除外）
  const documentMilestones = student.documents
    .filter((d: any) => !d.isArchived && d.dueDate && d.status !== "DONE")
    .map((d: any) => ({
      id: `doc-${d.id}`,
      title: d.title,
      date: new Date(d.dueDate),
      status: "TODO",
      type: "書類提出",
      universityId: d.universityId ?? null
    }));

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
    ...taskMilestones,
    ...documentMilestones
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
    <div className="w-full animate-in fade-in duration-500 pb-20">
      {/* 戻るボタン & プロフィールヘッダー */}
      <div className="flex items-start gap-4 mb-12 mt-4">
        <Link href={isStudentViewer ? "/portal" : "/"} className="p-2.5 bg-white border border-slate-200/60 rounded-full hover:bg-slate-50 transition-colors text-slate-500 shadow-sm mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4 tracking-tight">
              {safeStudent.name}
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
                  {!isStudentViewer && u.id && !u.id.startsWith("mock") && <EditUniversityDialog university={u} />}
                </span>
              ))}

              {/* 志望校追加ボタンの配置（メンターのみ） */}
              {!isStudentViewer && (
                <AddUniversityDialog studentId={safeStudent.id} templates={templates as any[]} />
              )}

              {safeStudent.highSchool && (
                 <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md ml-2">
                  <School className="h-4 w-4 text-slate-400" />
                  <span>{safeStudent.highSchool} ({safeStudent.grade || "学年未設定"})</span>
                </span>
              )}
              {!isStudentViewer && safeStudent.phone && (
                <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{safeStudent.phone}</span>
                </span>
              )}
              {!isStudentViewer && safeStudent.parentEmail && (
                <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md">
                  <span className="text-slate-400 text-xs">@</span>
                  <span>{safeStudent.parentEmail}</span>
                </span>
              )}
            </div>
          </div>
          {!isStudentViewer && (
            <div>
              <EditStudentDialog student={safeStudent} />
            </div>
          )}
        </div>
      </div>

      <StudentPathTabs
        basePath={`/students/${safeStudent.id}`}
        universities={safeStudent.universities}
        selectedUniversityId={selectedUniversityId}
      />

      {/* コンテンツグリッド */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          <UniversityResourcesSection universities={visibleUniversities as any[]} isMentorView={!isStudentViewer} />

          {/* Documents Section */}
          <DocumentList
            studentId={safeStudent.id}
            driveUrl={safeStudent.driveUrl}
            initialDocuments={visibleDocuments as any[]}
            universities={universityOptions}
            isStudent={isStudentViewer}
          />

          {/* Tasks Section */}
          <TaskSection
            studentId={safeStudent.id}
            initialTasks={visibleTasks as any[]}
            isStudent={isStudentViewer}
            universities={universityOptions}
          />

          {/* Practice Section */}
          <PracticeSection
            studentId={safeStudent.id}
            initialRecords={safeStudent.practiceRecords as any[]}
            isMentorView={!isStudentViewer}
            questionBank={questionBank}
          />

          {/* 授業・面談記録 */}
          <LessonLogSection
            studentId={safeStudent.id}
            initialLogs={safeStudent.lessonLogs as any[]}
            isMentorView={!isStudentViewer}
          />

          {/* 自己分析・将来ビジョン */}
          <SelfProfileSection studentId={safeStudent.id} profile={safeStudent.selfProfile} />

          {/* 入試状況（出願管理） */}
          <AdmissionTrackerSection
            universities={visibleUniversities as any[]}
            isMentorView={!isStudentViewer}
          />
        </div>

        {/* Compass Signature Milestone Column & Activity Log */}
        <div className="space-y-8">
          <MilestoneSection
            studentId={safeStudent.id}
            initialMilestones={visibleMilestones as any[]}
            isStudent={isStudentViewer}
            universities={universityOptions}
          />

          {!isStudentViewer && <StudentInviteButton studentId={safeStudent.id} isLinked={!!dbStudent.userId} />}

          {!isStudentViewer && <ShareLinkManager studentId={safeStudent.id} links={shareLinks} />}

          {!isStudentViewer && <ActivityLogSection logs={JSON.parse(JSON.stringify(logs))} />}
        </div>
      </div>
    </div>
  );
}
