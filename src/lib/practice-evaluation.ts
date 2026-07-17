export function countCharacters(text: string): number {
  return Array.from(text).length;
}

// 「以内」= 上限指定（超過は違反）、「程度・前後」= 目安指定（1割程度の超過は許容）
export type CharLimitType = "max" | "approx";

export interface CharLimitSpec {
  limit: number;
  type: CharLimitType;
}

export function inferCharLimitSpec(promptText: string): CharLimitSpec | undefined {
  const normalized = promptText
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replaceAll("，", ",");
  const candidates = [...normalized.matchAll(/(\d{1,3}(?:,\d{3})+|\d{2,5})\s*字(以内|程度|前後)?/g)]
    .map((match) => ({
      value: Number.parseInt(match[1].replaceAll(",", ""), 10),
      suffix: match[2] as string | undefined
    }))
    .filter((candidate) => candidate.value >= 50 && candidate.value <= 10_000);
  const uniqueValues = [...new Set(candidates.map((candidate) => candidate.value))];
  if (uniqueValues.length !== 1) return undefined;

  const hasApprox = candidates.some((candidate) => candidate.suffix === "程度" || candidate.suffix === "前後");
  const hasMax = candidates.some((candidate) => candidate.suffix === "以内");
  return { limit: uniqueValues[0], type: hasApprox && !hasMax ? "approx" : "max" };
}

export function inferCharLimit(promptText: string): number | undefined {
  return inferCharLimitSpec(promptText)?.limit;
}

export function resolveEffectiveCharLimitSpec(
  kind: string,
  promptText: string,
  explicitCharLimit?: number
): CharLimitSpec | undefined {
  if (kind === "面接") return undefined;
  if (explicitCharLimit) {
    const inferred = inferCharLimitSpec(promptText);
    return {
      limit: explicitCharLimit,
      type: inferred?.limit === explicitCharLimit ? inferred.type : "max"
    };
  }
  return inferCharLimitSpec(promptText);
}

export function resolveEffectiveCharLimit(
  kind: string,
  promptText: string,
  explicitCharLimit?: number
): number | undefined {
  return resolveEffectiveCharLimitSpec(kind, promptText, explicitCharLimit)?.limit;
}

export function estimateInterviewResponseSeconds(answerChars: number): number {
  return Math.max(0, Math.round((answerChars / 300) * 60));
}

export interface InterviewResponseMetrics {
  answerChars: number;
  responseCount: number;
  totalSeconds: number;
  averageSeconds: number;
}

export function getInterviewResponseMetrics(answer: string): InterviewResponseMetrics {
  const responseBlocks: string[] = [];
  let activeResponseIndex = -1;
  for (const line of answer.split(/\r?\n/)) {
    if (/^\s*Q\s*[:：]/i.test(line)) {
      activeResponseIndex = -1;
      continue;
    }
    const responseStart = line.match(/^\s*A\s*[:：]\s*(.*)$/i);
    if (responseStart) {
      responseBlocks.push(responseStart[1]);
      activeResponseIndex = responseBlocks.length - 1;
      continue;
    }
    if (activeResponseIndex >= 0) {
      responseBlocks[activeResponseIndex] += `${responseBlocks[activeResponseIndex] ? "\n" : ""}${line}`;
    }
  }

  const spokenAnswer = responseBlocks.length > 0 ? responseBlocks.join("\n") : answer;
  const answerChars = countCharacters(spokenAnswer);
  const responseCount = answer.trim() ? Math.max(1, responseBlocks.length) : 0;
  const totalSeconds = estimateInterviewResponseSeconds(answerChars);

  return {
    answerChars,
    responseCount,
    totalSeconds,
    averageSeconds: responseCount > 0 ? Math.round(totalSeconds / responseCount) : 0
  };
}

export function containsInterviewCharacterLimit(promptText: string): boolean {
  const normalized = promptText.replace(/[０-９]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0)
  );
  const countExpression = "(?:\\d{1,5}|[〇零一二三四五六七八九十百千万]+)";
  return (
    new RegExp(`${countExpression}\\s*(?:文)?字`).test(normalized) ||
    new RegExp(`(?:文字数|字数).{0,8}${countExpression}`).test(normalized) ||
    /(?:文字|字)(?:以内|程度|前後)/.test(normalized)
  );
}

// 問題バンクの実データに存在する深掘り表記のゆれをすべて検出する:
//   「（深掘り：…）」「深掘り：」「【深掘り質問】」「 深掘り質問：」「追加質問：」等
const FOLLOW_UP_MARKER = /[（(【]?\s*(?:深掘り(?:質問)?|追加質問)\s*(?:】|[:：])/;

// 深掘り部分の切り落としで括弧の対応が崩れた場合の掃除
function cleanDanglingBrackets(text: string): string {
  let cleaned = text.trim();
  const openCount = (cleaned.match(/「/g) ?? []).length;
  const closeCount = (cleaned.match(/」/g) ?? []).length;
  if (cleaned.startsWith("「") && openCount > closeCount) cleaned = cleaned.slice(1).trim();
  if (cleaned.endsWith("「")) cleaned = cleaned.slice(0, -1).trim();
  return cleaned;
}

function getInterviewMainQuestionBlock(promptText: string): string {
  const normalized = promptText.trim();
  const followUpStart = normalized.search(FOLLOW_UP_MARKER);
  const withoutBundledFollowUp = followUpStart >= 0 ? normalized.slice(0, followUpStart).trim() : normalized;
  const mainLines: string[] = [];
  for (const line of withoutBundledFollowUp.split(/\r?\n/)) {
    const trimmedLine = line
      .trim()
      .replace(/^【?基本質問】?\s*[:：]?\s*/, "")
      .trim();
    if (/^(?:深掘り(?:質問)?|追加質問)\s*[:：]/.test(trimmedLine)) break;
    if (trimmedLine) mainLines.push(trimmedLine);
  }
  return cleanDanglingBrackets(
    (mainLines.length > 0 ? mainLines : [withoutBundledFollowUp]).join("\n").trim()
  );
}

export function getInterviewMainQuestion(promptText: string): string {
  return getInterviewMainQuestionBlock(promptText)
    .split(/\r?\n/)
    .map((line) => line.replace(/^Q\s*[:：]\s*/i, ""))
    .join("\n")
    .trim();
}

// 直前の質問への補足・言い換え・理由の追加要求（「また、その理由も教えてください」等）。
// 面接では1つの主質問に自然に付随する表現であり、独立した追加質問として数えない。
const CONTINUATION_MARKER =
  /^(?:また|その|それ|そこで|さらに|あわせて|併せて|加えて|もし|どの|どんな)|そのように|その際|その時/;
const ELABORATION_REQUEST =
  /(?:理由|考え方|根拠|きっかけ|背景|経緯)(?:も|は|を|とともに|と共に|を含め|も含め).{0,12}(?:何|教え|述べ|説明|答え)|具体(?:的|例)?.{0,12}(?:交え|挙げ|踏まえ)|(?:結びつけ|結び付け|関連づけ|関連付け|踏まえ|交え)て?.{0,8}(?:説明|教え|述べ|答え)/;

export function hasMultipleInterviewQuestions(promptText: string): boolean {
  const mainQuestionBlock = getInterviewMainQuestionBlock(promptText);
  const labeledQuestionCount = (mainQuestionBlock.match(/^\s*Q\s*[:：]/gim) ?? []).length;
  if (labeledQuestionCount > 1) return true;

  const sentences = mainQuestionBlock
    .replace(/([。？！?!])/g, "$1\n")
    .split(/\r?\n/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  let independentQuestionCount = 0;
  for (const sentence of sentences) {
    const isQuestionSentence =
      /[?？]\s*[」）)]*$/.test(sentence) ||
      /(?:教えてください|述べてください|説明してください|答えてください|話してください|述べよ|説明せよ|ですか|ますか)\s*[。」）)]*$/.test(sentence);
    if (!isQuestionSentence) continue;
    const isContinuation =
      independentQuestionCount > 0 &&
      (CONTINUATION_MARKER.test(sentence) || ELABORATION_REQUEST.test(sentence));
    if (!isContinuation) independentQuestionCount += 1;
  }
  return independentQuestionCount > 1;
}

export function getLengthScoreCap(
  answerChars: number,
  charLimit?: number,
  limitType: CharLimitType = "max"
): number | null {
  if (!charLimit) return null;
  const ratio = Math.max(0, answerChars / charLimit);

  // 字数超過: 「以内」指定は超過した時点で違反、「程度・前後」指定は1割までの超過を許容する。
  const overflowTolerance = limitType === "approx" ? 1.1 : 1;
  if (ratio > overflowTolerance) {
    return ratio <= overflowTolerance + 0.1 ? 65 : 35;
  }

  const effectiveRatio = Math.min(ratio, 1);
  if (effectiveRatio < 0.5) return Math.min(35, Math.round(((effectiveRatio / 0.5) * 35) / 5) * 5);
  if (effectiveRatio < 0.8) return 40 + Math.round((((effectiveRatio - 0.5) / 0.3) * 25) / 5) * 5;
  if (effectiveRatio < 0.9) return 70 + Math.round((((effectiveRatio - 0.8) / 0.1) * 10) / 5) * 5;
  return 85 + Math.round((((effectiveRatio - 0.9) / 0.1) * 15) / 5) * 5;
}
