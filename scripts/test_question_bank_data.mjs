import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  containsInterviewCharacterLimit,
  getInterviewMainQuestion,
  hasMultipleInterviewQuestions,
  inferCharLimit
} from "../src/lib/practice-evaluation.ts";
import { detectEssayTaskTypes } from "../src/lib/essay-grading-profile.ts";

// 問題バンクCSVの実データが、演習・採点パイプラインを最後まで通ることを保証する。
// （過去に深掘り書式の不統一で面接24問が採点実行時に拒否される回帰があった）

const CSV_PATH = fileURLToPath(new URL("../data/notebooklm-practice-questions.csv", import.meta.url));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

const ALLOWED_FIELD_CATEGORIES = new Set([
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
]);

const csv = await readFile(CSV_PATH, "utf8");
const [, ...rows] = parseCsv(csv);
const questions = rows.map(([id, category, fieldCategory, title, prompt, followUpQuestions]) => ({
  id,
  category,
  fieldCategory,
  title,
  prompt,
  followUpQuestions
}));
const interviewQuestions = questions.filter((question) => question.category === "面接");
const essayQuestions = questions.filter((question) => question.category === "小論文");

test("バンクの全問題に許可リスト内の系統ラベルが付いている", () => {
  const invalid = questions
    .filter((question) => !ALLOWED_FIELD_CATEGORIES.has(question.fieldCategory))
    .map((question) => `${question.id}:${question.fieldCategory}`);

  assert.deepEqual(invalid, []);
});

test("深掘りは面接のFollowUpQuestions列だけに存在する", () => {
  const misplaced = questions
    .filter((question) => question.category !== "面接" && question.followUpQuestions?.trim())
    .map((question) => question.id);
  const embedded = interviewQuestions
    .filter((question) => /深掘り|基本質問|追加質問/.test(question.prompt))
    .map((question) => question.id);

  assert.deepEqual(misplaced, []);
  assert.deepEqual(embedded, []);
});

test("バンクの面接問題はすべて一問一答チェックを通過する", () => {
  const rejected = interviewQuestions
    .filter((question) => hasMultipleInterviewQuestions(question.prompt))
    .map((question) => question.id);

  assert.deepEqual(rejected, [], `一問一答チェックで拒否される面接問題: ${rejected.join(", ")}`);
});

test("バンクの面接問題は主質問へ深掘り・ラベルが混入しない", () => {
  const leaked = interviewQuestions
    .filter((question) => /深掘り|基本質問|追加質問/.test(getInterviewMainQuestion(question.prompt)))
    .map((question) => question.id);

  assert.deepEqual(leaked, [], `主質問に深掘り等が残る面接問題: ${leaked.join(", ")}`);
});

test("バンクの面接問題の主質問に文字数指定がない", () => {
  const withCharLimit = interviewQuestions
    .filter((question) => containsInterviewCharacterLimit(getInterviewMainQuestion(question.prompt)))
    .map((question) => question.id);

  assert.deepEqual(withCharLimit, []);
});

test("バンクの小論文問題の大半で設問類型を検出できる", () => {
  const detected = essayQuestions.filter((question) => detectEssayTaskTypes(question.prompt).length > 0);
  const coverage = detected.length / essayQuestions.length;

  assert.ok(
    coverage >= 0.85,
    `設問類型の検出率が低すぎます: ${detected.length}/${essayQuestions.length} (${Math.round(coverage * 100)}%)`
  );
});

test("バンクの小論文問題の大半で規定字数を推定できる", () => {
  const withLimit = essayQuestions.filter((question) => inferCharLimit(question.prompt) !== undefined);
  const coverage = withLimit.length / essayQuestions.length;

  assert.ok(
    coverage >= 0.9,
    `規定字数の推定率が低すぎます: ${withLimit.length}/${essayQuestions.length} (${Math.round(coverage * 100)}%)`
  );
});
