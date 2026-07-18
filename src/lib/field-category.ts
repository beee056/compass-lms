// 問題バンクの系統ラベル。
// - DBに fieldCategory が保存されている問題はその値を正とする（CSV整備済みのNotebookLM問題）
// - 未設定の問題（AI生成・旧データ）は university 欄から getFieldCategory で推定する

// 系統ラベルの許可リスト（CSV検証・管理画面の選択肢で使用）
export const FIELD_CATEGORIES = [
  "医療・保健系",
  "教育・保育系",
  "心理系",
  "文・人文系",
  "国際・社会・地域系",
  "経済・経営系",
  "法・政治・政策系",
  "芸術・デザイン系",
  "理工・自然科学系",
  "スポーツ系",
  "共通・汎用"
] as const;

export type FieldCategory = (typeof FIELD_CATEGORIES)[number];

// 系統の解決: DB値優先、なければuniversity欄から推定。
// 「共通・汎用」もフィルタ用の値としてはそのまま返す（タグ表示側で非表示にする）。
export function resolveFieldCategory(
  fieldCategory: string | null | undefined,
  university: string | null | undefined
): string | null {
  if (fieldCategory && (FIELD_CATEGORIES as readonly string[]).includes(fieldCategory)) {
    return fieldCategory;
  }
  return getFieldCategory(university);
}

// タグ（チップ・選択肢の接頭辞）として表示すべき系統。汎用ラベルはノイズになるため表示しない
export function getDisplayFieldCategory(
  fieldCategory: string | null | undefined,
  university: string | null | undefined
): string | null {
  const resolved = resolveFieldCategory(fieldCategory, university);
  return resolved === "共通・汎用" ? null : resolved;
}

const FIELD_CATEGORY_RULES: Array<{ label: string; pattern: RegExp }> = [
  // 医療を最初に判定する（法医学・獣医などが法学系・理工系に誤分類されないように）
  {
    label: "医療・保健系",
    pattern: /医|看護|歯|薬|獣|療法|臨床|放射線|栄養|保健|福祉|助産|リハビリ/
  },
  { label: "教育・保育系", pattern: /教育|保育|幼児|教員/ },
  { label: "心理系", pattern: /心理/ },
  {
    label: "文・人文系",
    pattern: /文学|哲学|倫理|宗教|言語|歴史|人文|図書館|アーカイブ|文化財|文芸/
  },
  {
    label: "国際・社会・地域系",
    pattern: /国際|外国語|開発|平和|観光|地域|社会学|メディア|ジャーナリ/
  },
  { label: "経済・経営系", pattern: /経済|経営|商学|会計|マーケ/ },
  { label: "法・政治・政策系", pattern: /法学|法律|政治|政策|公共|行政/ },
  {
    label: "芸術・デザイン系",
    pattern: /芸術|デザイン|美術|音楽|映像|舞台|ファッション|ゲーム/
  },
  {
    label: "理工・自然科学系",
    pattern: /理学|工学|情報|数理|統計|科学|気象|地球|材料|航空|音響|エネルギー|機械|理系|海事|森林|水産|農|環境|データ|建築|都市/
  },
  { label: "スポーツ系", pattern: /スポーツ|体育/ }
];

// 系統情報を含まない値（大学名だけ・汎用指示など）はタグなしにする
const NO_CATEGORY_PATTERN = /ポリシーに準ずる/;

export function getFieldCategory(university: string | null | undefined): string | null {
  const value = (university ?? "").trim();
  if (!value || NO_CATEGORY_PATTERN.test(value)) return null;
  for (const rule of FIELD_CATEGORY_RULES) {
    if (rule.pattern.test(value)) return rule.label;
  }
  return null;
}
