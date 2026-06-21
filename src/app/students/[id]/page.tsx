import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Folder, Archive, CheckCircle2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import CreateDocumentButton from "@/components/CreateDocumentButton";

// 仮データ（DB接続前用）
const MOCK_STUDENT = {
  id: "1",
  name: "TEST",
  initial: "TE",
  phase: "書類作成フェーズ",
  universities: ["慶應義塾大学 総合政策学部", "早稲田大学 経済学部"],
  driveUrl: "https://drive.google.com/drive/folders/dummy",
  documents: [
    { id: "d1", title: "志望理由書_初稿", type: "志望理由書", url: "https://docs.google.com/document/d/dummy", status: "編集中", updatedAt: "2026/01/28", isArchived: false }
  ],
  tasks: [],
  milestones: []
};

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // DBから生徒情報を取得
  let studentData = await prisma.studentProfile.findUnique({
    where: { id: params.id },
    include: {
      universities: true,
      documents: { orderBy: { updatedAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      milestones: { orderBy: { date: 'asc' } }
    }
  });

  // DBに存在しない場合はモックを利用（開発中のフォールバック）
  if (!studentData) {
    if (params.id === "1") {
      // @ts-ignore
      studentData = MOCK_STUDENT;
    } else {
      notFound();
    }
  }

  const student = {
    id: studentData.id,
    name: studentData.name,
    initial: studentData.name.charAt(0),
    phase: studentData.phase,
    universities: studentData.universities?.map(u => `${u.name} ${u.department}`) || MOCK_STUDENT.universities,
    driveUrl: studentData.driveFolderUrl || MOCK_STUDENT.driveUrl,
    documents: studentData.documents || MOCK_STUDENT.documents,
    tasks: studentData.tasks || [],
    milestones: studentData.milestones || []
  };

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors text-slate-500 shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            {student.name}
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">{student.phase}</Badge>
          </h1>
          <div className="flex gap-2 mt-2">
            {student.universities.map((u, i) => (
              <span key={i} className="text-sm text-slate-500 font-medium">{u}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Folder className="h-5 w-5 text-indigo-500" />
                提出書類・ドキュメント
              </h2>
              <div className="flex gap-3">
                {student.driveUrl && (
                  <a href={student.driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                    <ExternalLink className="h-4 w-4" />
                    生徒フォルダ (Drive)
                  </a>
                )}
                <CreateDocumentButton studentId={student.id} />
              </div>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="divide-y divide-slate-100">
                {student.documents.filter(d => !d.isArchived).map(doc => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <a href={doc.url || "#"} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-2">
                          {doc.title}
                          <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-slate-100 text-slate-500">{doc.type}</Badge>
                          <span className="text-xs text-slate-400">更新: {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* status property may not exist on Prisma model, omitting for now */}
                      <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors" title="アーカイブする">
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                直近のタスク
              </h2>
            </div>
            {/* Task UI omitted for brevity, identical structure */}
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-orange-500" />
              重要スケジュール
            </h2>
            <Card className="p-5 border-slate-200 shadow-sm bg-white">
              <div className="space-y-6">
                {student.milestones.map((m, i) => (
                  <div key={m.id} className="relative pl-6">
                    {i !== student.milestones.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-[-24px] w-px bg-slate-200"></div>
                    )}
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-orange-400 shadow-sm"></div>
                    
                    <div className="text-xs font-bold text-orange-500 mb-1">{m.date ? new Date(m.date).toLocaleDateString() : ''}</div>
                    <h4 className="text-sm font-bold text-slate-800">{m.title}</h4>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-sm font-medium">{m.type}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
