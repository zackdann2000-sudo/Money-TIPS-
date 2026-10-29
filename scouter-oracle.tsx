"use client";

import { useCallback, useEffect, useState } from "react";

type OracleResponse = {
  matchId: number;
  xgCasa: number;
  xgFora: number;
  pressao: string;
  veredito: "MANTER" | "COBRIR" | "MUDAR" | "SAIR";
  explicacao: string;
  selo: "real" | "demo";
  metricas: { chave: string; label: string; aoVivo: { casa: number; fora: number }; mediaUltimos10: { casa: number | null; fora: number | null; jogosCasa: number; jogosFora: number }; ritmo: { casa: number | null; fora: number | null }; selo: "real" | "demo"; fonte: string }[];
  detalhes: {
    pressaoIndice: number;
    pressaoLado: "casa" | "fora" | "equilibrada";
    vermelhoRecente: boolean;
    minuto: number;
    placar: string;
    status: string;
    fonteXg: string;
    fonteProbabilidades: string;
    xgEstimado: boolean;
    probabilidades: { casa: number; empate: number; fora: number } | null;
    fontesTentadas: { fonte: string; ok: boolean; detalhe: string }[];
    atualizadoEm: string;
  };
};

const SELO: Record<OracleResponse["veredito"], { cor: string; fundo: string; icone: string; titulo: string }> = {
  MANTER: { cor: "text-emerald-300", fundo: "from-emerald-500/25 to-emerald-900/20 ring-emerald-500/50", icone: "🟢", titulo: "Manter a posição" },
  COBRIR: { cor: "text-amber-300", fundo: "from-amber-500/25 to-amber-900/20 ring-amber-500/50", icone: "🟡", titulo: "Cobrir / proteger" },
  MUDAR: { cor: "text-sky-300", fundo: "from-sky-500/25 to-sky-900/20 ring-sky-500/50", icone: "🔵", titulo: "Mudar de lado" },
  SAIR: { cor: "text-rose-300", fundo: "from-rose-500/25 to-rose-900/20 ring-rose-500/50", icone: "🔴", titulo: "Sair da posição" },
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function ScouterOracle({ matchId, casa, fora, autoRefreshMs = 60000 }: { matchId: number; casa: string; fora: string; autoRefreshMs?: number }) {
  const [data, setData] = useState<OracleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jogos/${matchId}/oracle`, { cache: "no-store" });
      const body = (await response.json()) as OracleResponse | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : `HTTP ${response.status}`);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao consultar o Oracle.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
    if (!autoRefreshMs) return;
    const timer = setInterval(load, autoRefreshMs);
    return () => clearInterval(timer);
  }, [load, autoRefreshMs]);

  const selo = data ? SELO[data.veredito] : null;
  const total = data ? data.xgCasa + data.xgFora : 0;
  const share = total > 0 && data ? (data.xgCasa / total) * 100 : 50;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 px-4 py-3">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-emerald-400">Scouter Oracle</p>
          <p className="text-[0.8rem] font-extrabold">Veredito de intervalo · {casa} x {fora}</p>
        </div>
        {data ? <span className={`rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase ${data.selo === "real" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{data.selo === "real" ? "dados reais" : "demo"}</span> : null}
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[0.62rem] font-bold text-zinc-300 transition hover:border-emerald-500/50 disabled:opacity-50">
          {loading ? "Analisando…" : "↻ Atualizar"}
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-3 px-4 py-4">
          <div className="h-16 animate-pulse rounded-xl bg-zinc-900" />
          <div className="grid grid-cols-2 gap-2"><div className="h-14 animate-pulse rounded-xl bg-zinc-900" /><div className="h-14 animate-pulse rounded-xl bg-zinc-900" /></div>
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-900" />
          <p className="text-center text-[0.62rem] text-zinc-500">Consultando Sportmonks → Bzzoiro → dados oficiais da partida…</p>
        </div>
      ) : error ? (
        <div className="px-4 py-5 text-center">
          <p className="text-[0.8rem] font-bold text-rose-400">⚠️ {error}</p>
          <button type="button" onClick={load} className="mt-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-[0.66rem] font-bold text-zinc-200">Tentar novamente</button>
        </div>
      ) : data && selo ? (
        <div className="space-y-3 px-4 py-4">
          <div className={`rounded-2xl bg-gradient-to-br ${selo.fundo} p-4 ring-1`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-[2rem] font-black leading-none tracking-tight ${selo.cor}`}>{selo.icone} {data.veredito}</p>
                <p className="mt-1 text-[0.72rem] font-semibold text-zinc-300">{selo.titulo}</p>
              </div>
              <div className="text-right text-[0.62rem] text-zinc-400">
                <p>{data.detalhes.status === "finished" ? "Encerrado" : `${data.detalhes.minuto}′`} · {data.detalhes.placar}</p>
                <p>{data.pressao}</p>
                {data.detalhes.vermelhoRecente ? <p className="font-bold text-rose-300">🟥 vermelho recente</p> : null}
              </div>
            </div>
            <p className="mt-2 text-[0.72rem] leading-relaxed text-zinc-200">{data.explicacao}</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-[0.66rem] font-bold">
              <span className="text-emerald-300">{casa} · xG {data.xgCasa.toFixed(2)}</span>
              <span className="text-[0.58rem] uppercase tracking-wide text-zinc-500">{data.detalhes.xgEstimado ? "xG estimado" : "xG"}</span>
              <span className="text-sky-300">xG {data.xgFora.toFixed(2)} · {fora}</span>
            </div>
            <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-zinc-800"><div className="bg-emerald-500" style={{ width: `${share}%` }} /><div className="bg-sky-500" style={{ width: `${100 - share}%` }} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[0.62rem] text-zinc-400"><span>Pressão ofensiva recente</span><span className="font-bold text-zinc-200">{data.detalhes.pressaoIndice}% casa · {100 - data.detalhes.pressaoIndice}% fora</span></div>
            <div className="relative mt-1 h-2 rounded-full bg-zinc-800">
              <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
              <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ left: `${Math.min(data.detalhes.pressaoIndice, 50)}%`, width: `${Math.abs(data.detalhes.pressaoIndice - 50)}%` }} />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="grid grid-cols-[1fr_4.2rem_4.2rem_3rem] items-center gap-1 bg-zinc-900 px-2.5 py-1.5 text-[0.55rem] font-bold uppercase tracking-wide text-zinc-500"><span>Ao vivo × média últimos 10</span><span className="text-center text-emerald-300">{casa}</span><span className="text-center text-sky-300">{fora}</span><span className="text-center">selo</span></div>
            {data.metricas.map((m) => (
              <div key={m.chave} className="grid grid-cols-[1fr_4.2rem_4.2rem_3rem] items-center gap-1 border-t border-zinc-900 px-2.5 py-1.5 text-[0.66rem]">
                <span className="font-semibold text-zinc-200">{m.label}<span className="block text-[0.52rem] font-normal text-zinc-500">média {m.mediaUltimos10.casa ?? "—"} · {m.mediaUltimos10.fora ?? "—"} ({m.mediaUltimos10.jogosCasa}/{m.mediaUltimos10.jogosFora} j)</span></span>
                <span className="text-center tabular-nums"><b>{Number.isInteger(m.aoVivo.casa) ? m.aoVivo.casa : m.aoVivo.casa.toFixed(2)}</b>{m.ritmo.casa !== null ? <span className={`block text-[0.52rem] ${m.ritmo.casa >= 1.2 ? "text-emerald-400" : m.ritmo.casa <= 0.7 ? "text-rose-400" : "text-zinc-500"}`}>{m.ritmo.casa}×</span> : null}</span>
                <span className="text-center tabular-nums"><b>{Number.isInteger(m.aoVivo.fora) ? m.aoVivo.fora : m.aoVivo.fora.toFixed(2)}</b>{m.ritmo.fora !== null ? <span className={`block text-[0.52rem] ${m.ritmo.fora >= 1.2 ? "text-emerald-400" : m.ritmo.fora <= 0.7 ? "text-rose-400" : "text-zinc-500"}`}>{m.ritmo.fora}×</span> : null}</span>
                <span className="flex justify-center"><span className={`rounded-full px-1.5 py-0.5 text-[0.5rem] font-black ${m.selo === "real" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{m.selo}</span></span>
              </div>
            ))}
            <p className="border-t border-zinc-900 px-2.5 py-1 text-[0.52rem] text-zinc-500">ritmo = valor ao vivo ÷ (média dos últimos 10 × fração do jogo decorrida) · selo <b>real</b> exige dado ao vivo de fonte oficial E ≥3 jogos de média para cada time.</p>
          </div>

          {data.detalhes.probabilidades ? (
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[["Casa", data.detalhes.probabilidades.casa, "text-emerald-300"], ["Empate", data.detalhes.probabilidades.empate, "text-zinc-200"], ["Fora", data.detalhes.probabilidades.fora, "text-sky-300"]].map(([label, v, cor]) => (
                <div key={label as string} className="rounded-xl bg-zinc-900 px-2 py-2"><p className={`text-[1rem] font-black ${cor}`}>{pct(v as number)}</p><p className="text-[0.56rem] uppercase tracking-wide text-zinc-500">{label as string}</p></div>
              ))}
            </div>
          ) : <p className="rounded-xl bg-zinc-900 px-3 py-2 text-center text-[0.62rem] text-zinc-500">Probabilidades indisponíveis para esta partida.</p>}

          <div className="rounded-xl border border-zinc-800 px-3 py-2 text-[0.6rem] text-zinc-400">
            <p><span className="text-zinc-500">xG:</span> {data.detalhes.fonteXg}</p>
            <p><span className="text-zinc-500">Probabilidades:</span> {data.detalhes.fonteProbabilidades}</p>
            <button type="button" onClick={() => setShowSources((v) => !v)} className="mt-1 font-bold text-emerald-400">{showSources ? "ocultar" : "ver"} fontes consultadas ({data.detalhes.fontesTentadas.length})</button>
            {showSources ? (
              <ul className="mt-1 space-y-0.5">
                {data.detalhes.fontesTentadas.map((f, i) => <li key={i}><span className={f.ok ? "text-emerald-400" : "text-rose-400"}>{f.ok ? "✓" : "✗"}</span> <b className="text-zinc-300">{f.fonte}</b> — {f.detalhe}</li>)}
              </ul>
            ) : null}
            <p className="mt-1 text-zinc-500">Atualizado {new Date(data.detalhes.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })} · leitura informativa, não é garantia de resultado.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
