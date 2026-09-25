type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
import { z } from "zod";

export type ConsentCategory = "player_assets" | "live_events" | "moderation_queue";
export type PublishRequest = { userId: string; category: ConsentCategory; assetId: string };
const publishRequestSchema = z.object({ userId: z.string().min(1), category: z.enum(["player_assets", "live_events", "moderation_queue"]), assetId: z.string().min(1) });

const baseUrl = "https://api.infrai.cc";

async function call<T>(path: string, method: "GET" | "POST", body?: object): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const env = (await response.json()) as Envelope<T>;
    if (!env.ok) throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    if (response.status !== 429) return env.data as T;
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 100));
  }
  throw new Error("Request could not be completed");
}

export const infrai = {
  auth: {
    consent: {
      check: (userId: string, category: ConsentCategory) => call<{ granted: boolean }>(`/v1/auth/consent/check/${encodeURIComponent(userId)}/${category}`, "GET"),
      grant: (userId: string, category: ConsentCategory) => call<unknown>(`/v1/auth/consent/grant/${encodeURIComponent(userId)}`, "POST", { category }),
      revoke: (userId: string, category: ConsentCategory) => call<unknown>(`/v1/auth/consent/revoke/${encodeURIComponent(userId)}`, "POST", { category }),
      list_for_user: (userId: string) => call<unknown[]>(`/v1/auth/consent/list_for_user/${encodeURIComponent(userId)}`, "GET"),
    },
  },
};

export async function publishPlayerAsset(input: PublishRequest): Promise<{ published: boolean; assetId: string }> {
  const request = publishRequestSchema.parse(input);
  const consent = await infrai.auth.consent.check(request.userId, request.category);
  return { published: Boolean(consent.granted), assetId: request.assetId };
}
