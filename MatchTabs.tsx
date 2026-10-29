"use client";

import { useEffect, useState, type ReactNode } from "react";

export const MATCH_TABS = ["OPORTUNIDADES", "PRÉ-LIVE", "LIVE", "H2H", "JOGADORES", "ESTATÍSTICAS", "CLASSIFICAÇÃO"] as const;
export type MatchTab = (typeof MATCH_TABS)[number];

export default function MatchTabs({ panels, initial = "OPORTUNIDADES", liveBadge }: { panels: Record<MatchTab, ReactNode>; initial?: MatchTab; liveBadge?: string }) {
  const [tab, setTab] = useState<MatchTab>(initial);
  useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.replace("#", "")).toUpperCase() as MatchTab;
    if (MATCH_TABS.includes(fromHash)) setTab(fromHash);
  }, []);
  return (
    <div className="space-y-3">
      <nav className="no-scrollbar sticky top-[6.1rem] z-20 -mx-3 flex gap-0.5 overflow-x-auto border-b border-zinc-800 bg-zinc-950/95 px-2 backdrop-blur lg:top-0 lg:mx-0 lg:rounded-xl lg:border">
        {MATCH_TABS.map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); history.replaceState(null, "", `#${t.toLowerCase()}`); }} className={`relative shrink-0 px-3 py-2.5 text-[0.62rem] font-extrabold tracking-wide transition ${tab === t ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t}{t === "LIVE" && liveBadge ? <span className="ml-1 rounded-full bg-emerald-500 px-1.5 text-[0.5rem] text-emerald-950">{liveBadge}</span> : null}
            {tab === t ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-400" /> : null}
          </button>
        ))}
      </nav>
      <div>{panels[tab]}</div>
    </div>
  );
}
