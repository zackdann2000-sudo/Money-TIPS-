/**
 * Camada de cache em memória para TODAS as APIs de futebol (ESPN, Sportmonks, Bzzoiro, API-Football, Football-Data).
 *
 *  - TTL padrão de 60 s por chave (URL + headers relevantes): uma consulta repetida dentro desse intervalo
 *    volta do cache sem bater na API → evita 429/502 e preserva o limite do plano.
 *  - Deduplicação em voo: N requisições simultâneas iguais viram 1 chamada externa.
 *  - Stale-on-error: se a API falhar (timeout, 5xx, 429), devolve o último dado bom (até 10 min) em vez de quebrar a página.
 *  - Métricas: hits/misses/stale por provedor (expostas em /api/health?cache=1).
 */

type Entry = { at: number; ttl: number; value: unknown; provider: string };
type Stats = { hits: number; misses: number; stale: number; errors: number };

const g = globalThis as typeof globalThis & { __apiCache?: Map<string, Entry>; __apiInflight?: Map<string, Promise<unknown>>; __apiStats?: Map<string, Stats> };
const store = (g.__apiCache ??= new Map<string, Entry>());
const inflight = (g.__apiInflight ??= new Map<string, Promise<unknown>>());
const stats = (g.__apiStats ??= new Map<string, Stats>());

export const API_CACHE_TTL_MS = 60_000;
const STALE_MAX_MS = 10 * 60_000;
const MAX_ENTRIES = 3000;

function stat(provider: string) {
  let s = stats.get(provider);
  if (!s) { s = { hits: 0, misses: 0, stale: 0, errors: 0 }; stats.set(provider, s); }
  return s;
}

export type CachedResult<T> = { value: T; fromCache: boolean; stale: boolean; ageMs: number };

/**
 * cached(provider, key, loader, ttlMs)
 * `loader` deve LANÇAR em caso de falha (para acionar o stale-on-error) e retornar o valor em sucesso.
 */
export async function cached<T>(provider: string, key: string, loader: () => Promise<T>, ttlMs = API_CACHE_TTL_MS, opts: { force?: boolean } = {}): Promise<CachedResult<T>> {
  const s = stat(provider);
  const hit = store.get(key);
  const now = Date.now();
  if (hit && !opts.force && now - hit.at < hit.ttl) {
    s.hits += 1;
    return { value: hit.value as T, fromCache: true, stale: false, ageMs: now - hit.at };
  }
  const running = inflight.get(key);
  if (running) return (await running) as CachedResult<T>;

  s.misses += 1;
  const task = (async (): Promise<CachedResult<T>> => {
    try {
      const value = await loader();
      if (store.size >= MAX_ENTRIES) {
        for (const [k] of [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 300)) store.delete(k);
      }
      store.set(key, { at: Date.now(), ttl: ttlMs, value, provider });
      return { value, fromCache: false, stale: false, ageMs: 0 };
    } catch (error) {
      s.errors += 1;
      if (hit && Date.now() - hit.at < STALE_MAX_MS) {
        s.stale += 1;
        return { value: hit.value as T, fromCache: true, stale: true, ageMs: Date.now() - hit.at };
      }
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task as Promise<unknown>);
  return task;
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

export function apiCacheStats() {
  const byProvider: Record<string, Stats & { entries: number }> = {};
  for (const [p, s] of stats) byProvider[p] = { ...s, entries: 0 };
  for (const e of store.values()) { byProvider[e.provider] ??= { hits: 0, misses: 0, stale: 0, errors: 0, entries: 0 }; byProvider[e.provider].entries += 1; }
  return { ttlMs: API_CACHE_TTL_MS, totalEntries: store.size, inflight: inflight.size, byProvider };
}
