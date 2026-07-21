// 出願管理の定数・型（"use server"ではない通常モジュール。クライアント/サーバー双方から安全にimport可能）。
// ※ "use server" ファイルからは async 関数しかexportできないため、定数・型はここに置く。

export const PROGRESS_STATUSES = ["未着手", "準備中", "提出済", "選考中", "合格", "不合格", "辞退"] as const;
export const DECLINE_POLICIES = ["", "可", "不可", "専願"] as const;
export const DEADLINE_TYPES = ["", "必着", "消印有効"] as const;

export interface AdmissionInput {
  examName?: string;
  openCampusAttended?: boolean;
  applicationRequirements?: string;
  declinePolicy?: string; // "可" | "不可" | "専願" | ""
  needsMotivationLetter?: boolean;
  needsSelfRecommendation?: boolean;
  needsActivityReport?: boolean;
  otherDocuments?: string;
  applicationDeadline?: string; // "2026-09-01"
  deadlineType?: string; // "必着" | "消印有効" | ""
  mentorSubmissionDueDate?: string;
  progressStatus?: string;
  progressNote?: string;
}
