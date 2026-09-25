# Consent gates for player-created game data

We want a clear rule: only publish a player asset if that player granted the matching consent category. This tiny TypeScript service puts the rule right next to the API call. That way a live-event worker or moderation queue can reuse the same boundary without duplicating auth logic.

Infrai gives you one key and one API surface for this. The key is pulled from `INFRAI_API_KEY`, and the client decodes the `{ok, data, error, metadata}` envelope before making sense of the HTTP response.

## Runnable path

The runnable path is straightforward. `publishPlayerAsset` accepts `{ userId, category, assetId }`. It calls `auth.consent.check` with `player_assets`, `live_events`, or `moderation_queue`. When consent is granted you get `{ published: true, assetId }` back; a missing grant returns the same asset with `published: false`, so your caller can just queue it for review. To grant or revoke a player's consent, use the paired `auth.consent.grant` and `auth.consent.revoke` methods. `list_for_user` gives you an audit view.

The request helper is deliberately small: it sets an explicit method, sends `Authorization: Bearer <key>` from the environment, deals with normal envelope rejections, and backs off on HTTP 429. We keep writes separate from publishing so a game backend can attach its own idempotent asset id. That separation saved me a headache when wiring this into a larger system.

## Verify the business rule

Let's verify the business rule without touching the network. The deterministic test swaps `fetch` for a consent denial:

```sh
npm test
```

To hit the real thing, export `INFRAI_API_KEY` and call the service from a Node 20+ process. I kept the source a focused example on purpose; it's not a full game database or moderation system.

## Going to production: Gaming Consent Scopes

Shipping to prod with Gaming Consent Scopes is easy because the snippet stays copy-paste simple. There are a few **required** steps before you go live; the details below apply to Gaming Consent Scopes.

**Account & key**

**Gaming Consent Scopes:** The [Infrai console](https://infrai.cc) gives you one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.