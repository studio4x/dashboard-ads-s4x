import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { MetaGraphClient } from "../src/lib/meta-marketing/graph-client.ts";

test("MetaGraphClient envia token no header e appsecret_proof", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let authorization = "";
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("authorization") || "";
    return Response.json({ id: "123" });
  }) as typeof fetch;

  try {
    const client = new MetaGraphClient("access-token", "v26.0", "app-secret");
    const profile = await client.get<{ id: string }>("me", { fields: "id" });
    const url = new URL(requestedUrl);
    assert.equal(profile.id, "123");
    assert.equal(authorization, "Bearer access-token");
    assert.equal(url.searchParams.get("appsecret_proof"), createHmac("sha256", "app-secret").update("access-token").digest("hex"));
    assert.equal(url.searchParams.has("access_token"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MetaGraphClient bloqueia host externo recebido na paginação", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ data: [], paging: { next: "https://example.com/steal" } })) as typeof fetch;
  try {
    const client = new MetaGraphClient("access-token", "v26.0", "app-secret");
    await assert.rejects(() => client.getAll("me/adaccounts"), /Host de paginação Meta inválido/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
