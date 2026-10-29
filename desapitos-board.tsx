"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DesapitoResultado, Periodo } from "@/lib/desapito";
import { DesapitoCard } from "@/components/desapito-card";

const TZ = "America/Sao_Paulo";
const dayKeyLocal = (d: Date) => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d); const g = (t: string) => p.find((x) => x.type === t)?.value ?? ""; return `${g("year")}-${g("month")}-${g("day")}`; };
const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function DesapitosBoard({ ligas }: { ligas: { code: string; name: string; flag: string }[] }) {
  const today = useMemo(() => dayKeyLocal(new Date()), []);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => { const d = new Date(Date.now() + (i - 1) * 86400000); const key = dayKeyLocal(d); return { key, label: i === 1 ? "HOJE" : i === 0 ? "ONTEM" : i === 2 ? "AMANHÃ" : WEEK[new Date(`${key}T12:00:00`).getDay()], num: key.slice(8, 10) }; }), []);
  const [date, setDate] = useState(today);
  const [periodo, setPeriodo] = useState<Periodo>("Jogo completo");
  const [amostra, setAmostra] = useState<5 | 10>(10);
  const [duplos, setDuplos] = useState(false);
  const [liga, setLiga] = useState("todas");
  const [mercado, setMercado] = useState("todos");
  const [res, setRes] = useState<DesapitoResultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q = new URLSearchParams({ data: date, periodo, amostra: String(amostra), liga, duplos: duplos ? "1" : "0" });
      const r = await fetch(`/api/desapitos?${q}`, { cache: "no-store" });
      const b = (await r.json()) as DesapitoResultado & { error?: string };
      if (!r.ok || b.error) throw new Error(b.error ?? `HTTP ${r.status}`);
      setRes(b);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar."); } finally { setLoading(false); }
  }, [date, periodo, amostra, liga, duplos]);
  useEffect(() => { load(); }, [load]);

  const mercados = useMemo(() => [...new Set((res?.itens ?? []).map((i) => i.mercado))], [res]);
  const list = (res?.itens ?? []).filter((i) => mercado === "todos" || i.mercado === mercado);

  return (
    <div className="space-y-3 text-zinc-100">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 px-4 py-3">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-amber-400">Discrepância estatística</p>
        <h1 className="text-[1.1rem] font-black">Desapitos</h1>
        <p className="text-[0.64rem] text-zinc-400">Onde a linha de mercado parece inconsistente com os últimos {amostra} jogos do time — mandante avaliado em casa, visitante fora. Só aparecem discrepâncias com ≥70% de consistência.</p>
      </div>

      <div className="no-scrollbar -mx-3 flex snap-x gap-1.5 overflow-x-auto px-3 lg:mx-0 lg:px-0">
        {days.map((d) => <button key={d.key} type="button" onClick={() => setDate(d.key)} className={`flex min-w-[62px] shrink-0 snap-center flex-col items-center rounded-2xl px-2 py-1.5 text-[0.58rem] font-bold ${date === d.key ? "bg-amber-500 text-amber-950" : "bg-zinc-900 text-zinc-400"}`}><span>{d.label}</span><span className="text-[0.82rem] font-black">{d.num}</span></button>)}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex overflow-hidden rounded-lg border border-zinc-800 text-[0.6rem] font-bold">{(["Jogo completo", "1º tempo", "2º tempo"] as Periodo[]).map((p) => <button key={p} type="button" onClick={() => setPeriodo(p)} className={`px-2.5 py-1.5 ${periodo === p ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>{p}</button>)}</div>
        <div className="flex overflow-hidden rounded-lg border border-zinc-800 text-[0.6rem] font-bold">{([5, 10] as const).map((n) => <button key={n} type="button" onClick={() => setAmostra(n)} className={`px-2.5 py-1.5 ${amostra === n ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>Últimos {n}</button>)}</div>
        <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.6rem] font-bold ${duplos ? "border-violet-500/50 bg-violet-500/10 text-violet-300" : "border-zinc-800 text-zinc-400"}`}><input type="checkbox" checked={duplos} onChange={(e) => setDuplos(e.target.checked)} className="h-3.5 w-3.5 accent-violet-500" /> Desapito Duplo</label>
        <select value={liga} onChange={(e) => setLiga(e.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[0.62rem] text-zinc-200"><option value="todas">🌍 Todas as ligas</option>{ligas.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}</select>
      </div>
      {mercados.length ? (
        <div className="no-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:px-0">
          <button type="button" onClick={() => setMercado("todos")} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-bold ${mercado === "todos" ? "bg-amber-500 text-amber-950" : "bg-zinc-900 text-zinc-400"}`}>Todos ({res?.itens.length ?? 0})</button>
          {mercados.map((m) => <button key={m} type="button" onClick={() => setMercado(m)} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-bold ${mercado === m ? "bg-amber-500 text-amber-950" : "bg-zinc-900 text-zinc-400"}`}>{m} ({res?.itens.filter((i) => i.mercado === m).length})</button>)}
        </div>
      ) : null}

      {res ? <p className="text-[0.58rem] text-zinc-500">{res.jogosAvaliados} jogos avaliados · {res.total} desapito(s) · {res.duplos} duplo(s) · {(res.tempoMs / 1000).toFixed(1)}s</p> : null}
      {loading ? <div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-900" />)}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-500/40 bg-zinc-950 px-3 py-3 text-[0.72rem]"><b className="text-rose-400">Erro:</b> {error} <button type="button" onClick={load} className="ml-2 font-bold text-amber-400">tentar novamente</button></div> : null}
      {!loading && res && list.length === 0 ? <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-8 text-center text-[0.72rem] text-zinc-500">{res.aviso ?? "Nenhum desapito para estes filtros."}</div> : null}
      <div className="grid gap-2 sm:grid-cols-2">{list.map((d) => <DesapitoCard key={d.id} d={d} />)}</div>
      <p className="px-1 text-[0.54rem] leading-relaxed text-zinc-500">Discrepância = média do time − linha. Linhas de gols vêm da fonte (odds) quando disponíveis; escanteios, chutes, cartões e faltas usam linhas de referência padrão do mercado (as casas não publicam essas linhas nas APIs conectadas). Conteúdo informativo · +18.</p>
    </div>
  );
}
