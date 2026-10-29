/**
 * Cliente ESPN sobre a camada de cache unificada (src/lib/api-cache.ts).
 * TTL padrão 60 s · deduplicação · stale-on-error.
 */
import { API_CACHE_TTL_MS, apiCacheStats, cached } from "@/lib/api-cache";

export const ESPN_CACHE_TTL_MS = API_CACHE_TTL_MS;
export type FetchOpts = { ttlMs?: number; timeoutMs?: number; force?: boolean };

export async function espnFetch<T>(url: string, opts: FetchOpts = {}): Promise<T | null> {
  try {
    const r = await cached<T>(
      "espn",
      `espn:${url}`,
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 9000);
        try {
          const response = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { "User-Agent": "GreenScore/1.0", Accept: "application/json" } });
          if (!response.ok) throw new Error(`ESPN HTTP ${response.status}`);
          return (await response.json()) as T;
        } finally {
          clearTimeout(timer);
        }
      },
      opts.ttlMs ?? API_CACHE_TTL_MS,
      { force: opts.force },
    );
    return r.value;
  } catch {
    return null; // sem dado em cache e API fora: quem chama trata o null
  }
}

export function espnCacheStats() {
  return apiCacheStats();
}
