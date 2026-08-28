import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { findAvailableAnalysisPdf, getUsableAnalysisPdfLinks } from "../src/lib/analysis-pdf-lookup.ts";
import { createShareLinkToken } from "../src/lib/share-link-token.ts";

test("gera a credencial obrigatória para criar um link automático", () => {
  const first = createShareLinkToken();
  const second = createShareLinkToken();

  assert.match(first.rawToken, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(createHash("sha256").update(first.rawToken).digest("hex"), first.tokenHash);
  assert.notEqual(first.tokenHash, second.tokenHash);
});

test("ignora links expirados antes de buscar o PDF", () => {
  const now = new Date("2026-08-28T12:00:00.000Z");
  const links = getUsableAnalysisPdfLinks(
    [
      { id: "expired", expires_at: "2026-08-27T12:00:00.000Z" },
      { id: "permanent", expires_at: null },
      { id: "future", expires_at: "2026-08-29T12:00:00.000Z" },
    ],
    now
  );

  assert.deepEqual(links.map((link) => link.id), ["permanent", "future"]);
});

test("procura o PDF nos demais links ativos quando o mais recente não possui arquivo", async () => {
  const visited: string[] = [];
  const result = await findAvailableAnalysisPdf(
    [{ id: "newest" }, { id: "with-pdf" }, { id: "oldest" }],
    async (id) => {
      visited.push(id);
      return id === "with-pdf" ? { filename: "analysis.pdf" } : null;
    }
  );

  assert.deepEqual(result, { filename: "analysis.pdf" });
  assert.deepEqual(visited, ["newest", "with-pdf"]);
});
