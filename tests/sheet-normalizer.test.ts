import test from "node:test";
import assert from "node:assert/strict";
import { SheetNormalizer } from "../src/lib/google-sheets/sheet-normalizer.ts";

test("SheetNormalizer.toNumber parses BRL and comma decimals", () => {
  assert.equal(SheetNormalizer.toNumber("R$ 1.234,56"), 1234.56);
  assert.equal(SheetNormalizer.toNumber("10,5"), 10.5);
  assert.equal(SheetNormalizer.toNumber("--"), null);
});

test("SheetNormalizer.toPercent handles percent and raw values", () => {
  assert.equal(SheetNormalizer.toPercent("12,5%"), 0.125);
  assert.equal(SheetNormalizer.toPercent("0,37"), 0.37);
  assert.equal(SheetNormalizer.toPercent("N/A"), null);
});

test("SheetNormalizer.toDate normalizes BR and ISO", () => {
  assert.equal(SheetNormalizer.toDate("2026-05-29T12:00:00Z"), "2026-05-29");
  assert.equal(SheetNormalizer.toDate("29/05/2026"), "2026-05-29");
});

test("SheetNormalizer.shouldIgnoreRow ignores TOTAL and MÉDIA", () => {
  assert.equal(SheetNormalizer.shouldIgnoreRow("TOTAL"), true);
  assert.equal(SheetNormalizer.shouldIgnoreRow("MÉDIA"), true);
  assert.equal(SheetNormalizer.shouldIgnoreRow("Campanha A"), false);
});
