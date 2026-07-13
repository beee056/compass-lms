// 日本時間(JST)基準の日付ユーティリティ。
// Vercelの実行環境はUTCのため、サーバー側で new Date().setHours(...) 等を使うと
// JSTと最大9時間ズレる。締切の保存・D-day表示・期限判定はすべてこの関数群を通す。

const JST_TZ = "Asia/Tokyo";

// "YYYY-MM-DD"(<input type="date">の値)を JST のその日の終わり(23:59:59.999)として解釈する
export function endOfDayJST(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59.999+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "YYYY-MM-DD" を JST のその日の始まり(00:00:00)として解釈する
export function startOfDayJST(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00.000+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 任意の日時の「JSTでの年月日」を取り出す
function jstYMD(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  const [y, m, d] = parts.split("-").map(Number);
  return { y, m, d };
}

// 今日(JST)から見た、対象日(JST)までの日数差。今日=0 / 明日=1 / 昨日=-1
export function daysUntilJST(value: Date | string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const target = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;

  const t = jstYMD(target);
  const n = jstYMD(new Date());
  const targetUtc = Date.UTC(t.y, t.m - 1, t.d);
  const todayUtc = Date.UTC(n.y, n.m - 1, n.d);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

// 「今日(JST)の始まり」をUTC instantとして返す（DBの lt 比較用）
export function startOfTodayJST(): Date {
  const n = jstYMD(new Date());
  const mm = String(n.m).padStart(2, "0");
  const dd = String(n.d).padStart(2, "0");
  return new Date(`${n.y}-${mm}-${dd}T00:00:00.000+09:00`);
}

// D-day 相対表示ラベル（JST基準）
export function relativeDueLabelJST(value: Date | string | null | undefined): string {
  const days = daysUntilJST(value);
  if (!Number.isFinite(days)) return "期限なし";
  if (days < 0) return `${Math.abs(days)}日超過`;
  if (days === 0) return "今日";
  if (days === 1) return "明日";
  return `${days}日後`;
}

// JSTでの日付表示（例: 7/20）
export function formatDateJST(value: Date | string | null | undefined): string {
  if (!value) return "期限なし";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "期限なし";
  return date.toLocaleDateString("ja-JP", { timeZone: JST_TZ, month: "numeric", day: "numeric" });
}
