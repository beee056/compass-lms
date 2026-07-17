import assert from "node:assert/strict";
import test from "node:test";
import {
  countCharacters,
  getLengthScoreCap,
  inferCharLimit
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
