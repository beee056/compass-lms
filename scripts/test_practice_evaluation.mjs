import assert from "node:assert/strict";
import test from "node:test";
import {
  countCharacters,
  containsInterviewCharacterLimit,
  estimateInterviewResponseSeconds,
  getInterviewApplicableAxisKeys,
  getInterviewMainQuestion,
  getInterviewResponseMetrics,
  hasMultipleInterviewQuestions,
  getLengthScoreCap,
  inferCharLimit,
  resolveEffectiveCharLimit
} from "../src/lib/practice-evaluation.ts";

test("countCharacters counts Unicode code points", () => {
  assert.equal(countCharacters("日本語😀"), 4);
});

test("getLengthScoreCap preserves level bands with continuous scores", () => {
  assert.equal(getLengthScoreCap(0, 800), 0);
  assert.equal(getLengthScoreCap(200, 800), 20);
  assert.equal(getLengthScoreCap(399, 800), 35);
  assert.equal(getLengthScoreCap(400, 800), 40);
  assert.equal(getLengthScoreCap(639, 800), 65);
  assert.equal(getLengthScoreCap(640, 800), 70);
  assert.equal(getLengthScoreCap(719, 800), 80);
  assert.equal(getLengthScoreCap(720, 800), 85);
  assert.equal(getLengthScoreCap(800, 800), 100);
  assert.equal(getLengthScoreCap(900, 800), 100);
  assert.equal(getLengthScoreCap(800, undefined), null);
});

test("inferCharLimit supports common Japanese formats", () => {
  assert.equal(inferCharLimit("800字以内で述べなさい"), 800);
  assert.equal(inferCharLimit("（８００字）"), 800);
  assert.equal(inferCharLimit("1,000字程度"), 1000);
  assert.equal(inferCharLimit("１，２００字前後"), 1200);
});

test("inferCharLimit accepts repeated identical limits and rejects ambiguity", () => {
  assert.equal(inferCharLimit("全体を800字以内で、答案は800字以内とする"), 800);
  assert.equal(inferCharLimit("全体を800字以内、要約を200字以内で書く"), undefined);
  assert.equal(inferCharLimit("字数指定なし"), undefined);
});

test("interview ignores explicit and embedded character limits", () => {
  assert.equal(resolveEffectiveCharLimit("面接", "800字以内で答えてください", 800), undefined);
  assert.equal(resolveEffectiveCharLimit("小論文", "800字以内で論じなさい"), 800);
  assert.equal(resolveEffectiveCharLimit("志望理由書", "自由記述", 600), 600);
});

test("interview response length is expressed as estimated speaking time", () => {
  assert.equal(estimateInterviewResponseSeconds(0), 0);
  assert.equal(estimateInterviewResponseSeconds(150), 30);
  assert.equal(estimateInterviewResponseSeconds(233), 47);
  assert.equal(estimateInterviewResponseSeconds(300), 60);
});

test("interview response metrics report total and per-answer speaking time", () => {
  const metrics = getInterviewResponseMetrics(`Q: 志望理由は？\nA: ${"あ".repeat(150)}\nQ: 強みは？\nA: ${"い".repeat(150)}`);

  assert.equal(metrics.responseCount, 2);
  assert.equal(metrics.answerChars, 301);
  assert.equal(metrics.totalSeconds, 60);
  assert.equal(metrics.averageSeconds, 30);
  assert.deepEqual(getInterviewResponseMetrics(""), {
    answerChars: 0,
    responseCount: 0,
    totalSeconds: 0,
    averageSeconds: 0
  });
});

test("generated interview prompts reject character-count requirements", () => {
  assert.equal(containsInterviewCharacterLimit("800字以内で答えてください"), true);
  assert.equal(containsInterviewCharacterLimit("８００字程度で述べてください"), true);
  assert.equal(containsInterviewCharacterLimit("八百字以内で述べてください"), true);
  assert.equal(containsInterviewCharacterLimit("回答は500文字前後"), true);
  assert.equal(containsInterviewCharacterLimit("文字数は800を目安とします"), true);
  assert.equal(containsInterviewCharacterLimit("60秒程度で答えてください"), false);
  assert.equal(containsInterviewCharacterLimit("漢字で氏名を書いてください"), false);
});

test("interview grading uses only the first main question", () => {
  assert.equal(
    getInterviewMainQuestion("社会が変化しても守るべきものは何ですか。（深掘り：根拠、別の選択肢、大学での応用）"),
    "社会が変化しても守るべきものは何ですか。"
  );
  assert.equal(getInterviewMainQuestion("Q: 志望理由を教えてください。\n深掘り：なぜ本学ですか。"), "志望理由を教えてください。");
  assert.equal(
    getInterviewMainQuestion("次の社会状況を踏まえてください。\nあなたの考えを教えてください。"),
    "次の社会状況を踏まえてください。\nあなたの考えを教えてください。"
  );
  assert.equal(
    getInterviewMainQuestion("次の地域課題を前提にしてください。\nQ: あなたならどのように対応しますか？"),
    "次の地域課題を前提にしてください。\nあなたならどのように対応しますか？"
  );
  assert.equal(hasMultipleInterviewQuestions("志望理由は何ですか？なぜ本学ですか？"), true);
  assert.equal(hasMultipleInterviewQuestions("志望理由を教えてください。入学後に何をしたいですか？"), true);
  assert.equal(hasMultipleInterviewQuestions("志望理由と、その背景を教えてください。"), false);
  assert.equal(hasMultipleInterviewQuestions("まず資料を確認してください。\nその上で、あなたの考えを説明してください。"), false);
  assert.equal(hasMultipleInterviewQuestions("Q: 志望理由を述べよ。\nQ: 入学後の目標を述べよ。"), true);
  assert.equal(hasMultipleInterviewQuestions("Q: 高校時代の活動について。\nQ: 入学後の目標について。"), true);
  assert.equal(hasMultipleInterviewQuestions("Q: 志望理由を教えてください。\n深掘り：\nQ: なぜ本学ですか。"), false);
});

test("interview evaluates personal and growth axes only when the main question asks for them", () => {
  assert.deepEqual(
    getInterviewApplicableAxisKeys("社会が変化しても守るべきものは何ですか。"),
    ["logicStructure", "concreteness", "expression", "dialogue"]
  );
  assert.deepEqual(
    getInterviewApplicableAxisKeys("あなたは社会の変化についてどう考えますか。"),
    ["logicStructure", "concreteness", "expression", "dialogue"]
  );
  assert.deepEqual(
    getInterviewApplicableAxisKeys("あなたが将来のAI社会をどう考えますか。"),
    ["logicStructure", "concreteness", "expression", "dialogue"]
  );
  assert.deepEqual(
    getInterviewApplicableAxisKeys("大学で何を学びたいですか。"),
    ["logicStructure", "concreteness", "expression", "dialogue"]
  );
  assert.deepEqual(
    getInterviewApplicableAxisKeys("あなたが失敗から学び、次に活かした経験を教えてください。"),
    ["logicStructure", "concreteness", "expression", "dialogue", "selfUnderstanding", "growth"]
  );
});
