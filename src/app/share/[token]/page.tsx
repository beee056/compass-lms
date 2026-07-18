import prisma from "@/lib/prisma";
import { Compass, GraduationCap, ListChecks, PenTool } from "lucide-react";
import PracticeScoreTrend from "@/components/PracticeScoreTrend";

// 保護者向けの閲覧専用ページ（ログイン不要・推測不能トークンで認可）。
// 表示するのは進捗サマリーのみ。連絡先・書類・答案本文・添削本文は含めない。
export const dynamic = "force-dynamic";

export default async function SharedProgressPage({ params }: { params: { token: string } }) {
  const link = await prisma.sharedAccessToken.findUnique({
    where: { token: params.token },
    select: { id: true, expiresAt: true, revokedAt: true, studentProfileId: true }
  });
  const isValid = link && !link.revokedAt && link.expiresAt > new Date();

  if (!isValid) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <Compass className="h-10 w-10 text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-700">このリンクは無効です</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          リンクの有効期限が切れているか、失効されています。塾の担当者へお問い合わせください。
        </p>
      </div>
    );
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: link.studentProfileId },
    select: {
      name: true,
      phase: true,
      universities: { select: { name: true, department: true, method: true } },
      milestones: { select: { title: true, date: true, status: true, type: true }, orderBy: { date: "asc" } },
      tasks: { select: { title: true, completed: true, updatedAt: true } },
      practiceRecords: {
        where: { isArchived: false, parentRecordId: null },
        select: { type: true, prompt: true, score: true, createdAt: true, questionBankId: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!student) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm font-bold text-slate-500">
        データが見つかりません。
      </div>
    );
  }

  const completedTasks = student.tasks.filter((task) => task.completed).length;
  const totalTasks = student.tasks.length;
  const upcomingMilestones = student.milestones.filter((m) => m.status !== "DONE").slice(0, 6);
  // 「実際にどんな取り組みをしているか」が伝わるよう、直近の活動を具体的に見せる
  // （答案・添削の本文は含めない。設問テーマと点数のみ）
  const recentPractices = [...student.practiceRecords].reverse().slice(0, 8);
  const recentCompletedTasks = student.tasks
    .filter((task) => task.completed)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const truncatePrompt = (value: string) => {
    const singleLine = value.replace(/\s+/g, " ").trim();
    return singleLine.length > 45 ? `${singleLine.slice(0, 45)}…` : singleLine;
  };

  const hasScoredPractices = student.practiceRecords.some((record) => record.score !== null);

  const formatDate = (value: Date) =>
    new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-white">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Scholar Compass 進捗レポート</p>
              <h1 className="text-xl font-black text-slate-800">{student.name} さんの学習状況</h1>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            現在のフェーズ: <span className="text-indigo-600">{student.phase}</span>
          </p>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            志望校
          </h2>
          <ul className="mt-3 space-y-2">
            {student.universities.length === 0 && <li className="text-sm font-medium text-slate-400">登録なし</li>}
            {student.universities.map((u, i) => (
              <li key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                {u.name} {u.department} <span className="ml-2 text-xs font-semibold text-slate-400">{u.method}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
            <ListChecks className="h-5 w-5 text-emerald-500" />
            タスクの進捗
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {totalTasks === 0 ? "登録されたタスクはまだありません。" : `${totalTasks}件中 ${completedTasks}件完了（${Math.round((completedTasks / totalTasks) * 100)}%）`}
          </p>
          {totalTasks > 0 && (
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.round((completedTasks / totalTasks) * 100)}%` }}
              />
            </div>
          )}
        </section>

        {hasScoredPractices && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
              <PenTool className="h-5 w-5 text-blue-500" />
              AI添削演習のスコア推移
            </h2>
            <div className="mt-3">
              <PracticeScoreTrend records={student.practiceRecords as any[]} />
            </div>
          </section>
        )}

        {recentPractices.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-800">最近の演習の取り組み</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">どんなテーマに取り組んだか（答案・添削の本文は表示されません）</p>
            <ul className="mt-3 space-y-2">
              {recentPractices.map((record, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                  <span className="min-w-0">
                    <span className="mr-2 rounded-sm bg-blue-100 px-1.5 py-0.5 text-[11px] font-black text-blue-700">{record.type}</span>
                    <span className="text-sm font-semibold text-slate-700">{truncatePrompt(record.prompt)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {record.score !== null && (
                      <span className="text-sm font-black text-slate-800">{record.score}<span className="text-xs font-bold text-slate-400">点</span></span>
                    )}
                    <span className="text-xs font-semibold text-slate-400">{formatDate(record.createdAt as unknown as Date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recentCompletedTasks.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-800">最近完了したタスク</h2>
            <ul className="mt-3 space-y-2">
              {recentCompletedTasks.map((task, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-emerald-50/60 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">{task.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">{formatDate(task.updatedAt as unknown as Date)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-black text-slate-800">今後の予定</h2>
          <ul className="mt-3 space-y-2">
            {upcomingMilestones.length === 0 && <li className="text-sm font-medium text-slate-400">直近の予定はありません。</li>}
            {upcomingMilestones.map((m, i) => (
              <li key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="font-bold text-slate-700">{m.title}</span>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{formatDate(m.date)}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="pb-6 text-center text-xs font-semibold text-slate-400">
          このページは塾が発行した閲覧専用リンクです。内容についてのご質問は担当メンターへお願いします。
        </footer>
      </div>
    </div>
  );
}
