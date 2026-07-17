import assert from "node:assert/strict";
import test from "node:test";
import {
  countCharacters,
  getLengthLevelCap,
  inferCharLimit
} from "../src/lib/practice-evaluation.ts";

test("countCharacters counts Unicode code points", () => {
  assert.equal(countCharacters("日本語😀"), 4);
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

test("getLengthLevelCap enforces exact percentage boundaries", () => {
  assert.equal(getLengthLevelCap(399, 800), 1);
  assert.equal(getLengthLevelCap(400, 800), 2);
  assert.equal(getLengthLevelCap(639, 800), 2);
  assert.equal(getLengthLevelCap(640, 800), 3);
  assert.equal(getLengthLevelCap(719, 800), 3);
  assert.equal(getLengthLevelCap(720, 800), 4);
  assert.equal(getLengthLevelCap(800, undefined), null);
});
