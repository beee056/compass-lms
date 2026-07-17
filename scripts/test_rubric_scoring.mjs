import assert from "node:assert/strict";
import test from "node:test";

import {
  RUBRICS,
  clampAxisScore,
  computeTotalScore,
  scoreToLevel
} from "../src/lib/rubrics.ts";

test("axis scores cover the full zero-to-100 range", () => {
  assert.equal(clampAxisScore(-1), 0);
  assert.equal(clampAxisScore(101), 100);
  assert.equal(clampAxisScore(72), 70);
  assert.equal(clampAxisScore(73), 75);
  assert.equal(clampAxisScore(38), 35);
  assert.equal(clampAxisScore(39), 35);
  assert.equal(clampAxisScore(68), 65);
  assert.equal(clampAxisScore(69), 65);
  assert.equal(clampAxisScore(83), 80);
  assert.equal(clampAxisScore(84), 80);
  assert.equal(scoreToLevel(0), 1);
  assert.equal(scoreToLevel(39), 1);
  assert.equal(scoreToLevel(40), 2);
  assert.equal(scoreToLevel(69), 2);
  assert.equal(scoreToLevel(70), 3);
  assert.equal(scoreToLevel(84), 3);
  assert.equal(scoreToLevel(85), 4);
  assert.equal(scoreToLevel(100), 4);
});

test("missing evaluable axes fail closed instead of inflating the remaining scores", () => {
  assert.throws(
    () => computeTotalScore(RUBRICS["小論文"], { selfUnderstanding: 100 }),
    /必須評価軸.*logicStructure/
  );
});

test("all-zero axis scores produce a zero total instead of 25", () => {
  const scores = Object.fromEntries(
    [...RUBRICS["小論文"].commonAxes, ...RUBRICS["小論文"].specificAxes]
      .filter((axis) => axis.aiEvaluable)
      .map((axis) => [axis.key, 0])
  );

  assert.equal(computeTotalScore(RUBRICS["小論文"], scores), 0);
});

test("essay total uses common-average 60 percent and specific-average 40 percent", () => {
  const scores = {
    selfUnderstanding: 80,
    logicStructure: 70,
    concreteness: 60,
    expression: 50,
    growth: 40,
    taskResponse: 90,
    counterArgument: 60,
    completeness: 30
  };

  assert.equal(computeTotalScore(RUBRICS["小論文"], scores), 60);
});

test("interview excludes non-text axes and weights dialogue at 40 percent", () => {
  const scores = {
    selfUnderstanding: 50,
    logicStructure: 50,
    concreteness: 50,
    expression: 50,
    growth: 50,
    nonverbal: 100,
    tensionControl: 100,
    dialogue: 0
  };

  assert.equal(computeTotalScore(RUBRICS["面接"], scores), 30);
});
