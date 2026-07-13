// ルート遷移中に表示する共通スケルトン。
// Next.js App Router の loading.tsx から使う。

export default function LoadingScreen({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="w-full animate-in fade-in duration-300" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>

      {/* ヘッダー帯 */}
      <div className="mb-8 h-24 rounded-lg border border-border bg-white/60 animate-pulse" />

      {/* メトリクス4枚 */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-white/60 animate-pulse" />
        ))}
      </div>

      {/* 本文2カラム */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-white/60 animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg border border-border bg-white/60 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
