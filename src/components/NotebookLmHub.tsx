import { ArrowUpRight, BookOpenCheck, FilePenLine, MessageSquareText, SearchCheck } from "lucide-react";

const focusAreas = [
  {
    title: "志望理由書",
    description: "自己分析から大学との接点まで、根拠をつないで文章を組み立てます。",
    icon: FilePenLine,
    accent: "text-[#3346a3]",
    surface: "bg-[#eef1ff]",
  },
  {
    title: "小論文",
    description: "構成の型、頻出テーマ、答案例を横断して論点を深めます。",
    icon: SearchCheck,
    accent: "text-[#137a5b]",
    surface: "bg-[#eaf7f1]",
  },
  {
    title: "面接",
    description: "想定質問と回答の組み立て方を確認し、自分の言葉へ整えます。",
    icon: MessageSquareText,
    accent: "text-[#a36200]",
    surface: "bg-[#fff6df]",
  },
] as const;

export default function NotebookLmHub({ notebookUrl }: { notebookUrl: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-lg border border-[#17202a] bg-[#17202a] text-white shadow-sm">
        <div className="grid h-1.5 grid-cols-4" aria-hidden="true">
          <span className="bg-[#3346a3]" />
          <span className="bg-[#137a5b]" />
          <span className="bg-[#d89b16]" />
          <span className="bg-[#c94d43]" />
        </div>

        <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9eabff]">
              Scholar Compass Knowledge Base
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
              教材はNotebookLMに集約しています
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300 md:text-base">
              志望理由書・小論文・面接の資料を横断して探し、出典を確かめながら質問できます。
              教材の追加や更新も同じノートブックへ反映されます。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {focusAreas.map((area) => (
                <span key={area.title} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
                  {area.title}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
            <BookOpenCheck className="h-7 w-7 text-[#9eabff]" />
            <p className="mt-4 text-sm font-black">総合型選抜 教材ノート</p>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
              閲覧にはGoogleアカウントが必要です。権限がない場合は、開いた画面からアクセスをリクエストしてください。
            </p>
            <a
              href={notebookUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#17202a] transition-colors hover:bg-[#eef1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9eabff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17202a]"
            >
              NotebookLMで教材を開く
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="material-focus-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#3346a3]">Focus areas</p>
            <h2 id="material-focus-heading" className="mt-1 text-2xl font-black text-[#17202a]">目的から教材を探す</h2>
          </div>
          <p className="hidden text-xs font-bold text-slate-500 sm:block">NotebookLM内でキーワードを入力して質問</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {focusAreas.map((area) => (
            <article key={area.title} className="rounded-lg border border-[#d8dee4] bg-white p-5 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${area.surface} ${area.accent}`}>
                <area.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-black text-[#17202a]">{area.title}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#d8dee4] bg-white p-5 md:p-6" aria-labelledby="material-flow-heading">
        <h2 id="material-flow-heading" className="text-lg font-black text-[#17202a]">学習の流れ</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["1", "NotebookLMで確認", "教材を読み、出典付きで疑問を解消する"],
            ["2", "自分の言葉で整理", "志望理由や答案の骨組みを作る"],
            ["3", "Compassで実践", "タスク・提出物・AI添削へつなげる"],
          ].map(([number, title, description]) => (
            <li key={number} className="flex gap-3 rounded-md bg-[#fbfcf8] p-4 ring-1 ring-[#e3e7e0]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3346a3] text-xs font-black text-white">
                {number}
              </span>
              <div>
                <p className="text-sm font-black text-[#17202a]">{title}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
