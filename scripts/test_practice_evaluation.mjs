import assert from "node:assert/strict";
import test from "node:test";
import {
  countCharacters,
  containsInterviewCharacterLimit,
  estimateInterviewResponseSeconds,
  getInterviewMainQuestion,
  getInterviewResponseMetrics,
  hasMultipleInterviewQuestions,
  getLengthScoreCap,
  getOverLimitTotalScoreCap,
  inferCharLimit,
  inferCharLimitSpec,
  resolveEffectiveCharLimit,
  resolveEffectiveCharLimitSpec
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
  assert.equal(getLengthScoreCap(800, undefined), null);
});

test("getLengthScoreCap penalizes exceeding an upper-bound (以内) limit", () => {
  // 「以内」指定: 超過1割以内は要改善上限、それ以上は未達上限
  assert.equal(getLengthScoreCap(801, 800, "max"), 65);
  assert.equal(getLengthScoreCap(880, 800, "max"), 65);
  assert.equal(getLengthScoreCap(881, 800, "max"), 35);
  assert.equal(getLengthScoreCap(900, 800, "max"), 35);
  assert.equal(getLengthScoreCap(1600, 800, "max"), 35);
});

test("字数超過時は総合点にも上限を掛ける（超過なしはnull）", () => {
  // 800字以内で893字（約1.12倍）→ 未達上限35点が総合点の上限になる
  assert.equal(getOverLimitTotalScoreCap(893, { limit: 800, type: "max" }), 35);
  // 超過1割以内 → 要改善上限65点
  assert.equal(getOverLimitTotalScoreCap(850, { limit: 800, type: "max" }), 65);
  // 規定内は総合点キャップなし
  assert.equal(getOverLimitTotalScoreCap(800, { limit: 800, type: "max" }), null);
  assert.equal(getOverLimitTotalScoreCap(400, { limit: 800, type: "max" }), null);
  // 「程度」指定は1割まで許容
  assert.equal(getOverLimitTotalScoreCap(880, { limit: 800, type: "approx" }), null);
  assert.equal(getOverLimitTotalScoreCap(900, { limit: 800, type: "approx" }), 65);
  // 規定字数が特定できない場合はキャップしない
  assert.equal(getOverLimitTotalScoreCap(2000, undefined), null);
});

test("getLengthScoreCap tolerates small overruns for approximate (程度・前後) limits", () => {
  assert.equal(getLengthScoreCap(800, 800, "approx"), 100);
  assert.equal(getLengthScoreCap(880, 800, "approx"), 100);
  assert.equal(getLengthScoreCap(900, 800, "approx"), 65);
  assert.equal(getLengthScoreCap(960, 800, "approx"), 65);
  assert.equal(getLengthScoreCap(961, 800, "approx"), 35);
});

test("inferCharLimit supports common Japanese formats", () => {
  assert.equal(inferCharLimit("800字以内で述べなさい"), 800);
  assert.equal(inferCharLimit("（８００字）"), 800);
  assert.equal(inferCharLimit("1,000字程度"), 1000);
  assert.equal(inferCharLimit("１，２００字前後"), 1200);
});

test("inferCharLimitSpec distinguishes upper-bound and approximate limits", () => {
  assert.deepEqual(inferCharLimitSpec("800字以内で述べなさい"), { limit: 800, type: "max" });
  assert.deepEqual(inferCharLimitSpec("800字程度で述べなさい"), { limit: 800, type: "approx" });
  assert.deepEqual(inferCharLimitSpec("１，２００字前後でまとめなさい"), { limit: 1200, type: "approx" });
  // 接尾辞なしは上限扱い
  assert.deepEqual(inferCharLimitSpec("（８００字）"), { limit: 800, type: "max" });
  // 「以内」と「程度」が混在する場合は厳しい方（以内）を採用
  assert.deepEqual(inferCharLimitSpec("800字程度、ただし800字以内とする"), { limit: 800, type: "max" });
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

test("explicit char limits inherit the prompt's limit type only when the values agree", () => {
  assert.deepEqual(
    resolveEffectiveCharLimitSpec("小論文", "800字程度で論じなさい", 800),
    { limit: 800, type: "approx" }
  );
  assert.deepEqual(
    resolveEffectiveCharLimitSpec("小論文", "800字程度で論じなさい", 600),
    { limit: 600, type: "max" }
  );
  assert.deepEqual(
    resolveEffectiveCharLimitSpec("小論文", "字数指定なし", 600),
    { limit: 600, type: "max" }
  );
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

test("interview extraction handles the question-bank follow-up formats", () => {
  // 【基本質問】…【深掘り質問】… （NLM-001形式）
  assert.equal(
    getInterviewMainQuestion(
      "【基本質問】アドミッション・ポリシーの中で、あなたが最も共感する項目はどれですか？【深掘り質問】その項目を体現しているあなたの具体的な行動は？ 大学生活でそれをどう深めていきたいですか？"
    ),
    "アドミッション・ポリシーの中で、あなたが最も共感する項目はどれですか？"
  );
  // 基本質問：「…」 深掘り質問：「…」 （NLM-006形式）
  assert.equal(
    getInterviewMainQuestion(
      "基本質問：「（専門分野の倫理的問題について）あなたはどう考えますか？（例：出生前診断、AIの倫理等）」 深掘り質問：「事実と意見を分けて説明してください。」"
    ),
    "「（専門分野の倫理的問題について）あなたはどう考えますか？（例：出生前診断、AIの倫理等）」"
  );
  // 「…。深掘り質問：…」 全体が鉤括弧で囲まれ、深掘りが文中に続く形式（NLM-013形式）
  assert.equal(
    getInterviewMainQuestion(
      "「あなたが志望する分野において、最も重要だと思う『倫理』は何ですか。深掘り質問：もし倫理と利益が相反したらどうしますか？」"
    ),
    "あなたが志望する分野において、最も重要だと思う『倫理』は何ですか。"
  );
  // 深掘りを除去した主質問が1問なら、複数質問として拒否しない
  assert.equal(
    hasMultipleInterviewQuestions(
      "【基本質問】最も共感する項目はどれですか？【深掘り質問】その理由は？ どう深めますか？"
    ),
    false
  );
  assert.equal(
    hasMultipleInterviewQuestions(
      "基本質問：「あなたはどう考えますか？」 深掘り質問：「事実と意見を分けてください。理由も教えてください。」"
    ),
    false
  );
});
