import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEssayGradingProfileContext,
  detectEssayTaskTypes,
  resolveEssayGradingProfile
} from "../src/lib/essay-grading-profile.ts";

test("全大学の小論文へ設問類型別精密基準を適用する", () => {
  const profile = resolveEssayGradingProfile({
    kind: "小論文",
    promptText: "二つの資料を比較し、社会課題を定義して解決策を提案しなさい。"
  });

  assert.equal(profile?.id, "advanced-essay-analysis");
  assert.deepEqual(profile?.taskTypes, ["source_analysis", "comparative_argumentation", "problem_discovery", "solution_design"]);
});

test("大学名がなくても設問要求から複合類型を検出する", () => {
  assert.deepEqual(
    detectEssayTaskTypes("複数の分野を統合し、必要な数量を推定した上で、あなた自身の経験を論じなさい。"),
    ["quantitative_estimation", "interdisciplinary_synthesis", "self_reflection"]
  );
});

test("小論文以外には精密基準を適用しない", () => {
  assert.equal(resolveEssayGradingProfile({kind: "面接", promptText: "資料を比較してください。"}), null);
});

test("検出類型だけを評価し、根拠のない配点を禁止する", () => {
  const profile = resolveEssayGradingProfile({
    kind: "小論文",
    promptText: "統計資料を読み取り、その意味を論じなさい。"
  });
  const context = buildEssayGradingProfileContext(profile);

  assert.match(context, /資料本文が提示されていない場合は、資料内容の正誤を推測して評価しない/);
  assert.match(context, /検出されていない類型の要素.*減点しない/);
  assert.match(context, /根拠のない点数表記をtaskAnalysisへ含めない/);
  assert.doesNotMatch(context, /提案設計型/);
});

test("類型がない一般論述にも主張と根拠の汎用基準を使う", () => {
  const profile = resolveEssayGradingProfile({kind: "小論文", promptText: "自由について論じなさい。"});
  const context = buildEssayGradingProfileContext(profile);

  assert.match(context, /general_argumentation/);
  assert.match(context, /主張、根拠、論理的接続/);
});

test("題材語だけでは設問にない評価類型を持ち込まない", () => {
  assert.deepEqual(detectEssayTaskTypes("市民活動の社会的意義について論じなさい。"), []);
  assert.deepEqual(detectEssayTaskTypes("大学での学びの意義について論じなさい。"), []);
  assert.deepEqual(detectEssayTaskTypes("AIと教育の関連について論じなさい。"), []);
});

test("賛否・是非・功罪の判断を求める設問は意見論述型として検出する", () => {
  assert.deepEqual(detectEssayTaskTypes("少子化問題への賛否を論じなさい。"), ["opinion_position"]);
  assert.deepEqual(detectEssayTaskTypes("計画経済の功罪について論じなさい。"), ["opinion_position"]);
  assert.deepEqual(detectEssayTaskTypes("数値目標を設けることの是非を論じなさい。"), ["opinion_position"]);
  assert.deepEqual(
    detectEssayTaskTypes("日本は電子投票を導入すべきか、あなたの考えを1000字以内で述べなさい。"),
    ["opinion_position"]
  );
  assert.deepEqual(
    detectEssayTaskTypes("あなた自身は死刑制度に賛成か、理由とともに論じなさい。"),
    ["opinion_position"]
  );
});

test("要約を求める設問は要約型として検出する", () => {
  assert.deepEqual(detectEssayTaskTypes("課題文の内容を200字以内で要約しなさい。"), ["summarization"]);
  assert.deepEqual(detectEssayTaskTypes("筆者の主張の要旨をまとめ、200字で示しなさい。"), ["summarization"]);
  // 「要約した上で意見を述べる」複合設問は両類型を検出する
  assert.deepEqual(
    detectEssayTaskTypes("課題文を要約した上で、あなたの考えを600字以内で述べなさい。"),
    ["summarization", "opinion_position"]
  );
});

test("単なる比較は資料分析ではなく比較論証として扱う", () => {
  assert.deepEqual(detectEssayTaskTypes("二つの思想を比較して論じなさい。"), ["comparative_argumentation"]);
  const context = buildEssayGradingProfileContext(resolveEssayGradingProfile({
    kind: "小論文",
    promptText: "二つの思想を比較して論じなさい。"
  }));

  assert.match(context, /比較論証型/);
  assert.doesNotMatch(context, /資料分析型/);
});

test("類型を示す名詞だけでは処理要求を持ち込まない", () => {
  // 「資料保存」の資料は処理対象の資料ではないため資料分析型にしない
  assert.deepEqual(detectEssayTaskTypes("公文書館における資料保存の意義を論じなさい。"), []);
  // 功罪の評価を求める設問は意見論述型だが、提案設計型は持ち込まない
  assert.deepEqual(detectEssayTaskTypes("政策を提案することの功罪を論じなさい。"), ["opinion_position"]);
  assert.deepEqual(detectEssayTaskTypes("欧州統合の功罪を論じなさい。"), ["opinion_position"]);
});

test("原因考察は問題発見ではなく原因分析として扱う", () => {
  assert.deepEqual(detectEssayTaskTypes("少子化の原因を考察しなさい。"), ["causal_analysis"]);
  const context = buildEssayGradingProfileContext(resolveEssayGradingProfile({
    kind: "小論文",
    promptText: "少子化の原因を考察しなさい。"
  }));

  assert.match(context, /原因分析型/);
  assert.doesNotMatch(context, /問題発見型/);
});

test("題材中の動詞を処理要求と誤認しない", () => {
  // 「計算する」が題材に含まれても数量推定型にしない（功罪の評価は意見論述型）
  assert.deepEqual(detectEssayTaskTypes("AIが計算することの功罪を論じなさい。"), ["opinion_position"]);
  assert.deepEqual(detectEssayTaskTypes("公文書館の資料保存政策を分析しなさい。"), []);
});
