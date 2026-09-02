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

test("MetaGraphClient repete respostas 503 e conclui quando a Meta se recupera", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts += 1;
    if (attempts < 3) {
      return Response.json({ error: { message: "Service unavailable", is_transient: true } }, { status: 503 });
    }
    return Response.json({ id: "ok" });
  }) as typeof fetch;

  try {
    const client = new MetaGraphClient("access-token", "v26.0", "app-secret", { baseRetryDelayMs: 0, maxAttempts: 3 });
    const result = await client.get<{ id: string }>("me");
    assert.equal(result.id, "ok");
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MetaGraphClient não repete erro permanente 400", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts += 1;
    return Response.json({ error: { message: "Invalid parameter", code: 100 } }, { status: 400 });
  }) as typeof fetch;

  try {
    const client = new MetaGraphClient("access-token", "v26.0", "app-secret", { baseRetryDelayMs: 0, maxAttempts: 3 });
    await assert.rejects(() => client.get("me"), /Invalid parameter/);
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
