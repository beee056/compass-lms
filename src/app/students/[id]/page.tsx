import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Plus, Folder, Archive, CheckCircle2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// 仮データ（DB接続前用）
const STUDENT = {
  id: "1",
  name: "TEST",
  initial: "TE",
  phase: "書類作成フェーズ",
  universities: ["慶應義塾大学 総合政策学部", "早稲田大学 経済学部"],
  driveUrl: "https://drive.google.com/drive/folders/dummy",
  documents: [
    { id: "d1", title: "志望理由書_初稿", type: "志望理由書", url: "https://docs.google.com/document/d/dummy", status: "編集中", updatedAt: "2026/01/28" },
    { id: "d2", title: "活動報告書_ドラフト", type: "活動報告書", url: "https://docs.google.com/document/d/dummy", status: "レビュー待ち", updatedAt: "2026/01/25" },
    { id: "d3", title: "自己分析シート_アーカイブ", type: "その他", url: "https://docs.google.com/document/d/dummy", status: "アーカイブ", updatedAt: "2025/12/10", isArchived: true }
  ],
  tasks: [
    { id: "t1", title: "志望理由書の第1稿提出", dueDate: "2026/02/05", completed: false },
    { id: "t2", title: "大学パンフレットの取り寄せ", dueDate: "2026/01/30", completed: true }
  ],
  milestones: [
    { id: "m1", title: "慶應SFC 出願開始", date: "2026/09/01", type: "出願" },
    { id: "m2", title: "早稲田 1次合格発表", date: "2026/10/15", type: "発表" }
  ]
};

export default function StudentDetailPage() {
  const student = STUDENT;

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      {/* 戻るボタン & ヘッダー */}
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
        {/* 左側カラム：書類・ドライブ管理 */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* ドキュメント管理セクション */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Folder className="h-5 w-5 text-indigo-500" />
                提出書類・ドキュメント
              </h2>
              <div className="flex gap-3">
                {/* Drive リンクボタン */}
                <a href={student.driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                  <ExternalLink className="h-4 w-4" />
                  生徒フォルダ (Drive)
                </a>
                {/* 書類新規作成ボタン（GAS連携トリガー） */}
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                  <Plus className="h-4 w-4" />
                  新規書類を作成
                </button>
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
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-2">
                          {doc.title}
                          <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-slate-100 text-slate-500">{doc.type}</Badge>
                          <span className="text-xs text-slate-400">更新: {doc.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">{doc.status}</span>
                      <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors" title="アーカイブする">
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-center">
                <button className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  アーカイブ済みの書類を表示
                </button>
              </div>
            </Card>
          </section>

          {/* TODOタスク管理セクション */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                直近のタスク
              </h2>
              <button className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">タスクを追加</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {student.tasks.map(task => (
                <Card key={task.id} className={`p-4 border ${task.completed ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="flex gap-3 items-start">
                    <button className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                      <CheckCircle2 className="h-3 w-3" />
                    </button>
                    <div>
                      <h4 className={`text-sm font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
                        <Clock className="h-3 w-3" />
                        期限: {task.dueDate}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* 右側カラム：カレンダー・マイルストーン */}
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
                    
                    <div className="text-xs font-bold text-orange-500 mb-1">{m.date}</div>
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
