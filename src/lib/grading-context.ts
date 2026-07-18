export interface GradingReferenceCandidate {
  id: string;
  title: string;
  prompt: string;
  modelAnswer: string | null;
  university?: string | null;
}

export interface GradingReference extends GradingReferenceCandidate {
  role: "primary" | "related";
  similarity: number;
}

interface ReferenceSelectionOptions {
  questionId?: string;
  universityName?: string;
  relatedLimit?: number;
}

const TASK_SIGNALS: Array<{ key: string; pattern: RegExp }> = [
  { key: "summary", pattern: /要約|要旨|まとめ/ },
  { key: "comparison", pattern: /比較|共通点|相違点|対立する|両者|二つの視点/ },
  { key: "data", pattern: /図表|グラフ|資料|数値|データ|統計|読み取/ },
  { key: "cause", pattern: /原因|要因|背景|なぜ|分析|考察/ },
  { key: "proposal", pattern: /提案|提言|解決策|方策|役割|どうすべき|どのように|あり方/ },
  { key: "position", pattern: /賛成|反対|是非|導入すべき|あなたの考え|意見|判断/ },
  { key: "counterargument", pattern: /反論|批判|功罪|メリット|デメリット|利点|問題点|懸念/ },
  { key: "definition", pattern: /定義|意味とは|何か/ },
  { key: "experience", pattern: /経験|体験|具体的な行動|エピソード/ },
  { key: "motivation", pattern: /志望理由|志望動機|なぜ本学|入学後|将来像/ },
  { key: "policy", pattern: /アドミッション.?ポリシー|教育理念|求める人材/ },
  { key: "interview", pattern: /基本質問|深掘り質問|面接/ }
];

const METADATA_SECTION = /\n*【(?:難易度|NotebookLM参照|出典)】[\s\S]*$/u;
const INTERVIEW_FOLLOW_UP_SECTION =
  /\n*【次ターン用の深掘り候補（初回回答の必須要素ではない）】[\s\S]*?(?=\n*【採点ポイント】|$)/u;
const MIN_RELATED_SIMILARITY = 0.05;

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function createNgrams(value: string, size = 2): Set<string> {
  const normalized = normalizeText(value);
  const grams = new Set<string>();
  for (let index = 0; index <= normalized.length - size; index += 1) {
    grams.add(normalized.slice(index, index + size));
  }
  return grams;
}

function extractTaskSignals(value: string): Set<string> {
  return new Set(TASK_SIGNALS.filter((signal) => signal.pattern.test(value)).map((signal) => signal.key));
}

function overlapScore(query: Set<string>, candidate: Set<string>): number {
  if (query.size === 0 || candidate.size === 0) return 0;
  let matches = 0;
  for (const item of query) {
    if (candidate.has(item)) matches += 1;
  }
  return matches / query.size;
}

function taskScore(query: Set<string>, candidate: Set<string>): number {
  if (query.size === 0 || candidate.size === 0) return 0;
  const union = new Set([...query, ...candidate]);
  let matches = 0;
  for (const item of query) {
    if (candidate.has(item)) matches += 1;
  }
  return matches / union.size;
}

export function cleanModelAnswer(value: string): string {
  return value
    .replace(INTERVIEW_FOLLOW_UP_SECTION, "\n")
    .replace(METADATA_SECTION, "")
    .trim();
}

// UI表示用: 回答例本文から内部メタデータ（難易度・NotebookLM参照・出典）だけを取り除く
export function stripModelAnswerMetadata(value: string): string {
  return value.replace(METADATA_SECTION, "").trim();
}

export function includePrimaryReferenceCandidate(
  candidates: GradingReferenceCandidate[],
  primary?: GradingReferenceCandidate | null
): GradingReferenceCandidate[] {
  if (!primary?.modelAnswer?.trim()) return candidates;
  return [primary, ...candidates.filter((candidate) => candidate.id !== primary.id)];
}

export function computeQuestionSimilarity(
  promptText: string,
  candidate: Pick<GradingReferenceCandidate, "prompt" | "university">,
  universityName?: string
): number {
  const promptNgrams = createNgrams(promptText);
  const candidateNgrams = createNgrams(candidate.prompt);
  const promptSignals = extractTaskSignals(promptText);
  const candidateSignals = extractTaskSignals(candidate.prompt);
  const sameUniversity = Boolean(
    universityName &&
      candidate.university &&
      normalizeText(universityName) === normalizeText(candidate.university)
  );

  return (
    overlapScore(promptNgrams, candidateNgrams) * 0.6 +
    taskScore(promptSignals, candidateSignals) * 0.35 +
    (sameUniversity ? 0.05 : 0)
  );
}

export function selectGradingReferences(
  promptText: string,
  candidates: GradingReferenceCandidate[],
  options: ReferenceSelectionOptions = {}
): GradingReference[] {
  const relatedLimit = options.relatedLimit ?? 4;
  const usable = candidates.filter((candidate) => candidate.modelAnswer?.trim());
  const primary = options.questionId
    ? usable.find((candidate) => candidate.id === options.questionId)
    : undefined;

  const related = usable
    .filter((candidate) => candidate.id !== primary?.id)
    .map((candidate) => ({
      ...candidate,
      role: "related" as const,
      similarity: computeQuestionSimilarity(promptText, candidate, options.universityName)
    }))
    .sort((left, right) => right.similarity - left.similarity || left.id.localeCompare(right.id))
    .filter((candidate) => candidate.similarity >= MIN_RELATED_SIMILARITY)
    .slice(0, relatedLimit);

  return [
    ...(primary ? [{ ...primary, role: "primary" as const, similarity: 1 }] : []),
    ...related
  ];
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

export function buildGradingReferenceContext(references: GradingReference[]): string {
  if (references.length === 0) return "";

  return serializeUntrustedData(
    references.map((reference) => ({
      role: reference.role,
      title: truncate(reference.title, 100),
      prompt: truncate(reference.prompt, 1200),
      modelAnswer: truncate(cleanModelAnswer(reference.modelAnswer ?? ""), 1000)
    }))
  );
}

export function serializeUntrustedData(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  // データ内の擬似タグで境界を壊されないよう、HTML制御文字をUnicodeエスケープする。
  return serialized.replace(/[<>&]/g, (character) => {
    if (character === "<") return "\\u003c";
    if (character === ">") return "\\u003e";
    return "\\u0026";
  });
}
