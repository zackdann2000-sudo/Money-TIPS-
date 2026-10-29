"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "gs-compare";
const EVENT = "gs-compare-change";

function readSelection(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(list) ? list.filter((n) => Number.isInteger(n)).slice(0, 4) : [];
  } catch {
    return [];
  }
}
function writeSelection(ids: number[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 4)));
  window.dispatchEvent(new Event(EVENT));
}

export function useCompareSelection() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    const sync = () => setIds(readSelection());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    ids,
    toggle: (id: number) => {
      const current = readSelection();
      if (current.includes(id)) writeSelection(current.filter((x) => x !== id));
      else if (current.length < 4) writeSelection([...current, id]);
    },
    clear: () => writeSelection([]),
  };
}

export function CompareToggle({ playerId, compact = false }: { playerId: number; compact?: boolean }) {
  const { ids, toggle } = useCompareSelection();
  const active = ids.includes(playerId);
  const full = ids.length >= 4 && !active;
  return (
    <button
      type="button"
      onClick={() => toggle(playerId)}
      disabled={full}
      title={active ? "Remover da comparação" : full ? "Máximo de 4 jogadores" : "Adicionar à comparação"}
      className={`chip !py-0.5 ${compact ? "!px-1.5" : ""} ${active ? "!border-emerald-500/50 !bg-emerald-500/15 !text-emerald-500" : ""} disabled:opacity-40`}
    >
      {active ? "✓" : "+"}{compact ? "" : active ? " comparando" : " comparar"}
    </button>
  );
}

export function CompareBar({ league, season }: { league?: string; season?: number }) {
  const { ids, clear } = useCompareSelection();
  if (ids.length === 0) return null;
  const href = `/jogadores/comparar?ids=${ids.join(",")}${league ? `&liga=${league}` : ""}${season ? `&temporada=${season}` : ""}`;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-[55] flex justify-center px-3 lg:bottom-5 lg:left-[248px]">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-500/40 bg-[var(--surface-2)] px-3 py-1.5 shadow-2xl">
        <span className="text-[0.7rem] font-bold">{ids.length} selecionado(s)</span>
        <Link href={href} className={`btn btn-primary !px-3 !py-1 !text-[0.68rem] ${ids.length < 2 ? "pointer-events-none opacity-50" : ""}`}>
          Comparar {ids.length < 2 ? "(mín. 2)" : "→"}
        </Link>
        <button type="button" onClick={clear} className="text-[0.65rem] font-bold muted">limpar</button>
      </div>
    </div>
  );
}

/** Formulário de filtros que envia automaticamente ao alterar selects. */
export function AutoSubmitForm({ children, action }: { children: ReactNode; action: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setPending(false);
  }, [children]);
  return (
    <form
      ref={ref}
      action={action}
      method="get"
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "SELECT") {
          setPending(true);
          const data = new FormData(ref.current!);
          const params = new URLSearchParams();
          data.forEach((value, key) => {
            if (String(value).trim()) params.set(key, String(value));
          });
          params.delete("pagina");
          router.push(`${action}?${params.toString()}`);
        }
      }}
      className={`relative ${pending ? "opacity-70" : ""}`}
    >
      {children}
      {pending ? <span className="absolute right-2 top-2 chip !border-emerald-500/40 !text-emerald-500"><span className="live-dot" /> atualizando</span> : null}
    </form>
  );
}

export function Bars({ rows, max }: { rows: { label: string; value: number | null; color?: string; display: string }[]; max?: number }) {
  const peak = max ?? Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-[0.66rem]">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="tabular-nums font-extrabold">{row.display}</span>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full rounded-full transition-all" style={{ width: `${row.value === null ? 0 : Math.min(100, (row.value / peak) * 100)}%`, background: row.color ?? "var(--brand)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-[var(--line)] overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-2 px-3 py-2.5">
          <span className="h-4 w-5 rounded bg-[var(--surface-3)]" />
          <span className="h-8 w-8 rounded-full bg-[var(--surface-3)]" />
          <span className="h-3 flex-1 rounded bg-[var(--surface-3)]" />
          <span className="h-3 w-10 rounded bg-[var(--surface-3)]" />
        </div>
      ))}
    </div>
  );
}
