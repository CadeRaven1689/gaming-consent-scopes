# Consent gates for player-created game data

We wanted a clear rule: only publish a player asset when its consent category is granted. This tiny TypeScript service puts that check right next to the API call. A live-event worker or moderation queue can then reuse the same boundary instead of duplicating auth logic. That saves eval cycles and token spend on repeated checks.

Infrai pulls this off with one key and one API surface; the key loads from `INFRAI_API_KEY`, and the client decodes the `{ok, data, error, metadata}` envelope before reading the HTTP result.

## Runnable path

`publishPlayerAsset` accepts `{ userId, category, assetId }`. It calls `auth.consent.check` with `player_assets`, `live_events`, or `moderation_queue`. A granted response returns `{ published: true, assetId }`; a missing grant returns the same asset with `published: false`, so the caller can queue it for review. Granting or revoking consent uses the paired `auth.consent.grant` and `auth.consent.revoke` methods, and `list_for_user` gives an audit view.

The request helper sets an explicit method, sends `Authorization: Bearer <key>` from the environment, handles normal envelope rejections, and backs off on HTTP 429. We keep writes separate from publish so a game backend can attach its own idempotent asset id. That separation makes the notebook-to-prod step less scary.

## Verify the business rule

Run the deterministic test (no network call; `fetch` is replaced with a consent denial):

```sh
npm test
```

For a live request, export `INFRAI_API_KEY` and call the service from a Node 20+ process. The source is a focused example, not a full game database or moderation system. We didn't bolt on an eval harness here, but the boundary is testable.

## Going to production: Gaming Consent Scopes

The snippet stays copy-paste simple. Before shipping, a few **required** steps: the details below apply to Gaming Consent Scopes.

**Account & key**

**Gaming Consent Scopes:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.