import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUniversityGradingProfileContext,
  resolveUniversityGradingProfile
} from "../src/lib/university-grading-profiles.ts";

test("大学名から慶應SFC小論文プロファイルを適用する", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    universityName: "慶應義塾大学 環境情報学部",
    promptText: "資料を比較し、課題を定義した上で解決策を提案しなさい。",
    taskTypes: ["source_analysis", "problem_discovery", "solution_design"]
  });

  assert.equal(profile?.id, "keio-sfc-essay");
  assert.equal(profile?.matchedBy, "universityName");
  assert.deepEqual(profile?.taskTypes, ["problem_discovery", "solution_design"]);
  assert.equal(profile?.sourceReferences.length, 4);
});

test("設問本文の明示的なSFC表記から適用する", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    promptText: "SFCでの学びを踏まえ、複数の分野を統合して数量を推定しなさい。",
    taskTypes: ["quantitative_estimation", "interdisciplinary_synthesis", "self_reflection"]
  });

  assert.equal(profile?.matchedBy, "prompt");
  assert.deepEqual(profile?.taskTypes, [
    "interdisciplinary_synthesis",
    "self_reflection"
  ]);
});

test("一般語の環境情報だけでは誤適用しない", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    promptText: "地域の環境情報を分析し、改善策を述べなさい。"
  });

  assert.equal(profile, null);
});

test("慶應の他学部にはSFC専用基準を誤適用しない", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    universityName: "慶應義塾大学 法学部",
    promptText: "資料を読んで法制度の課題を論じなさい。"
  });

  assert.equal(profile, null);
});

test("設問本文の慶應他学部や他大学の総合政策学部には誤適用しない", () => {
  const keioLaw = resolveUniversityGradingProfile({
    kind: "小論文",
    promptText: "慶應義塾大学法学部の設問として、法制度の課題を論じなさい。"
  });
  const otherPolicy = resolveUniversityGradingProfile({
    kind: "小論文",
    promptText: "中央大学総合政策学部の設問として、地域政策を論じなさい。"
  });

  assert.equal(keioLaw, null);
  assert.equal(otherPolicy, null);
});

test("慶應湘南藤沢キャンパスの明示表記を認識する", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    universityName: "慶應義塾大学 湘南藤沢キャンパス",
    promptText: "課題を定義し、解決策を提案しなさい。"
  });

  assert.equal(profile?.id, "keio-sfc-essay");
});

test("小論文以外にはSFCプロファイルを適用しない", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "面接",
    universityName: "慶應義塾大学 総合政策学部",
    promptText: "志望理由を説明してください。"
  });

  assert.equal(profile, null);
});

test("補助基準は設問要求を優先し、特定年度の配点を持ち込まない", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    universityName: "Keio SFC",
    promptText: "問題を定義し、実行計画を提案しなさい。",
    taskTypes: ["problem_discovery", "solution_design"]
  });
  const context = buildUniversityGradingProfileContext(profile);

  assert.match(context, /薄い校風補正/);
  assert.match(context, /大学名だけを理由に加点・減点せず/);
  assert.match(context, /問題発見型では/);
  assert.match(context, /提案設計型では/);
  assert.match(context, /SFCらしい結論を強制しない/);
});

test("SFC補正対象でない類型には固有評価項目を追加しない", () => {
  const profile = resolveUniversityGradingProfile({
    kind: "小論文",
    universityName: "慶應義塾大学 総合政策学部",
    promptText: "二つの資料を比較しなさい。",
    taskTypes: ["source_analysis", "comparative_argumentation"]
  });
  const context = buildUniversityGradingProfileContext(profile);

  assert.deepEqual(profile?.taskTypes, []);
  assert.match(context, /追加のSFC固有評価項目を設定せず/);
  assert.doesNotMatch(context, /問題発見型では/);
  assert.doesNotMatch(context, /提案設計型では/);
});
