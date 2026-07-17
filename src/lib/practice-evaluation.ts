export function countCharacters(text: string): number {
  return Array.from(text).length;
}

export function inferCharLimit(promptText: string): number | undefined {
  const normalized = promptText
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replaceAll("，", ",");
  const candidates = [...normalized.matchAll(/(\d{1,3}(?:,\d{3})+|\d{2,5})\s*字(?:以内|程度|前後)?/g)]
    .map((match) => Number.parseInt(match[1].replaceAll(",", ""), 10))
    .filter((value) => value >= 50 && value <= 10_000);
  const uniqueCandidates = [...new Set(candidates)];

  return uniqueCandidates.length === 1 ? uniqueCandidates[0] : undefined;
}

export function resolveEffectiveCharLimit(
  kind: string,
  promptText: string,
  explicitCharLimit?: number
): number | undefined {
  if (kind === "面接") return undefined;
  return explicitCharLimit ?? inferCharLimit(promptText);
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

export function getLengthScoreCap(answerChars: number, charLimit?: number): number | null {
  if (!charLimit) return null;
  const ratio = Math.max(0, answerChars / charLimit);

  if (ratio < 0.5) return Math.min(35, Math.round(((ratio / 0.5) * 35) / 5) * 5);
  if (ratio < 0.8) return 40 + Math.round((((ratio - 0.5) / 0.3) * 25) / 5) * 5;
  if (ratio < 0.9) return 70 + Math.round((((ratio - 0.8) / 0.1) * 10) / 5) * 5;
  return 85 + Math.round((((Math.min(ratio, 1) - 0.9) / 0.1) * 15) / 5) * 5;
}
