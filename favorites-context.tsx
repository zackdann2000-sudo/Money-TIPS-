"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * FavoritesContext
 * - Persiste a lista de times favoritos no localStorage (funciona para visitantes e offline).
 * - Quando o usuário está logado, sincroniza com o servidor (/api/favorites) para manter
 *   os alertas (gols, cartões, escanteios…) funcionando — a fonte da verdade passa a ser o servidor.
 */

const STORAGE_KEY = "gs-favorites-v1";

export type FavoriteTeam = { id: number; name: string; slug: string; logo?: string; color?: string };

type FavoritesContextValue = {
  favorites: FavoriteTeam[];
  isFavorite: (teamId: number) => boolean;
  toggleFavorite: (team: FavoriteTeam) => Promise<void>;
  loading: boolean;
  syncedWithServer: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readLocal(): FavoriteTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FavoriteTeam[]) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => Number.isInteger(t.id)) : [];
  } catch {
    return [];
  }
}
function writeLocal(list: FavoriteTeam[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / modo privado */
  }
}

export function FavoritesProvider({ children, loggedIn }: { children: ReactNode; loggedIn: boolean }) {
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const hydrated = useRef(false);

  // 1) carrega do localStorage imediatamente
  useEffect(() => {
    setFavorites(readLocal());
    hydrated.current = true;
    setLoading(false);
  }, []);

  // 2) logado: mescla com o servidor (local ∪ servidor) e grava de volta nos dois
  useEffect(() => {
    if (!loggedIn) {
      setSynced(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/favorites", { cache: "no-store" });
        if (!response.ok) return;
        const server = (await response.json()) as { favorites: FavoriteTeam[] };
        const local = readLocal();
        const missingOnServer = local.filter((l) => !server.favorites.some((s) => s.id === l.id));
        for (const team of missingOnServer) {
          await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: team.id, action: "add" }) });
        }
        const merged = [...server.favorites, ...missingOnServer];
        if (!cancelled) {
          setFavorites(merged);
          writeLocal(merged);
          setSynced(true);
        }
      } catch {
        /* offline: mantém local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  // 3) sincroniza entre abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(readLocal());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFavorite = useCallback((teamId: number) => favorites.some((f) => f.id === teamId), [favorites]);

  const toggleFavorite = useCallback(
    async (team: FavoriteTeam) => {
      const exists = favorites.some((f) => f.id === team.id);
      const next = exists ? favorites.filter((f) => f.id !== team.id) : [...favorites, team];
      setFavorites(next);
      writeLocal(next);
      if (loggedIn) {
        try {
          await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: team.id, action: exists ? "remove" : "add" }) });
        } catch {
          /* fica só local até a próxima sincronização */
        }
      }
    },
    [favorites, loggedIn],
  );

  const value = useMemo<FavoritesContextValue>(() => ({ favorites, isFavorite, toggleFavorite, loading, syncedWithServer: synced }), [favorites, isFavorite, toggleFavorite, loading, synced]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites deve ser usado dentro de <FavoritesProvider>");
  return ctx;
}

/** Botão pronto: estrela que alterna o favorito via contexto. */
export function FavoriteButton({ team, compact = false, className = "" }: { team: FavoriteTeam; compact?: boolean; className?: string }) {
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const active = isFavorite(team.id);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(team)}
      disabled={loading}
      aria-pressed={active}
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`chip ${active ? "!border-amber-500/50 !bg-amber-500/10 !text-amber-500" : ""} ${className}`}
    >
      {active ? "★" : "☆"}{compact ? "" : active ? " Favorito" : " Favoritar"}
    </button>
  );
}
