export type UniversityProfileMatch = "universityName" | "prompt";

import type { EssayTaskType } from "./essay-grading-profile";

export interface ResolvedUniversityGradingProfile {
  id: "keio-sfc-essay";
  version: 1;
  label: "慶應SFC専用基準";
  matchedBy: UniversityProfileMatch;
  taskTypes: EssayTaskType[];
  sourceReferences: string[];
}

const SOURCE_REFERENCES = [
  "google-doc:1T73Sz1djBqV3XZJXUy6uNtkZLYaWbcq1ug1yuwmqCKM",
  "google-doc:1LQlVdFAfYBrlxFblde9xeppGgrThKT7y6QDICEwImzo",
  "google-drive-folder:1vm3Evp4L-vY3pNIG4d80o6h0kooci1bF",
  "google-drive-folder:1wBXlMOJt1yCY3EEu9g__M9pFUR7v1ZC3"
];

const SFC_CALIBRATION_TASK_TYPES: EssayTaskType[] = [
  "problem_discovery",
  "solution_design",
  "interdisciplinary_synthesis",
  "self_reflection"
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toLowerCase();
}

export function resolveUniversityGradingProfile(input: {
  kind: string;
  universityName?: string | null;
  promptText: string;
  taskTypes?: EssayTaskType[];
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
    taskTypes: (input.taskTypes ?? []).filter((type) => SFC_CALIBRATION_TASK_TYPES.includes(type)),
    sourceReferences: [...SOURCE_REFERENCES]
  };
}

export function buildUniversityGradingProfileContext(
  profile: ResolvedUniversityGradingProfile | null
): string {
  if (!profile) return "";

  const calibrationGuidance: string[] = [];
  if (profile.taskTypes.includes("problem_discovery")) {
    calibrationGuidance.push("- 問題発見型では、既存の枠組みを問い直す問題設定の明確さを、設問が求める範囲で確認すること。");
  }
  if (profile.taskTypes.includes("solution_design")) {
    calibrationGuidance.push("- 提案設計型では、再設計の意図、実行可能性、検証可能性を、設問が求める範囲で確認すること。");
  }
  if (profile.taskTypes.includes("interdisciplinary_synthesis")) {
    calibrationGuidance.push("- 学際統合型では、複数分野の知見が実践上どう結び付くかを、設問が求める範囲で確認すること。");
  }
  if (profile.taskTypes.includes("self_reflection")) {
    calibrationGuidance.push("- SFCでの学習・研究環境との接続を設問が明示する場合だけ、その具体性を確認すること。");
  }
  if (calibrationGuidance.length === 0) {
    calibrationGuidance.push("- この設問には追加のSFC固有評価項目を設定せず、一般化された設問類型別基準だけで評価すること。");
  }

  return `【${profile.label}】
この基準は、一般化された設問類型別精密基準へ追加する薄い校風補正である。大学名だけを理由に加点・減点せず、共通ルーブリックの点数計算も変更しないこと。
${calibrationGuidance.join("\n")}
- 歴史的なS/A/B/C評価はLv.4/Lv.3/Lv.2/Lv.1の質的目安としてのみ扱い、SFCらしい結論を強制しないこと。`;
}
