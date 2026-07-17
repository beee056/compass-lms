export type UniversityProfileMatch = "universityName" | "prompt";

export type SfcTaskType =
  | "source_analysis"
  | "problem_discovery"
  | "solution_design"
  | "quantitative_estimation"
  | "interdisciplinary_synthesis"
  | "metacognition_education";

export interface ResolvedUniversityGradingProfile {
  id: "keio-sfc-essay";
  version: 1;
  label: "慶應SFC専用基準";
  matchedBy: UniversityProfileMatch;
  taskTypes: SfcTaskType[];
  sourceReferences: string[];
}

const SOURCE_REFERENCES = [
  "trend-analysis-2010-2024",
  "rubric-analysis-2013-2023",
  "sfc-strategy-guide",
  "sample-answer-2021"
];

const TASK_TYPE_PATTERNS: Array<[SfcTaskType, RegExp]> = [
  ["source_analysis", /資料|文献|図表|グラフ|写真|地図|読み取|比較|通底|関連/],
  ["problem_discovery", /問題|課題|発見|定義|名(?:前|称)|本質|原因/],
  ["solution_design", /提案|解決|方策|アイデア|設計|デザイン|図示|仕組み|計画|実行/],
  ["quantitative_estimation", /推定|概算|フェルミ|算出|数量|数値|計算/],
  ["interdisciplinary_synthesis", /学際|複数.{0,8}分野|技術.{0,12}社会|社会.{0,12}技術|文理|統合/],
  ["metacognition_education", /SFC|大学|教育|カリキュラム|学び|研究|自己/]
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toLowerCase();
}

function detectTaskTypes(promptText: string): SfcTaskType[] {
  return TASK_TYPE_PATTERNS.filter(([, pattern]) => pattern.test(promptText)).map(([type]) => type);
}

export function resolveUniversityGradingProfile(input: {
  kind: string;
  universityName?: string | null;
  promptText: string;
}): ResolvedUniversityGradingProfile | null {
  if (input.kind !== "小論文") return null;

  const universityName = normalize(input.universityName);
  const promptText = normalize(input.promptText);
  const universityMatch =
    /\bsfc\b/i.test(universityName) ||
    /(?:慶應|慶応|keio).{0,20}(?:総合政策|環境情報|湘南藤沢)/i.test(universityName) ||
    /(?:総合政策|環境情報|湘南藤沢).{0,20}(?:慶應|慶応|keio)/i.test(universityName);
  const promptMatch =
    /\bsfc\b/i.test(promptText) ||
    /(?:慶應|慶応|keio).{0,24}(?:総合政策|環境情報|湘南藤沢)/i.test(promptText) ||
    /(?:総合政策|環境情報|湘南藤沢).{0,24}(?:慶應|慶応|keio)/i.test(promptText);

  if (!universityMatch && !promptMatch) return null;

  return {
    id: "keio-sfc-essay",
    version: 1,
    label: "慶應SFC専用基準",
    matchedBy: universityMatch ? "universityName" : "prompt",
    taskTypes: detectTaskTypes(promptText),
    sourceReferences: [...SOURCE_REFERENCES]
  };
}

export function buildUniversityGradingProfileContext(
  profile: ResolvedUniversityGradingProfile | null
): string {
  if (!profile) return "";

  return `【${profile.label}】
この基準は、慶應SFCの過去問分析・採点基準・解答例から一般化した補助基準である。過去問の特定年度の配点を推測せず、共通ルーブリックの点数計算は変更しないこと。
- 最優先は設問への忠実な応答である。設問が要求していないSFC固有要素の不足を減点しないこと。
- 資料がある設問では、資料の正確な解釈、資料間の関係、答案の主張への活用を評価すること。資料の要約だけで終わる場合は高評価にしないこと。
- 問題発見型では、現象の列挙ではなく、当事者・原因・構造を踏まえた問題定義を評価すること。
- 提案型では、独創性だけでなく、実行主体、手順、制約、効果の検証方法まで設問が求める範囲で評価すること。
- 学際的統合は、複数分野の語を並べることではなく、各視点が分析や提案の因果関係にどう寄与するかを評価すること。
- 推定・数量化・図示が求められる場合は、前提の明示、計算や表現の一貫性、結論との接続を評価すること。
- 独自性は奇抜さではなく、根拠のある再定義・視点・具体化として評価すること。
- 歴史的なS/A/B/C評価はLv.4/Lv.3/Lv.2/Lv.1の質的目安としてのみ扱い、模範解答を唯一の正解にしないこと。
検出した設問類型: ${profile.taskTypes.length > 0 ? profile.taskTypes.join(", ") : "汎用SFC小論文"}`;
}
