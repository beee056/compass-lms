import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  PenTool,
  Route,
  Target,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import AddStudentDialog from "@/components/AddStudentDialog";
import StudentDashboardList from "@/components/StudentDashboardList";

interface StudentData {
  id: string;
  name: string;
  universities: string[];
  lastUpdated: string;
  initial: string;
  phase: string;
  highSchool: string;
  grade: string;
  phone: string;
  parentEmail: string;
  studentEmail?: string;
  status: string;
}

interface ScheduleTask {
  id: string;
  title: string;
  dueDate: Date | string | null;
  completed: boolean;
  studentProfileId: string;
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

const phaseOrder = ["自己分析", "書類作成", "活動報告", "面接対策", "最終確認"] as const;

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

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "期限なし";
  return date.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric"
  });
}

function getDaysUntil(value: Date | string | null | undefined): number {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.ceil((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
}

function getRelativeDueLabel(value: Date | string | null | undefined): string {
  const days = getDaysUntil(value);
  if (!Number.isFinite(days)) return "期限なし";
  if (days < 0) return `${Math.abs(days)}日超過`;
  if (days === 0) return "今日";
  if (days === 1) return "明日";
  return `${days}日後`;
}

function getRisk(value: Date | string | null | undefined): keyof typeof riskStyles {
  const days = getDaysUntil(value);
  if (days <= 1) return "critical";
  if (days <= 5) return "watch";
  return "steady";
}

function getPhaseIndex(phase: string): number {
  const normalizedPhase = phase || "";
  const foundIndex = phaseOrder.findIndex((item) => normalizedPhase.includes(item.replace("対策", "")));
  return foundIndex >= 0 ? foundIndex : 0;
}

function getPhaseProgress(phase: string): number {
  return Math.min(95, 20 + getPhaseIndex(phase) * 18);
}

function getRouteState(index: number, activeIndex: number): string {
  if (index < activeIndex) return "完了";
  if (index === activeIndex) return "進行中";
  return "待機";
}

function getRouteTone(index: number, activeIndex: number): string {
  if (index < activeIndex) return "bg-[#137a5b] text-white border-[#137a5b]";
  if (index === activeIndex) return "bg-[#3346a3] text-white border-[#3346a3]";
  return "bg-white text-[#17202a] border-[#d8dee4]";
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
  const upcomingMilestones = milestones
    .filter((milestone) => getDaysUntil(milestone.date) >= 0)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))
    .slice(0, 3);
  const selectedStudent =
    activeStudents.find((student) =>
      upcomingTasks.some((task) => task.studentProfileId === student.id)
    ) ?? activeStudents[0];
  const activePhaseIndex = selectedStudent ? getPhaseIndex(selectedStudent.phase) : 0;
  const selectedProgress = selectedStudent ? getPhaseProgress(selectedStudent.phase) : 0;

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8 pb-20 text-[#17202a]">
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
              value={`${upcomingMilestones.length}`}
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
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-white/70">{selectedStudent.phase}</span>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-black text-white/75">
                    {selectedProgress}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-sm bg-white/10">
                  <div className="h-full bg-[#f5c04f]" style={{ width: `${selectedProgress}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">
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

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr_0.75fr]">
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

        <div className="rounded-lg border border-[#d8dee4] bg-[#fbfcf8] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Route className="h-5 w-5 text-[#3346a3]" />
              出願航路
            </h2>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-[#d8dee4]">
              {selectedStudent?.name ?? "生徒未選択"}
            </span>
          </div>

          <div className="relative mt-6">
            <div className="absolute left-8 right-8 top-8 hidden h-1 bg-[#d8dee4] md:block" />
            <div className="grid gap-4 md:grid-cols-5">
              {phaseOrder.map((phase, index) => (
                <article key={phase} className="relative rounded-lg border border-[#d8dee4] bg-white p-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-black ${getRouteTone(index, activePhaseIndex)}`}>
                    {index < activePhaseIndex ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>
                  <p className="mt-4 text-xs font-black text-[#3346a3]">STEP {index + 1}</p>
                  <h3 className="mt-1 font-black">{phase}</h3>
                  <p className="mt-3 rounded-md bg-[#eef1ea] px-2 py-1 text-xs font-black text-[#17202a]">
                    {getRouteState(index, activePhaseIndex)}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {upcomingMilestones.length === 0 ? (
              <div className="rounded-lg border border-[#d8dee4] bg-white p-4 md:col-span-3">
                <p className="text-sm font-semibold text-slate-500">直近のマイルストーンはありません。</p>
              </div>
            ) : (
              upcomingMilestones.map((milestone) => (
                <div key={milestone.id} className="rounded-lg border border-[#d8dee4] bg-white p-4">
                  <p className="text-xs font-bold text-slate-500">{formatDate(milestone.date)}</p>
                  <p className="mt-2 line-clamp-2 text-sm font-black">{milestone.title}</p>
                  <p className="mt-2 text-xs font-bold text-[#3346a3]">
                    {milestone.studentProfile?.name ?? milestone.type}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-white">
          <div className="border-b border-[#d8dee4] px-5 py-4">
            <h2 className="text-lg font-black">生徒ポートフォリオ</h2>
          </div>
          <div className="divide-y divide-[#eef1ea]">
            {activeStudents.slice(0, 5).map((student) => {
              const progress = getPhaseProgress(student.phase);
              return (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="block p-4 transition-colors hover:bg-[#fbfcf8]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{student.name}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{student.phase}</p>
                    </div>
                    <span className="rounded-md bg-[#eef9f5] px-2 py-1 text-xs font-black text-[#0f684d]">
                      {progress}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-sm bg-[#eef1ea]">
                    <div className="h-full bg-[#3346a3]" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-3 truncate text-xs font-bold text-slate-500">
                    {student.universities[0] ?? "志望校未設定"}
                  </p>
                </Link>
              );
            })}
            {activeStudents.length === 0 && (
              <div className="p-5 text-sm font-semibold leading-6 text-slate-500">
                在籍生がまだ登録されていません。
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-[#d8dee4] bg-white">
          <div className="border-b border-[#d8dee4] px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <FileText className="h-5 w-5 text-[#3346a3]" />
              直近の提出物
            </h2>
          </div>
          <div className="divide-y divide-[#eef1ea]">
            {upcomingTasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/students/${task.studentProfileId}`}
                className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-[#fbfcf8]"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-[#eef1ea] p-2 text-[#3346a3]">
                    <PenTool className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-black">{task.title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {task.studentProfile?.name ?? "生徒名未設定"}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-[#fbfcf8] px-2 py-1 text-xs font-black text-[#17202a] ring-1 ring-[#d8dee4]">
                  {getRelativeDueLabel(task.dueDate)}
                </span>
              </Link>
            ))}
            {upcomingTasks.length === 0 && (
              <div className="p-5 text-sm font-semibold text-slate-500">提出物タスクはありません。</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-[#17202a] p-5 text-white">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <MessageSquare className="h-5 w-5 text-[#f5c04f]" />
            次回面談の視点
          </h2>
          <div className="mt-5 space-y-3">
            {[
              "期限が近いタスクから、文章添削より構造レビューを優先する",
              "志望校ごとの根拠が弱い生徒を先に見る",
              "面談後はタスクとマイルストーンを同時に更新する"
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#f5c04f]" />
                <span className="text-sm font-bold leading-6 text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <CalendarDays className="h-5 w-5 text-[#137a5b]" />
            本日の運用
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#fbfcf8] p-4 ring-1 ring-[#d8dee4]">
              <p className="text-xs font-bold text-slate-500">未完了期限</p>
              <p className="mt-2 text-2xl font-black">{upcomingTasks.length}</p>
            </div>
            <div className="rounded-lg bg-[#fbfcf8] p-4 ring-1 ring-[#d8dee4]">
              <p className="text-xs font-bold text-slate-500">生徒数</p>
              <p className="mt-2 text-2xl font-black">{activeStudents.length}</p>
            </div>
          </div>
          <Link
            href="/schedule"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d8dee4] bg-[#fbfcf8] text-sm font-black text-[#17202a] transition-colors hover:border-[#137a5b] hover:text-[#137a5b]"
          >
            全体スケジュールへ
            <CalendarDays className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-[#d8dee4] bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[#3346a3]">Student list</p>
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
