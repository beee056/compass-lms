interface StructuredPracticeFeedback {
  version: number;
  universityName?: string | null;
  essayProfile?: {
    id: string;
    version: number;
    label: string;
    taskTypes: string[];
  } | null;
  universityProfile?: {
    id: string;
    version: number;
    label: string;
    matchedBy: string;
    taskTypes: string[];
  } | null;
  overallFeedback?: string;
  axes: Array<{
    key: string;
    label: string;
    group: string;
    aiEvaluable?: boolean;
    // v5以降: 設問依存軸の適用可否（false = 設問が求めていないため評価対象外）
    applicable?: boolean | null;
    score?: number | null;
    level: number | null;
    levelLabel?: string | null;
    comment?: string | null;
  }>;
  deductions?: Array<{ severity: string; item: string; detail: string }> | null;
  checklist?: Array<{ coverage: string; category: string; comment: string }> | null;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
}

export function isStructuredPracticeFeedback(value: unknown): value is StructuredPracticeFeedback {
  if (!value || typeof value !== "object") return false;
  const feedback = value as { version?: unknown; axes?: unknown };
  return (
    typeof feedback.version === "number" &&
    feedback.version >= 2 &&
    Array.isArray(feedback.axes)
  );
}
