export type EssayTaskType =
  | "source_analysis"
  | "summarization"
  | "opinion_position"
  | "comparative_argumentation"
  | "causal_analysis"
  | "problem_discovery"
  | "solution_design"
  | "quantitative_estimation"
  | "interdisciplinary_synthesis"
  | "self_reflection";

export interface ResolvedEssayGradingProfile {
  id: "advanced-essay-analysis";
  version: 1;
  label: "設問類型別精密基準";
  taskTypes: EssayTaskType[];
  sourceReferences: string[];
}

const SOURCE_REFERENCES = [
  "google-doc:1T73Sz1djBqV3XZJXUy6uNtkZLYaWbcq1ug1yuwmqCKM",
  "google-doc:1LQlVdFAfYBrlxFblde9xeppGgrThKT7y6QDICEwImzo",
  "google-drive-folder:1vm3Evp4L-vY3pNIG4d80o6h0kooci1bF",
  "google-drive-folder:1wBXlMOJt1yCY3EEu9g__M9pFUR7v1ZC3",
  "google-sheet:1Puc4Yvrcfr7A7t-_trIb4bxyEdLrlfIoj9wUU_PZAZI"
];

const TASK_TYPE_PATTERNS: Array<[EssayTaskType, RegExp]> = [
  [
    "source_analysis",
    /(?:(?:提示された|次の|以下の).{0,8}(?:資料|文献|課題文|文章|図表|グラフ|写真|地図)|(?:資料|文献|課題文|図表|グラフ|写真|地図)(?:を|から|に基づ|に即し|によれば).{0,12}(?:読み取|分析|解釈|引用|比較|参照|踏まえ)|(?:読み取|分析|解釈|引用|比較|参照|踏まえ).{0,12}(?:資料|文献|課題文|図表|グラフ|写真|地図))/
  ],
  [
    "summarization",
    /要約(?:しなさい|せよ|してください|した上|し、|して)|要旨を(?:まとめ|示し|述べ)|(?:内容|論旨|主張|議論)を.{0,6}(?:まとめなさい|まとめよ|まとめた上|整理し)/
  ],
  [
    "opinion_position",
    /(?:賛成|反対)(?:か[、。]|かどうか|ですか|の(?:立場|理由))|賛否(?:両論)?(?:を|について|も含めて?).{0,8}(?:論じ|述べ|検討|明らか|問う)|是非(?:を|について).{0,8}(?:論じ|述べ|検討|問|明らか)|[ぁ-ん]べきか|べきではないか|あなたの(?:考え|意見|見解|立場)を.{0,20}(?:述べ|論じ|示し|書き)|(?:考え|意見)を.{0,20}(?:述べなさい|述べよ|論じなさい|論じよ|記述し)|どう考えるか|どのように考えるか|(?:は|とは)何か[、。]?.{0,12}(?:論じ|述べ|記述し)|功罪(?:を|について).{0,8}(?:整理|論じ|評価|検討|述べ)/
  ],
  [
    "comparative_argumentation",
    /比較(?:しなさい|せよ|してください|し、|して|した上)|(?:共通点|相違点|異同).{0,12}(?:挙げ|示し|明らか|論じ|比較)|対照(?:しなさい|せよ|して)|関係を論じ/
  ],
  [
    "causal_analysis",
    /(?:原因|要因|因果関係)(?:を|について).{0,8}(?:分析|考察|説明|明らか|挙げ)|なぜ.{0,12}(?:生じ|起こ|発生)/
  ],
  [
    "problem_discovery",
    /(?:問題|課題|論点).{0,12}(?:発見|定義|特定|設定|抽出|明らか|挙げ|示し)|(?:問題|課題|論点)(?:を|について).{0,8}(?:論じ|考察し|指摘し)|(?:発見|定義|特定|設定|抽出).{0,12}(?:問題|課題|論点)|問題点|課題点|本質的な(?:問題|課題)/
  ],
  [
    "solution_design",
    /(?:解決策|改善策|対応策|方策|施策|対策|アイデア|仕組み).{0,12}(?:提案|設計|考案|提示|示し|述べ|論じ)|(?:提案|設計|考案|提示).{0,12}(?:方策|施策|対策|アイデア|仕組み)|提案(?:しなさい|せよ|してください|し、|して)|どのように.{0,12}(?:解決|改善)|(?:果たすべき|担うべき)?(?:役割|あり方)(?:を|について).{0,15}(?:論じ|述べ|考察|検討|提案|示し)/
  ],
  [
    "quantitative_estimation",
    /(?:推定|概算|算出|計算)(?:しなさい|せよ|してください)|(?:値|量|数量|人数|割合|費用|確率|規模|件数).{0,12}(?:推定|概算|算出|計算)/
  ],
  [
    "interdisciplinary_synthesis",
    /(?:複数|二つ以上|異なる).{0,8}(?:分野|領域).{0,12}(?:統合|組み合わせ|横断|用い)|(?:学際的|文理融合).{0,8}(?:視点|観点|方法).{0,12}(?:論じ|考察|分析|提案|用い)/
  ],
  [
    "self_reflection",
    /あなた自身.{0,12}(?:経験|判断|行動|活動|学び|成長|価値観)|自分の.{0,12}(?:経験|判断|行動|活動|学び|成長|価値観)|自身の.{0,12}(?:経験|判断|行動|活動|学び|成長|価値観)|経験を踏まえ|志望理由/
  ]
];

const TASK_TYPE_GUIDANCE: Record<EssayTaskType, string> = {
  source_analysis:
    "資料分析型: 資料の正確な解釈、資料間の関係、主張への活用を区別して評価する。要約だけで終わる答案は、論証として高評価にしない。資料本文が提示されていない場合は、資料内容の正誤を推測して評価しない。",
  summarization:
    "要約型: 課題文の論旨を、本人の意見を混ぜずに正確かつ網羅的に圧縮できているかを評価する。課題文本文が提示されていない場合は、要約内容の正誤を推測して評価しない。",
  opinion_position:
    "意見論述型: 立場・判断の明確さ、判断基準、根拠の質、想定反論への応答、結論までの一貫性を評価する。両論併記だけで自分の判断を下していない答案や、設問の要求と無関係な一般論は高評価にしない。",
  comparative_argumentation:
    "比較論証型: 比較軸を明示し、対象を同じ基準で扱い、共通点と相違点を主張や判断へ接続できているかを評価する。単なる特徴の並列で終わる答案は高評価にしない。",
  causal_analysis:
    "原因分析型: 単一原因への短絡を避け、直接要因、背景条件、相互作用、反証可能性を設問が求める範囲で評価する。原因の列挙だけで因果関係を説明したとは扱わない。",
  problem_discovery:
    "問題発見型: 現象の列挙ではなく、当事者、原因、構造、影響範囲を踏まえた問題定義を評価する。設問が問題を一つ求める場合は焦点の一貫性も確認する。",
  solution_design:
    "提案設計型: 提案の目的、実行主体、手順、制約、想定反論、効果の検証方法を、設問が求める範囲で評価する。独創性だけで実現可能性の不足を補わない。",
  quantitative_estimation:
    "数量推定型: 前提、分解方法、単位、計算過程、桁の妥当性、結論との接続を評価する。推定値そのものより、再現可能な推論を重視する。",
  interdisciplinary_synthesis:
    "学際統合型: 複数分野の用語の列挙ではなく、各視点が原因分析や提案の因果関係へどう寄与するかを評価する。",
  self_reflection:
    "自己省察型: 経験の派手さではなく、事実、本人の判断、行動、結果、解釈の変化が区別され、現在の主張へ接続しているかを評価する。"
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function detectEssayTaskTypes(promptText: string): EssayTaskType[] {
  const normalizedPrompt = normalize(promptText);
  return TASK_TYPE_PATTERNS.filter(([, pattern]) => pattern.test(normalizedPrompt)).map(([type]) => type);
}

export function resolveEssayGradingProfile(input: {
  kind: string;
  promptText: string;
}): ResolvedEssayGradingProfile | null {
  if (input.kind !== "小論文") return null;

  return {
    id: "advanced-essay-analysis",
    version: 1,
    label: "設問類型別精密基準",
    taskTypes: detectEssayTaskTypes(input.promptText),
    sourceReferences: [...SOURCE_REFERENCES]
  };
}

export function buildEssayGradingProfileContext(profile: ResolvedEssayGradingProfile | null): string {
  if (!profile) return "";

  const taskGuidance = profile.taskTypes.length > 0
    ? profile.taskTypes.map((type) => `- ${TASK_TYPE_GUIDANCE[type]}`).join("\n")
    : "- 汎用論述型: 主張、根拠、論理的接続、反論への応答、結論の一貫性を評価する。";

  return `【${profile.label}】
この基準は、複数大学・複数設問のPrompt、ModelAnswer、採点基準から共通原理を抽出した設問適応型の補助基準である。共通ルーブリックの点数計算は変更しないこと。
- 設問本文から要求要素を先に確定し、明示的・合理的に含意された要求だけを評価すること。
- 検出されていない類型の要素や、設問が要求していない要素の不足を減点しないこと。
- 模範解答は要求水準と論証例の参考であり、内容を唯一の正解としないこと。
- 同じ長所や欠点を複数軸で重複評価せず、答案にない事実や根拠を補完しないこと。
- 特定年度の配点を推測せず、「1点」など根拠のない点数表記をtaskAnalysisへ含めないこと。
${taskGuidance}
検出した設問類型: ${profile.taskTypes.length > 0 ? profile.taskTypes.join(", ") : "general_argumentation"}`;
}
