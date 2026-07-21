import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Target,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import AddStudentDialog from "@/components/AddStudentDialog";
import StudentDashboardList from "@/components/StudentDashboardList";
import { formatDateJST, daysUntilJST, relativeDueLabelJST } from "@/lib/dates";

interface StudentData {
  id: string;
  name: string;
  universities: string[];
  lastUpdated: string;
  lastActivityAt?: string;
  daysSinceActivity?: number;
  initial: string;
  highSchool: string;
  grade: string;
  phone: string;
  parentEmail: string;
  studentEmail?: string;
  status: string;
}

// 停滞とみなす日数のしきい値
const STALE_DAYS = 7;

interface ScheduleTask {
  id: string;
  title: string;
  dueDate: Date | string | null;
  completed: boolean;
  studentProfileId: string;
  needsReply?: boolean;
  studentProfile?: {
    name?: string | null;
  } | null;
}

interface ScheduleMilestone {
  id: string;
  title: string;
  date: Date | string;
  status: string;
  type: string;
  studentProfile?: {
    name?: string | null;
  } | null;
}

interface MentorCommandCenterProps {
  students: StudentData[];
  tasks: ScheduleTask[];
  milestones: ScheduleMilestone[];
  workspaceName?: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}

const riskStyles = {
  critical: {
    label: "要介入",
    badge: "border-[#f0b0a7] bg-[#fff3f0] text-[#9f2d20]",
    bar: "bg-[#c63d35]"
  },
  watch: {
    label: "注意",
    badge: "border-[#ead28a] bg-[#fff7d9] text-[#7a5400]",
    bar: "bg-[#e7a72e]"
  },
  steady: {
    label: "順調",
    badge: "border-[#a8d9c9] bg-[#eef9f5] text-[#0f684d]",
    bar: "bg-[#137a5b]"
  }
} as const;

// 日付計算はすべて JST 基準の共通ユーティリティに委譲する（サーバーTZ=UTCとのズレ防止）
const formatDate = formatDateJST;
const getDaysUntil = daysUntilJST;
const getRelativeDueLabel = relativeDueLabelJST;

function getRisk(value: Date | string | null | undefined): keyof typeof riskStyles {
  const days = getDaysUntil(value);
  if (days <= 1) return "critical";
  if (days <= 5) return "watch";
  return "steady";
}

function MetricCard({ label, value, detail, icon: Icon, tone }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-[#d8dee4] bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="mt-3 text-3xl font-black text-[#17202a]">{value}</div>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

export default function MentorCommandCenter({
  students,
  tasks,
  milestones,
  workspaceName = "指導ワークスペース"
}: MentorCommandCenterProps) {
  const activeStudents = students.filter((student) => student.status !== "ARCHIVED");
  const archivedStudents = students.length - activeStudents.length;
  const upcomingTasks = tasks
    .filter((task) => task.dueDate && !task.completed)
    .sort((a, b) => getDaysUntil(a.dueDate) - getDaysUntil(b.dueDate));
  const urgentTasks = upcomingTasks.filter((task) => getDaysUntil(task.dueDate) <= 2);
  const weekTasks = upcomingTasks.filter((task) => getDaysUntil(task.dueDate) <= 7);
  const upcomingMilestonesAll = milestones
    .filter((milestone) => getDaysUntil(milestone.date) >= 0)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
  const MILESTONE_PREVIEW = 8;
  const upcomingMilestones = upcomingMilestonesAll.slice(0, MILESTONE_PREVIEW);
  const milestoneOverflow = upcomingMilestonesAll.length - upcomingMilestones.length;
  const selectedStudent =
    activeStudents.find((student) =>
      upcomingTasks.some((task) => task.studentProfileId === student.id)
    ) ?? activeStudents[0];

  // Phase 3: 停滞している生徒（7日以上活動なし）と、メンターの返信待ちタスク
  const stalledStudents = activeStudents
    .filter((s) => (s.daysSinceActivity ?? 0) >= STALE_DAYS)
    .sort((a, b) => (b.daysSinceActivity ?? 0) - (a.daysSinceActivity ?? 0));
  const replyNeededTasks = tasks.filter((t) => t.needsReply && !t.completed);

  // 生徒が1人もいないときは、空のダッシュボードではなくオンボーディングを表示する
  if (students.length === 0) {
    const onboardingSteps = [
      { n: "1", label: "生徒を登録", icon: UsersRound },
      { n: "2", label: "志望校を設定", icon: Target },
      { n: "3", label: "タスクを配布", icon: FileText }
    ];
    return (
      <div className="w-full animate-in fade-in duration-500 pb-20 text-[#17202a]">
        <div className="mx-auto max-w-2xl rounded-lg border border-[#d8dee4] bg-[#fbfcf8] px-6 py-16 text-center md:py-20">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1ea] text-[#3346a3]">
            <UsersRound className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-[#17202a] md:text-3xl">最初の生徒を登録しましょう</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-slate-600">
            生徒を登録すると、締切・要介入・面談の順番が毎朝この指導ボードに自動で並びます。
          </p>
          <div className="mt-7 flex justify-center">
            <AddStudentDialog />
          </div>
          <div className="mx-auto mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {onboardingSteps.map((step) => (
              <div key={step.n} className="rounded-lg border border-[#d8dee4] bg-white p-4 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef1ea] text-sm font-black text-[#3346a3]">
                  {step.n}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm font-black text-[#17202a]">
                  <step.icon className="h-4 w-4 text-slate-400" />
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8 pb-20 text-[#17202a]">
      {(stalledStudents.length > 0 || replyNeededTasks.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {stalledStudents.length > 0 && (
            <div className="rounded-lg border border-[#f0b0a7] bg-[#fff3f0] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#9f2d20]">
                <AlertTriangle className="h-4 w-4" />
                停滞している生徒 {stalledStudents.length}名（{STALE_DAYS}日以上動きなし）
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {stalledStudents.slice(0, 6).map((s) => (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#f0b0a7] bg-white px-2.5 py-1 text-xs font-bold text-[#9f2d20] transition-colors hover:bg-[#ffe9e4]"
                  >
                    {s.name}
                    <span className="text-[#c06a5f]">{s.daysSinceActivity}日</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {replyNeededTasks.length > 0 && (
            <div className="rounded-lg border border-[#ead28a] bg-[#fff7d9] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#7a5400]">
                <MessageSquare className="h-4 w-4" />
                返信待ちのタスク {replyNeededTasks.length}件（生徒からの最新コメント）
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {replyNeededTasks.slice(0, 4).map((t) => (
                  <Link
                    key={t.id}
                    href={`/students/${t.studentProfileId}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-[#ead28a] bg-white px-2.5 py-1.5 text-xs font-bold text-[#7a5400] transition-colors hover:bg-[#fff2c2]"
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-[#a07d2a]">{t.studentProfile?.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-lg border border-[#d8dee4] bg-[#fbfcf8] p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 grid h-1 grid-cols-5">
            <span className="bg-[#3346a3]" />
            <span className="bg-[#137a5b]" />
            <span className="bg-[#e7a72e]" />
            <span className="bg-[#c63d35]" />
            <span className="bg-[#17202a]" />
          </div>

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-[#3346a3]">{workspaceName}</p>
              <h1 className="mt-2 text-4xl font-black text-[#17202a] md:text-5xl">
                今日の指導ボード
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-slate-600">
                締切、提出物、面談準備を「どの生徒に今動くか」の順番で整理します。
              </p>
            </div>
            <div className="shrink-0">
              <AddStudentDialog />
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <MetricCard
              label="在籍生"
              value={`${activeStudents.length}`}
              detail={`卒業生 ${archivedStudents}名`}
              icon={UsersRound}
              tone="text-[#3346a3]"
            />
            <MetricCard
              label="今週の期限"
              value={`${weekTasks.length}`}
              detail="未完了タスク"
              icon={CalendarDays}
              tone="text-[#137a5b]"
            />
            <MetricCard
              label="要介入"
              value={`${urgentTasks.length}`}
              detail="今日から2日以内"
              icon={AlertTriangle}
              tone="text-[#c63d35]"
            />
            <MetricCard
              label="直近予定"
              value={`${upcomingMilestonesAll.length}`}
              detail="次のマイルストーン"
              icon={Target}
              tone="text-[#e7a72e]"
            />
          </div>
        </div>

        <aside className="rounded-lg bg-[#17202a] p-6 text-white">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <p className="text-xs font-bold text-white/60">最初に見る生徒</p>
              <h2 className="mt-1 text-2xl font-black">{selectedStudent?.name ?? "未登録"}</h2>
            </div>
            <GraduationCap className="h-8 w-8 text-[#f5c04f]" />
          </div>

          {selectedStudent ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-sm leading-6 text-white/70">
                  {selectedStudent.universities[0] ?? "志望校未設定"}
                </p>
              </div>

              <Link
                href={`/students/${selectedStudent.id}`}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-black text-[#17202a] transition-colors hover:bg-[#f7f8f4]"
              >
                詳細を開く
                <Target className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-white/15 bg-white/5 p-4 text-sm leading-6 text-white/70">
              生徒を登録すると、今日見るべき順番がここに表示されます。
            </div>
          )}
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-[#d8dee4] bg-white">
          <div className="border-b border-[#d8dee4] px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <AlertTriangle className="h-5 w-5 text-[#c63d35]" />
              要介入キュー
            </h2>
          </div>
          <div className="divide-y divide-[#eef1ea]">
            {upcomingTasks.length === 0 ? (
              <div className="p-6 text-sm font-semibold leading-6 text-slate-500">
                期限付きの未完了タスクはありません。新しい面談タスクを追加すると、ここに優先順で表示されます。
              </div>
            ) : (
              upcomingTasks.slice(0, 5).map((task) => {
                const risk = getRisk(task.dueDate);
                const style = riskStyles[risk];
                return (
                  <Link
                    key={task.id}
                    href={`/students/${task.studentProfileId}`}
                    className="group relative block p-5 transition-colors hover:bg-[#fbfcf8]"
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-[#17202a] group-hover:text-[#3346a3]">
                          {task.studentProfile?.name ?? "生徒名未設定"}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">{task.title}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs font-black ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {getRelativeDueLabel(task.dueDate)}
                      </span>
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-white">
          <div className="flex items-center justify-between border-b border-[#d8dee4] px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <CalendarDays className="h-5 w-5 text-[#137a5b]" />
              直近のマイルストーン
            </h2>
            <Link href="/schedule" className="text-xs font-bold text-[#3346a3] hover:underline">
              全体スケジュールへ
            </Link>
          </div>
          <div className="divide-y divide-[#eef1ea]">
            {upcomingMilestones.length === 0 ? (
              <div className="p-5 text-sm font-semibold leading-6 text-slate-500">
                直近のマイルストーンはありません。
                <span className="mt-1 block text-xs font-medium text-slate-400">
                  出願締切・書類の提出期限などの日程を登録すると、ここに近い順で表示されます（タスク期限は左の要介入キューに出ます）。
                </span>
              </div>
            ) : (
              <>
                {upcomingMilestones.map((milestone) => (
                  <div key={milestone.id} className="p-4">
                    <p className="text-xs font-bold text-slate-500">{formatDate(milestone.date)}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-black">{milestone.title}</p>
                    <p className="mt-1 text-xs font-bold text-[#3346a3]">
                      {milestone.studentProfile?.name ?? milestone.type}
                    </p>
                  </div>
                ))}
                {milestoneOverflow > 0 && (
                  <Link
                    href="/schedule"
                    className="block p-4 text-xs font-bold text-[#3346a3] transition-colors hover:bg-[#fbfcf8] hover:underline"
                  >
                    ＋ ほか {milestoneOverflow} 件を全体スケジュールで見る
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#d8dee4] bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">生徒一覧</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            検索、卒業生切替、個別編集は従来通り使えます。
          </p>
        </div>
        <StudentDashboardList initialStudents={students} />
      </section>
    </div>
  );
}
