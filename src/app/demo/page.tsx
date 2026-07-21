import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  MessageSquare,
  PenTool,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  type LucideIcon
} from "lucide-react";

export const metadata: Metadata = {
  title: "公開デモ | Scholar Compass",
  description: "Scholar Compass のメンター向け指導ボードと生徒ポータルを、ログインなしで確認できる公開デモです。"
};

const metrics = [
  { label: "今週の面談", value: "12", detail: "準備済み 9件", icon: CalendarDays, tone: "text-[#3346a3]" },
  { label: "提出物の進行", value: "73%", detail: "遅延 3件", icon: FileText, tone: "text-[#137a5b]" },
  { label: "要介入", value: "4", detail: "今日見る生徒", icon: AlertTriangle, tone: "text-[#c63d35]" }
] as const;

const priorityQueue = [
  {
    name: "山田 太郎",
    school: "慶應義塾大学 環境情報学部",
    action: "志望理由書 第2稿の論点整理",
    due: "今日 18:00",
    owner: "田中メンター",
    note: "原体験は強いが、研究テーマとの接続がまだ薄い",
    risk: "critical"
  },
  {
    name: "佐藤 花子",
    school: "早稲田大学 文化構想学部",
    action: "面接想定問答の回収",
    due: "明日 10:00",
    owner: "岡本メンター",
    note: "回答量は十分。結論を先に置く練習が必要",
    risk: "watch"
  },
  {
    name: "鈴木 一郎",
    school: "上智大学 総合グローバル学部",
    action: "活動報告書の証拠資料チェック",
    due: "7/8",
    owner: "田中メンター",
    note: "推薦状依頼と資料名の整合性を確認",
    risk: "steady"
  }
] as const;

const admissionsRoute = [
  { day: "D-45", title: "自己分析", owner: "生徒", state: "完了", tone: "bg-[#137a5b] text-white border-[#137a5b]" },
  { day: "D-32", title: "志望理由書", owner: "共同編集", state: "校正中", tone: "bg-[#3346a3] text-white border-[#3346a3]" },
  { day: "D-18", title: "活動報告書", owner: "メンター", state: "要確認", tone: "bg-[#f5c04f] text-[#17202a] border-[#e7a72e]" },
  { day: "D-10", title: "面接準備", owner: "生徒", state: "未着手", tone: "bg-white text-[#17202a] border-[#d8dee4]" },
  { day: "D-03", title: "最終点検", owner: "管理者", state: "待機", tone: "bg-white text-[#17202a] border-[#d8dee4]" }
] as const;

const studentRows = [
  { name: "山田 太郎", progress: "64%", next: "第2稿レビュー", heat: "high" },
  { name: "佐藤 花子", progress: "81%", next: "問答の構造化", heat: "medium" },
  { name: "鈴木 一郎", progress: "58%", next: "証拠資料の照合", heat: "low" },
  { name: "高橋 美咲", progress: "42%", next: "原体験メモ", heat: "medium" }
] as const;

const documentFlow = [
  { title: "志望理由書 第2稿", student: "山田 太郎", status: "今日レビュー", icon: PenTool },
  { title: "活動報告書 証拠一覧", student: "鈴木 一郎", status: "資料待ち", icon: FileText },
  { title: "面接問答 20問", student: "佐藤 花子", status: "AI添削済み", icon: Sparkles }
] as const;

const studentTasks = [
  { title: "志望理由書の結論を80字で書き直す", checked: false },
  { title: "活動写真3枚に説明文を付ける", checked: true },
  { title: "面接で聞かれそうな失敗談を整理する", checked: false }
] as const;

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

const heatStyles = {
  high: "bg-[#fff3f0] text-[#9f2d20]",
  medium: "bg-[#fff7d9] text-[#7a5400]",
  low: "bg-[#eef9f5] text-[#0f684d]"
} as const;

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
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

export default async function PublicDemoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  return (
    <div className="space-y-10 pb-16 text-[#17202a]">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-lg border border-[#d8dee4] bg-[#fbfcf8] p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 grid h-1 grid-cols-5">
            <span className="bg-[#3346a3]" />
            <span className="bg-[#137a5b]" />
            <span className="bg-[#e7a72e]" />
            <span className="bg-[#c63d35]" />
            <span className="bg-[#17202a]" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 py-1 text-xs font-bold text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-[#137a5b]" />
              ログイン不要の公開デモ
            </div>
            {/* ログイン状態に応じた本番アプリへの導線 */}
            {userId ? (
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3346a3] px-4 text-sm font-black text-white transition-colors hover:bg-[#2a3a8c]"
              >
                <Compass className="h-4 w-4" />
                自分のワークスペースを開く
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/sign-in" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-4 text-sm font-bold text-[#17202a] transition-colors hover:border-[#3346a3] hover:text-[#3346a3]">
                  ログイン
                </Link>
                <Link href="/sign-up" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3346a3] px-4 text-sm font-black text-white transition-colors hover:bg-[#2a3a8c]">
                  <Sparkles className="h-4 w-4" />
                  無料で始める
                </Link>
              </div>
            )}
          </div>
          <h1 className="mt-5 text-4xl font-black text-[#17202a] md:text-6xl">
            Scholar Compass
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
            総合型選抜の指導を、締切表ではなく「今日の判断」から始める管理画面へ。メンター、生徒、提出書類、面談準備、AI添削を一枚の作戦ボードに集約します。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#mentor-board"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17202a] px-5 text-sm font-bold text-white transition-colors hover:bg-[#243447]"
            >
              <Compass className="h-4 w-4" />
              指導ボードを見る
            </Link>
            <Link
              href="#student-room"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d8dee4] bg-white px-5 text-sm font-bold text-[#17202a] transition-colors hover:border-[#137a5b] hover:text-[#137a5b]"
            >
              <GraduationCap className="h-4 w-4" />
              生徒画面を見る
            </Link>
          </div>
        </div>

        <aside className="rounded-lg bg-[#17202a] p-6 text-white">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <p className="text-xs font-bold text-white/60">今日の判断</p>
              <h2 className="mt-1 text-2xl font-black">最初の30分</h2>
            </div>
            <Target className="h-8 w-8 text-[#f5c04f]" />
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-white/70">最優先</span>
                <span className="rounded-md bg-[#fff3f0] px-2 py-1 text-xs font-black text-[#9f2d20]">今日</span>
              </div>
              <p className="mt-2 text-lg font-black">山田 太郎の志望理由書</p>
              <p className="mt-2 text-sm leading-6 text-white/70">原体験と研究テーマの接続を先に固める。文章添削より構造レビューを優先。</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/15 p-4">
                <Clock className="h-5 w-5 text-[#f5c04f]" />
                <p className="mt-3 text-2xl font-black">18:00</p>
                <p className="text-xs font-semibold text-white/60">提出締切</p>
              </div>
              <div className="rounded-lg border border-white/15 p-4">
                <MessageSquare className="h-5 w-5 text-[#98d8c4]" />
                <p className="mt-3 text-2xl font-black">5件</p>
                <p className="text-xs font-semibold text-white/60">未返信コメント</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section id="mentor-board" className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[#3346a3]">Mentor board</p>
            <h2 className="text-3xl font-black text-[#17202a]">指導の優先順位を一画面に集約</h2>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-md border border-[#d8dee4] bg-white px-3 py-2 text-xs font-bold text-slate-600 md:self-auto">
            <UsersRound className="h-4 w-4 text-[#137a5b]" />
            4名の進行をデモ表示中
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr_0.75fr]">
          <div className="rounded-lg border border-[#d8dee4] bg-white">
            <div className="border-b border-[#d8dee4] px-5 py-4">
              <h3 className="flex items-center gap-2 text-lg font-black">
                <AlertTriangle className="h-5 w-5 text-[#c63d35]" />
                要介入キュー
              </h3>
            </div>
            <div className="divide-y divide-[#eef1ea]">
              {priorityQueue.map((item) => {
                const style = riskStyles[item.risk];
                return (
                  <article key={item.name} className="relative p-5">
                    <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-black text-[#17202a]">{item.name}</h4>
                        <p className="mt-1 text-xs font-bold text-slate-500">{item.school}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs font-black ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-black text-[#17202a]">{item.action}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                      <span>{item.owner}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {item.due}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#d8dee4] bg-[#fbfcf8] p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="flex items-center gap-2 text-lg font-black">
                <Route className="h-5 w-5 text-[#3346a3]" />
                出願航路
              </h3>
              <span className="rounded-md bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-[#d8dee4]">
                山田 太郎
              </span>
            </div>

            <div className="relative mt-6">
              <div className="absolute left-8 right-8 top-8 hidden h-1 bg-[#d8dee4] md:block" />
              <div className="grid gap-4 md:grid-cols-5">
                {admissionsRoute.map((step, index) => (
                  <article key={step.title} className="relative rounded-lg border border-[#d8dee4] bg-white p-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-black ${step.tone}`}>
                      {index + 1}
                    </div>
                    <p className="mt-4 text-xs font-black text-[#3346a3]">{step.day}</p>
                    <h4 className="mt-1 font-black">{step.title}</h4>
                    <p className="mt-2 text-xs font-bold text-slate-500">{step.owner}</p>
                    <p className="mt-3 rounded-md bg-[#eef1ea] px-2 py-1 text-xs font-black text-[#17202a]">
                      {step.state}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[#d8dee4] bg-white p-4">
                <p className="text-xs font-bold text-slate-500">次の面談</p>
                <p className="mt-2 text-xl font-black">7/5 20:00</p>
              </div>
              <div className="rounded-lg border border-[#d8dee4] bg-white p-4">
                <p className="text-xs font-bold text-slate-500">未解決コメント</p>
                <p className="mt-2 text-xl font-black">5件</p>
              </div>
              <div className="rounded-lg border border-[#d8dee4] bg-white p-4">
                <p className="text-xs font-bold text-slate-500">AI添削スコア</p>
                <p className="mt-2 text-xl font-black">72 / 100</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#d8dee4] bg-white">
            <div className="border-b border-[#d8dee4] px-5 py-4">
              <h3 className="text-lg font-black">生徒ポートフォリオ</h3>
            </div>
            <div className="divide-y divide-[#eef1ea]">
              {studentRows.map((student) => (
                <div key={student.name} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{student.name}</p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-black ${heatStyles[student.heat]}`}>
                      {student.progress}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-sm bg-[#eef1ea]">
                    <div className="h-full bg-[#3346a3]" style={{ width: student.progress }} />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">次: {student.next}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-[#d8dee4] bg-white">
          <div className="border-b border-[#d8dee4] px-5 py-4">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <FileText className="h-5 w-5 text-[#3346a3]" />
              提出物パイプライン
            </h3>
          </div>
          <div className="divide-y divide-[#eef1ea]">
            {documentFlow.map((doc) => {
              const Icon = doc.icon;
              return (
                <div key={doc.title} className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-[#eef1ea] p-2 text-[#3346a3]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-black">{doc.title}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{doc.student}</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#fbfcf8] px-2 py-1 text-xs font-black text-[#17202a] ring-1 ring-[#d8dee4]">
                    {doc.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-[#17202a] p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <Sparkles className="h-5 w-5 text-[#f5c04f]" />
              AI添削サマリー
            </h3>
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-black text-white/75">最新</span>
          </div>
          <p className="mt-5 text-sm leading-7 text-white/70">
            「地域医療への関心」は明確。結論の位置と、大学での研究計画の具体性を上げると面接でも使える骨子になります。
          </p>

          <div className="mt-5 space-y-4">
            {[
              ["論理性", "78%"],
              ["独自性", "68%"],
              ["表現", "82%"]
            ].map(([label, width]) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-bold text-white/70">
                  <span>{label}</span>
                  <span>{width}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-sm bg-white/10">
                  <div className="h-full bg-[#f5c04f]" style={{ width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-white p-5">
          <h3 className="flex items-center gap-2 text-lg font-black">
            <MessageSquare className="h-5 w-5 text-[#137a5b]" />
            次回面談アジェンダ
          </h3>
          <div className="mt-5 space-y-3">
            {[
              "志望理由の結論を20秒で説明",
              "活動報告書の写真と本文を照合",
              "面接で聞かれる弱点質問を1つ選ぶ"
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-[#eef1ea] bg-[#fbfcf8] p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#137a5b]" />
                <span className="text-sm font-bold leading-6">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="student-room" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-[#d8dee4] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-[#137a5b]">Student room</p>
              <h2 className="mt-1 text-2xl font-black">生徒の今日のホーム</h2>
            </div>
            <GraduationCap className="h-8 w-8 text-[#137a5b]" />
          </div>

          <div className="mt-5 rounded-lg bg-[#fbfcf8] p-4 ring-1 ring-[#d8dee4]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">山田 太郎さん</p>
              <span className="rounded-md bg-[#eef9f5] px-2 py-1 text-xs font-black text-[#0f684d]">書類作成</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-sm bg-white">
              <div className="h-full bg-[#137a5b]" style={{ width: "64%" }} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">出願準備 64%</p>
          </div>

          <div className="mt-5 space-y-3">
            {studentTasks.map((task) => (
              <div key={task.title} className="flex items-start gap-3 rounded-lg border border-[#eef1ea] p-3">
                {task.checked ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#137a5b]" />
                ) : (
                  <span className="mt-0.5 h-5 w-5 rounded-md border-2 border-[#d8dee4]" />
                )}
                <span className={`text-sm font-bold leading-6 ${task.checked ? "text-slate-400 line-through" : "text-[#17202a]"}`}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dee4] bg-[#fbfcf8] p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <BookOpen className="h-5 w-5 text-[#3346a3]" />
              対話型レッスン
            </h3>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-[#d8dee4]">
              STEP 3 / 7
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-lg border border-[#d8dee4] bg-white p-4">
              <p className="text-xs font-black text-[#3346a3]">問い</p>
              <h4 className="mt-2 text-xl font-black">その経験は、何を変えたいという意思につながったか</h4>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                事実の説明で止めず、入学後に取り組む研究テーマへつなげます。
              </p>
            </div>
            <div className="rounded-lg border border-[#d8dee4] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-500">回答メモ</p>
                <span className="text-xs font-bold text-[#137a5b]">126 / 150字</span>
              </div>
              <p className="mt-3 min-h-32 rounded-md bg-[#f7f8f4] p-4 text-sm font-medium leading-7 text-slate-700">
                地域の診療所で聞いた「通院を諦める高齢者」の声から、医療へのアクセス格差をなくしたいと考えた。大学では遠隔診療と地域交通を結ぶ仕組みを研究したい。
              </p>
              <div className="mt-4 flex items-center justify-end">
                <span className="inline-flex items-center gap-2 rounded-md bg-[#17202a] px-4 py-2 text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4" />
                  AIメンターに確認
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
