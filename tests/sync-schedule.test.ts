import assert from "node:assert/strict";
import test from "node:test";
import { shouldSync } from "../src/lib/imports/sync-schedule.ts";

test("sincroniza fontes que nunca foram importadas", () => {
  assert.equal(shouldSync("daily", null), true);
});

test("não sincroniza fontes manuais", () => {
  assert.equal(shouldSync("manual", null), false);
});

test("respeita o intervalo horário", () => {
  assert.equal(shouldSync("one_hour", new Date(Date.now() - 30 * 60 * 1000).toISOString()), false);
  assert.equal(shouldSync("one_hour", new Date(Date.now() - 60 * 60 * 1000).toISOString()), true);
});
