import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_CSV_PATH = "data/notebooklm-practice-questions.csv";
const EXPECTED_QUESTION_COUNT = 300;
const EXPECTED_CATEGORY_COUNT = 100;
const ALLOWED_CATEGORIES = new Set(["小論文", "志望理由書", "面接"]);

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

  if (quoted) {
    throw new Error("CSV内に閉じられていない引用符があります。");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function questionId(externalId) {
  return `notebooklm_${externalId.toLowerCase()}`;
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

function normalizeQuestions(rows) {
  const [headers, ...dataRows] = rows;
  const expectedHeaders = [
    "QuestionId",
    "Category",
    "FieldCategory",
    "Title",
    "Prompt",
    "FollowUpQuestions",
    "ModelAnswer",
    "University",
    "Difficulty",
    "Reference",
    "Source"
  ];

  if (
    !headers ||
    headers.length !== expectedHeaders.length ||
    expectedHeaders.some((header, index) => headers[index] !== header)
  ) {
    throw new Error(`CSVヘッダーが不正です。期待値: ${expectedHeaders.join(", ")}`);
  }

  if (dataRows.length !== EXPECTED_QUESTION_COUNT) {
    throw new Error(
      `CSVの問題数が不正です。期待値: ${EXPECTED_QUESTION_COUNT}件 / 実際: ${dataRows.length}件`
    );
  }

  return dataRows.map((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== expectedHeaders.length) {
      throw new Error(
        `CSV ${rowNumber}行目の列数が不正です。期待値: ${expectedHeaders.length}列 / 実際: ${values.length}列`
      );
    }

    const [
      externalId,
      category,
      fieldCategory,
      title,
      prompt,
      followUpQuestions,
      modelAnswer,
      university,
      difficulty,
      reference,
      sourceName
    ] = values;

    if (!/^NLM-\d{3}$/.test(externalId)) {
      throw new Error(`CSV ${rowNumber}行目: QuestionId「${externalId}」が不正です。`);
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      throw new Error(`CSV ${rowNumber}行目: 未対応カテゴリ「${category}」です。`);
    }
    if (!ALLOWED_FIELD_CATEGORIES.has(fieldCategory?.trim())) {
      throw new Error(`CSV ${rowNumber}行目: 未対応の系統「${fieldCategory}」です。`);
    }
    if (!title?.trim() || !prompt?.trim()) {
      throw new Error(`CSV ${rowNumber}行目: TitleまたはPromptが空です。`);
    }
    if (category !== "面接" && followUpQuestions?.trim()) {
      throw new Error(`CSV ${rowNumber}行目: FollowUpQuestionsは面接のみ使用できます。`);
    }
    if (
      !modelAnswer?.trim() ||
      !difficulty?.trim() ||
      !reference?.trim() ||
      !sourceName?.trim()
    ) {
      throw new Error(
        `CSV ${rowNumber}行目: ModelAnswer、Difficulty、Reference、Sourceは必須です。`
      );
    }

    // 深掘りは「 | 」区切り → DBでは1行1問で保存
    const followUps = (followUpQuestions ?? "")
      .split("|")
      .map((question) => question.trim())
      .filter(Boolean)
      .join("\n");

    return {
      id: questionId(externalId),
      tenantId: null,
      category,
      fieldCategory: fieldCategory.trim(),
      title: title.trim(),
      prompt: prompt.trim(),
      followUpQuestions: followUps || null,
      source: "NOTEBOOKLM",
      status: "ACTIVE",
      university: university?.trim() || null,
      difficulty: difficulty.trim(),
      // 難易度・参照・出典はUIに出さないためmodelAnswer本文へは連結しない
      modelAnswer: modelAnswer.trim() || null
    };
  });
}

const csvPath = resolve(process.argv[2] || DEFAULT_CSV_PATH);
const csv = await readFile(csvPath, "utf8");
const questions = normalizeQuestions(parseCsv(csv));
const uniqueIds = new Set(questions.map((question) => question.id));
const uniqueTitles = new Set(questions.map((question) => question.title));
const uniquePrompts = new Set(questions.map((question) => question.prompt));
const expectedIds = new Set(
  Array.from({ length: EXPECTED_QUESTION_COUNT }, (_, index) =>
    questionId(`NLM-${String(index + 1).padStart(3, "0")}`)
  )
);

if (
  uniqueIds.size !== questions.length ||
  uniqueIds.size !== expectedIds.size ||
  [...expectedIds].some((id) => !uniqueIds.has(id))
) {
  throw new Error(
    `QuestionIdはNLM-001からNLM-${String(EXPECTED_QUESTION_COUNT).padStart(3, "0")}までの連番かつ一意である必要があります。`
  );
}

if (uniqueTitles.size !== questions.length) {
  throw new Error("CSV内にTitleの重複があります。");
}

if (uniquePrompts.size !== questions.length) {
  throw new Error("CSV内にPromptの重複があります。");
}

const categoryCounts = questions.reduce((counts, question) => {
  counts[question.category] = (counts[question.category] || 0) + 1;
  return counts;
}, {});

if ([...ALLOWED_CATEGORIES].some((category) => categoryCounts[category] !== EXPECTED_CATEGORY_COUNT)) {
  throw new Error(
    `各カテゴリは${EXPECTED_CATEGORY_COUNT}件である必要があります。実際: ${Object.entries(categoryCounts)
      .map(([category, count]) => `${category} ${count}件`)
      .join(" / ")}`
  );
}

const prisma = new PrismaClient();

async function syncQuestions() {
  await prisma.$transaction(async (tx) => {
    const conflictingQuestions = await tx.questionBank.findMany({
      where: {
        id: { in: [...uniqueIds] },
        OR: [{ source: { not: "NOTEBOOKLM" } }, { tenantId: { not: null } }]
      },
      select: { id: true, source: true, tenantId: true }
    });

    if (conflictingQuestions.length > 0) {
      throw new Error(
        `NotebookLM以外の問題とQuestionIdが衝突しています: ${conflictingQuestions
          .map(({ id, source, tenantId }) => `${id} (${source}, tenantId=${tenantId})`)
          .join(", ")}`
      );
    }

    await tx.questionBank.deleteMany({
      where: {
        source: "NOTEBOOKLM",
        tenantId: null,
        id: { notIn: [...uniqueIds] }
      }
    });

    for (const question of questions) {
      await tx.questionBank.upsert({
        where: { id: question.id },
        update: question,
        create: question
      });
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 120_000
  });
}

try {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await syncQuestions();
      break;
    } catch (error) {
      const isRetryableConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (!isRetryableConflict || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  console.log(
    `NotebookLM問題を${questions.length}件同期しました: ${Object.entries(categoryCounts)
      .map(([category, count]) => `${category} ${count}件`)
      .join(" / ")}`
  );
} finally {
  await prisma.$disconnect();
}
