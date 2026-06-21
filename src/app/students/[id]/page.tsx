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
  const dbStudent = await prisma.studentProfile.findUnique({
    where: { id: params.id },
    include: {
      universities: true,
      documents: { orderBy: { updatedAt: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      milestones: { orderBy: { date: 'asc' } }
    }
  });

  const isMock = !dbStudent && params.id === "1";
  
  if (!dbStudent && !isMock) {
    notFound();
  }

  const student = {
    id: dbStudent ? dbStudent.id : MOCK_STUDENT.id,
    name: dbStudent ? dbStudent.name : MOCK_STUDENT.name,
    initial: dbStudent ? dbStudent.name.charAt(0) : MOCK_STUDENT.initial,
    phase: dbStudent ? dbStudent.phase : MOCK_STUDENT.phase,
    universities: dbStudent 
      ? dbStudent.universities.map((u: any) => `${u.name} ${u.department}`) 
      : MOCK_STUDENT.universities,
    driveUrl: dbStudent ? dbStudent.driveFolderUrl : MOCK_STUDENT.driveUrl,
    documents: dbStudent ? dbStudent.documents : MOCK_STUDENT.documents,
    tasks: dbStudent ? dbStudent.tasks : MOCK_STUDENT.tasks,
    milestones: dbStudent ? dbStudent.milestones : MOCK_STUDENT.milestones
  };

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4 mb-12 mt-4">
        <Link href="/" className="p-2.5 bg-white border border-slate-200/60 rounded-full hover:bg-slate-50 transition-colors text-slate-500 shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4 tracking-tight">
            {student.name}
            <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-200/60 px-3 py-1 font-semibold text-sm rounded-full">
              {student.phase}
            </Badge>
          </h1>
          <div className="flex gap-3 mt-2.5">
            {student.universities.map((u: any, i: number) => (
              <span key={i} className="text-sm text-slate-500 font-semibold bg-slate-100/50 px-2.5 py-1 rounded-md">{u}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          {/* Documents Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
                <Folder className="h-6 w-6 text-indigo-500" />
                提出書類・ドキュメント
              </h2>
              <div className="flex gap-3">
                {student.driveUrl && (
                  <a href={student.driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/60 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
                    <ExternalLink className="h-4 w-4" />
                    生徒フォルダ (Drive)
                  </a>
                )}
                <CreateDocumentButton studentId={student.id} />
              </div>
            </div>

            <Card className="border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden bg-white/80 backdrop-blur-sm">
              <div className="divide-y divide-slate-100">
                {student.documents.filter((d: any) => !d.isArchived).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-semibold text-sm">
                    ドキュメントがまだありません。
                  </div>
                ) : (
                  student.documents.filter((d: any) => !d.isArchived).map((doc: any) => (
                    <div key={doc.id} className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className="p-3 bg-indigo-50/50 text-indigo-600 rounded-xl border border-indigo-100/50">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <a href={doc.url || "#"} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-2 text-base">
                            {doc.title}
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] py-0.5 px-2 bg-slate-100/80 text-slate-500 font-bold rounded-sm border border-slate-200/50">{doc.type}</span>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              更新: {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button className="p-2.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="アーカイブする">
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          {/* Tasks Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                直近のタスク
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dummy Task for UI demo, as mock tasks might be empty */}
              <div className="p-5 bg-white border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-xl group hover:border-emerald-200 transition-colors">
                <div className="flex gap-4 items-start">
                  <button className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 group-hover:border-emerald-400 flex items-center justify-center transition-colors">
                  </button>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">志望理由書の第1稿提出</h4>
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm inline-flex">
                      <Clock className="h-3 w-3" /> 期限: 2026/02/05
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Compass Signature Milestone Column */}
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 mb-6 tracking-tight">
              <CalendarIcon className="h-6 w-6 text-indigo-500" />
              Compass (マイルストーン)
            </h2>
            <Card className="p-8 border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-gradient-to-b from-white to-slate-50/50">
              <div className="space-y-0 relative">
                {/* The central axis of the compass */}
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent"></div>
                
                {/* Mock milestones for the signature UI demo */}
                {[
                  { date: '2026/09/01', title: '慶應SFC 出願開始', type: '出願', isActive: false },
                  { date: '2026/10/15', title: '早稲田 1次合格発表', type: '発表', isActive: true },
                ].map((m: any, i: number) => (
                  <div key={i} className={`relative pl-8 pb-8 ${i === 1 ? 'pb-2' : ''}`}>
                    {/* Compass node */}
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${m.isActive ? 'bg-indigo-500 ring-4 ring-indigo-50' : 'bg-slate-300'}`}>
                      {m.isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    
                    <div className={`text-xs font-bold mb-1 ${m.isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{m.date}</div>
                    <h4 className={`text-base font-bold tracking-tight ${m.isActive ? 'text-slate-800' : 'text-slate-600'}`}>{m.title}</h4>
                    <span className={`inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded border font-bold ${m.isActive ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{m.type}</span>
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
