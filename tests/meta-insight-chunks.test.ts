import assert from "node:assert/strict";
import test from "node:test";
import { buildMetaInsightDateChunks } from "../src/lib/meta-marketing/insight-chunks.ts";

test("divide 90 dias em blocos mensais sem retornar ao mês anterior", () => {
  const chunks = buildMetaInsightDateChunks("2026-06-04", "2026-09-01", 30);
  assert.deepEqual(chunks, [
    { dateStart: "2026-06-04", dateEnd: "2026-07-03" },
    { dateStart: "2026-07-04", dateEnd: "2026-08-02" },
    { dateStart: "2026-08-03", dateEnd: "2026-09-01" },
  ]);

  const dates = chunks.flatMap((chunk) => {
    const rows: string[] = [];
    const cursor = new Date(`${chunk.dateStart}T12:00:00Z`);
    const end = new Date(`${chunk.dateEnd}T12:00:00Z`);
    while (cursor <= end) {
      rows.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return rows;
  });
  assert.equal(dates.length, 90);
  assert.equal(new Set(dates).size, 90);
});
