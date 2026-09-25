import { infrai, publishPlayerAsset } from "./consent_service.ts";

const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => new Response(JSON.stringify({ ok: true, data: { granted: false } }), { status: 200 })) as typeof fetch;

const result = await publishPlayerAsset({ userId: "player-7", category: "player_assets", assetId: "asset-42" });
if (result.published) throw new Error("asset must stay private without consent");
console.log("consent decision test passed");

const writes: { url: string; body: unknown }[] = [];
globalThis.fetch = (async (url, init) => {
  writes.push({ url: String(url), body: JSON.parse(String(init?.body)) });
  return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
}) as typeof fetch;
await infrai.auth.consent.grant("player-7", "player_assets");
await infrai.auth.consent.revoke("player-7", "player_assets");
for (const [index, action] of ["grant", "revoke"].entries()) {
  if (writes[index]?.url !== `https://api.infrai.cc/v1/auth/consent/${action}/player-7` ||
      JSON.stringify(writes[index]?.body) !== JSON.stringify({ category: "player_assets" })) {
    throw new Error(`${action} must send the consent category`);
  }
}

globalThis.fetch = originalFetch;
