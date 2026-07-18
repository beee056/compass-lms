// 演習スコアの推移カード（種別ごと）。フックなしの純粋コンポーネントで、
// 生徒ページ（クライアント）と保護者ページ（サーバー）の両方から使う。
// 深掘りターン（parentRecordIdあり）は呼び出し側で除外して渡すこと。

interface TrendRecord {
  type: string;
  score: number | null;
  createdAt: string | Date;
}

const KINDS = ["小論文", "志望理由書", "面接"] as const;
const MAX_POINTS = 12;

function Sparkline({ scores }: { scores: number[] }) {
  const width = 120;
  const height = 36;
  const points = scores.map((score, index) => {
    const x = scores.length === 1 ? width / 2 : (index / (scores.length - 1)) * (width - 8) + 4;
    const y = height - 4 - (Math.min(100, Math.max(0, score)) / 100) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full" aria-hidden="true">
      <line x1="0" y1={height - 4} x2={width} y2={height - 4} stroke="#e2e8f0" strokeWidth="1" />
      {scores.length > 1 && (
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#3346a3"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {points.map((point, index) => {
        const [x, y] = point.split(",");
        const isLast = index === points.length - 1;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={isLast ? 3 : 2}
            fill={isLast ? "#3346a3" : "#94a3b8"}
          />
        );
      })}
    </svg>
  );
}

export default function PracticeScoreTrend({ records }: { records: TrendRecord[] }) {
  const series = KINDS.map((kind) => {
    const scores = records
      .filter((record) => record.type === kind && typeof record.score === "number")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((record) => record.score as number);
    return { kind, scores };
  }).filter((entry) => entry.scores.length > 0);

  if (series.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {series.map(({ kind, scores }) => {
        const recent = scores.slice(-MAX_POINTS);
        const latest = scores[scores.length - 1];
        const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        const first = scores[0];
        const delta = scores.length > 1 ? latest - first : null;
        return (
          <div key={kind} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-500">{kind}</span>
              <span className="text-xs font-semibold text-slate-400">{scores.length}回</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{latest}</span>
              <span className="text-xs font-bold text-slate-400">点（最新） / 平均{average}点</span>
              {delta !== null && delta !== 0 && (
                <span className={`text-xs font-black ${delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </div>
            <div className="mt-2">
              <Sparkline scores={recent} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
