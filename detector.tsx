"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { BuscaResultado, Categoria, Local, Periodo, ResultadoJogo } from "@/lib/detector";
import { DataFooter } from "@/components/ui";

type Cat = { key: Categoria; icon: string; linhas: number[]; semLinha?: boolean; suporta1T: boolean };
type Liga = { code: string; name: string; flag: string; country?: string };

const TZ = "America/Sao_Paulo";
const dayKeyLocal = (d: Date) => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d); const g = (t: string) => p.find((x) => x.type === t)?.value ?? ""; return `${g("year")}-${g("month")}-${g("day")}`; };
const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function Crest({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} loading="lazy" className="object-contain" style={{ width: size, height: size }} />
  ) : <span className="flex items-center justify-center rounded-full bg-zinc-800 text-[0.55rem] font-black text-zinc-300" style={{ width: size, height: size }}>{name.slice(0, 3).toUpperCase()}</span>;
}

function Step({ n, title, summary, open, onToggle, children }: { n: number; title: string; summary: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border ${open ? "border-sky-500/40" : "border-zinc-800"} bg-zinc-950`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-black ${open ? "bg-sky-500 text-sky-950" : "bg-zinc-800 text-zinc-300"}`}>{n}</span>
        <span className="min-w-0 flex-1"><span className="block text-[0.72rem] font-extrabold text-zinc-100">{title}</span><span className="block truncate text-[0.6rem] text-zinc-400">{summary}</span></span>
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-zinc-900 px-3 py-3">{children}</div> : null}
    </div>
  );
}

/* ------------------------------ Resultados ------------------------------ */
function ResultCard({ r }: { r: ResultadoJogo }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
      <p className="text-[0.58rem] font-semibold text-zinc-400">{r.pais ? `${r.pais} - ` : ""}{r.liga} - {r.horario}h{r.status === "live" ? " · AO VIVO" : r.status === "finished" ? " · ENCERRADO" : ""}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className={`flex items-center gap-2 ${r.timeAnalisado.lado === "casa" ? "" : "opacity-60"}`}><Crest src={r.casa.logo} name={r.casa.nome} size={22} /><span className="truncate text-[0.76rem] font-bold">{r.casa.nome}</span>{r.timeAnalisado.lado === "casa" ? <span className="rounded bg-sky-500/20 px-1 text-[0.5rem] font-bold text-sky-300">analisado</span> : null}</div>
          <div className={`flex items-center gap-2 ${r.timeAnalisado.lado === "fora" ? "" : "opacity-60"}`}><Crest src={r.fora.logo} name={r.fora.nome} size={22} /><span className="truncate text-[0.76rem] font-bold">{r.fora.nome}</span>{r.timeAnalisado.lado === "fora" ? <span className="rounded bg-sky-500/20 px-1 text-[0.5rem] font-bold text-sky-300">analisado</span> : null}</div>
        </div>
        <div className="flex flex-col items-center px-2 text-center">
          <p className="text-[0.62rem] font-bold text-zinc-300">{r.mercado.split(" · ")[0]}</p>
          <p className="text-[0.52rem] text-zinc-500">{r.mercado.split(" · ")[1]}</p>
          <p className={`mt-1 text-[0.9rem] font-black ${r.taxa >= 70 ? "text-emerald-400" : "text-zinc-300"}`}>({r.acertos}/{r.total}){r.baseParcial ? <span className="ml-1 text-[0.5rem] font-bold text-amber-400">Base Parcial</span> : null}</p>
          <div className="mt-1 flex gap-[3px]">{r.historico.map((h, i) => <span key={i} title={`${h.data.slice(8, 10)}/${h.data.slice(5, 7)} ${h.emCasa ? "vs" : "@"} ${h.adversario} ${h.placar}${h.valor !== null && h.valor !== 1 && h.valor !== 0 ? ` · ${h.valor}` : ""}`} className={`h-2.5 w-2.5 rounded-full ${h.acerto ? "bg-emerald-500" : "bg-rose-500"}`} />)}</div>
          <p className="text-[0.48rem] text-zinc-600">{r.taxa}% · {r.fonte}</p>
        </div>
        <Link href={`/jogos/${r.matchId}/centro`} className="shrink-0 rounded-xl bg-yellow-400 px-2.5 py-2 text-[0.62rem] font-black text-yellow-950 hover:bg-yellow-300">VER TUDO ›</Link>
      </div>
      <div className="-mx-3 -mb-3 mt-2"><DataFooter dark fonte={r.fonte} amostra={r.total} /></div>
    </article>
  );
}

function Pagination({ pagina, paginas, onPage }: { pagina: number; paginas: number; onPage: (p: number) => void }) {
  if (paginas <= 1) return null;
  const items: (number | "…")[] = [];
  for (let p = 1; p <= paginas; p++) {
    if (p === 1 || p === paginas || Math.abs(p - pagina) <= 1) items.push(p);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" disabled={pagina <= 1} onClick={() => onPage(pagina - 1)} className="rounded-lg bg-zinc-900 px-2 py-1 text-[0.62rem] font-bold text-zinc-300 disabled:opacity-40">‹</button>
      {items.map((it, i) => it === "…" ? <span key={`e${i}`} className="px-1 text-[0.62rem] text-zinc-500">…</span> : <button key={it} type="button" onClick={() => onPage(it)} className={`min-w-7 rounded-lg px-2 py-1 text-[0.62rem] font-black ${it === pagina ? "bg-sky-500 text-sky-950" : "bg-zinc-900 text-zinc-300"}`}>{it}</button>)}
      <button type="button" disabled={pagina >= paginas} onClick={() => onPage(pagina + 1)} className="rounded-lg bg-zinc-900 px-2 py-1 text-[0.62rem] font-bold text-zinc-300 disabled:opacity-40">›</button>
    </div>
  );
}

/* --------------------------------- Tela --------------------------------- */
export default function Detector({ categorias, ligas }: { categorias: Cat[]; ligas: Liga[] }) {
  const today = useMemo(() => dayKeyLocal(new Date()), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() + i * 86400000); const key = dayKeyLocal(d); return { key, label: i === 0 ? "HOJE" : i === 1 ? "AMANHÃ" : WEEK[new Date(`${key}T12:00:00`).getDay()], num: key.slice(8, 10) }; }), []);

  const [open, setOpen] = useState(1);
  const [categoria, setCategoria] = useState<Categoria>("Gols");
  const [periodo, setPeriodo] = useState<Periodo>("Jogo Todo");
  const [linha, setLinha] = useState(1.5);
  const [data, setData] = useState(today);
  const [liga, setLiga] = useState("todas");
  const [amostra, setAmostra] = useState<5 | 10>(10);
  const [local, setLocal] = useState<Local>("ambos");
  const [res, setRes] = useState<BuscaResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cat = categorias.find((c) => c.key === categoria)!;

  const pickCategoria = (c: Cat) => { setCategoria(c.key); if (!c.semLinha) setLinha(c.linhas[Math.min(1, c.linhas.length - 1)]); if (!c.suporta1T) setPeriodo("Jogo Todo"); };

  const gerar = useCallback(async (pagina = 1) => {
    setLoading(true); setError(null);
    try {
      const q = new URLSearchParams({ categoria, periodo, linha: String(linha), data, liga, amostra: String(amostra), local, pagina: String(pagina) });
      const r = await fetch(`/api/detector?${q}`, { cache: "no-store" });
      const body = (await r.json()) as BuscaResultado & { error?: string };
      if (!r.ok || body.error) throw new Error(body.error ?? `HTTP ${r.status}`);
      setRes(body); setOpen(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao gerar resultados."); } finally { setLoading(false); }
  }, [categoria, periodo, linha, data, liga, amostra, local]);

  const resumoMercado = `${cat.icon} ${categoria}${cat.semLinha ? "" : ` > ${linha}`} · ${periodo}`;
  const ligaSel = ligas.find((l) => l.code === liga);

  return (
    <div className="space-y-3 text-zinc-100">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 px-4 py-3">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-sky-400">Scanner de oportunidades</p>
        <div className="flex items-center justify-between"><h1 className="text-[1.1rem] font-black">Detector</h1><Link href="/desapitos" className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[0.62rem] font-bold text-amber-400">📉 Desapitos →</Link></div>
        <p className="text-[0.64rem] text-zinc-400">Cruze mercado, data, liga, amostra e local para encontrar times com ≥70% de acerto nos últimos jogos reais.</p>
      </div>

      {/* Resultados */}
      {res ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div><p className="text-[0.74rem] font-extrabold">{res.total} resultado(s) · {resumoMercado}</p><p className="text-[0.58rem] text-zinc-400">{days.find((d) => d.key === data)?.label ?? data} · {ligaSel?.name} · últimos {amostra} · {local === "ambos" ? "casa e fora" : local} · {res.jogosAvaliados} jogos avaliados em {(res.tempoMs / 1000).toFixed(1)}s</p></div>
            <button type="button" onClick={() => { setRes(null); setOpen(1); }} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[0.62rem] font-bold text-zinc-200">✎ alterar filtros</button>
          </div>
          {res.aviso ? <p className="rounded-xl border border-amber-500/30 bg-zinc-950 px-3 py-3 text-center text-[0.7rem] text-amber-300">{res.aviso}</p> : null}
          {res.resultados.map((r) => <ResultCard key={`${r.matchId}-${r.timeAnalisado.lado}`} r={r} />)}
          <Pagination pagina={res.pagina} paginas={res.paginas} onPage={(p) => gerar(p)} />
          <p className="px-1 text-[0.54rem] leading-relaxed text-zinc-500">🟢 acertou a linha · 🔴 não acertou · mais recente à esquerda. "Base Parcial" = a fonte tem menos jogos que a amostra pedida (ex.: 3/4). Só histórico anterior ao jogo é usado. Conteúdo informativo · +18.</p>
        </section>
      ) : null}

      {/* Wizard */}
      {!res || open > 0 ? (
        <div className="space-y-2">
          <Step n={1} title="Mercado" summary={resumoMercado} open={open === 1} onToggle={() => setOpen(open === 1 ? 0 : 1)}>
            <p className="mb-1 text-[0.58rem] font-bold uppercase text-zinc-500">Categoria</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {categorias.map((c) => <button key={c.key} type="button" onClick={() => pickCategoria(c)} className={`rounded-xl px-2 py-2 text-left text-[0.68rem] font-bold ${categoria === c.key ? "bg-sky-500 text-sky-950" : "bg-zinc-900 text-zinc-300"}`}>{c.icon} {c.key}</button>)}
            </div>
            <p className="mb-1 mt-3 text-[0.58rem] font-bold uppercase text-zinc-500">Período</p>
            <div className="flex gap-1.5">{(["Jogo Todo", "1º Tempo"] as Periodo[]).map((p) => <button key={p} type="button" disabled={p === "1º Tempo" && !cat.suporta1T} onClick={() => setPeriodo(p)} className={`rounded-xl px-3 py-1.5 text-[0.66rem] font-bold disabled:opacity-30 ${periodo === p ? "bg-sky-500 text-sky-950" : "bg-zinc-900 text-zinc-300"}`}>{p}</button>)}{!cat.suporta1T ? <span className="self-center text-[0.55rem] text-zinc-500">1º tempo indisponível para {categoria}</span> : null}</div>
            {!cat.semLinha ? (<><p className="mb-1 mt-3 text-[0.58rem] font-bold uppercase text-zinc-500">Linha</p><div className="flex flex-wrap gap-1.5">{cat.linhas.map((l) => <button key={l} type="button" onClick={() => setLinha(l)} className={`rounded-xl px-3 py-1.5 text-[0.66rem] font-black ${linha === l ? "bg-sky-500 text-sky-950" : "bg-zinc-900 text-zinc-300"}`}>{categoria} &gt; {l}</button>)}</div></>) : null}
            <button type="button" onClick={() => setOpen(2)} className="mt-3 text-[0.64rem] font-bold text-sky-400">Próximo: Datas →</button>
          </Step>

          <Step n={2} title="Datas" summary={`${days.find((d) => d.key === data)?.label ?? data} · ${data.split("-").reverse().join("/")}`} open={open === 2} onToggle={() => setOpen(open === 2 ? 0 : 2)}>
            <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
              {days.map((d) => <button key={d.key} type="button" onClick={() => setData(d.key)} className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl px-2 py-1.5 text-[0.58rem] font-bold ${data === d.key ? "bg-sky-500 text-sky-950 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.9)]" : "bg-zinc-900 text-zinc-400"}`}><span>{d.label}</span><span className="text-[0.82rem] font-black">{d.num}</span></button>)}
            </div>
            <button type="button" onClick={() => setOpen(3)} className="mt-3 text-[0.64rem] font-bold text-sky-400">Próximo: Liga →</button>
          </Step>

          <Step n={3} title="Liga" summary={`${ligaSel?.flag ?? ""} ${ligaSel?.name ?? ""}`} open={open === 3} onToggle={() => setOpen(open === 3 ? 0 : 3)}>
            <select value={liga} onChange={(e) => setLiga(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[0.74rem] text-zinc-100">
              {ligas.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.name}{l.country ? ` · ${l.country}` : ""}</option>)}
            </select>
            <button type="button" onClick={() => setOpen(4)} className="mt-3 text-[0.64rem] font-bold text-sky-400">Próximo: Amostragem →</button>
          </Step>

          <Step n={4} title="Amostragem" summary={`Últimos ${amostra} jogos`} open={open === 4} onToggle={() => setOpen(open === 4 ? 0 : 4)}>
            <div className="flex gap-3">
              {([5, 10] as const).map((n) => <label key={n} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[0.7rem] font-bold ${amostra === n ? "border-sky-500 bg-sky-500/10 text-sky-300" : "border-zinc-800 bg-zinc-900 text-zinc-300"}`}><input type="radio" name="amostra" checked={amostra === n} onChange={() => setAmostra(n)} className="accent-sky-500" /> Últimos {n} jogos <span className="ml-auto text-[0.55rem] text-zinc-500">mín. {Math.ceil(n * 0.7)}/{n}</span></label>)}
            </div>
            <button type="button" onClick={() => setOpen(5)} className="mt-3 text-[0.64rem] font-bold text-sky-400">Próximo: Local →</button>
          </Step>

          <Step n={5} title="Local" summary={local === "casa" ? "Casa (mandantes, jogos em casa)" : local === "fora" ? "Fora (visitantes, jogos fora)" : "Ambos"} open={open === 5} onToggle={() => setOpen(open === 5 ? 0 : 5)}>
            <select value={local} onChange={(e) => setLocal(e.target.value as Local)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[0.74rem] text-zinc-100">
              <option value="casa">Casa — analisa o mandante nos seus últimos jogos em casa</option>
              <option value="fora">Fora — analisa o visitante nos seus últimos jogos fora</option>
              <option value="ambos">Ambos — analisa os dois times em todos os jogos</option>
            </select>
          </Step>

          <button type="button" onClick={() => gerar(1)} disabled={loading} className="w-full rounded-2xl bg-sky-600 py-3.5 text-[0.86rem] font-black tracking-wide text-white shadow-[0_12px_30px_-10px_rgba(37,99,235,0.9)] transition hover:bg-sky-500 disabled:opacity-60">
            {loading ? "ANALISANDO HISTÓRICOS…" : "GERAR RESULTADOS"}
          </button>
          {error ? <p className="rounded-xl border border-rose-500/40 bg-zinc-950 px-3 py-2 text-[0.7rem]"><b className="text-rose-400">Erro:</b> {error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
