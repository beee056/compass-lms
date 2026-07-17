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

export function getLengthLevelCap(answerChars: number, charLimit?: number): number | null {
  if (!charLimit) return null;
  const ratio = answerChars / charLimit;
  if (ratio < 0.5) return 1;
  if (ratio < 0.8) return 2;
  if (ratio < 0.9) return 3;
  return 4;
}
