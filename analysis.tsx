import Link from "next/link";
import type { MatchRow } from "@/lib/data";
import type { Analysis } from "@/lib/predict";
import type { Markets } from "@/lib/model";
import type { TeamForm } from "@/lib/history";
import { formatKickoff } from "@/lib/utils";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const f1 = (v: number) => v.toFixed(2);

/** Badge do tipo de modelo: "dc-poisson-1.0" (completo) ou "Modelo Simplificado" (fallback). */
export function ModelBadge({ modelType, version }: { modelType: Analysis["modelType"]; version: string }) {
  if (modelType === "sem_dados") return <span className="chip !border-zinc-500/40 !bg-zinc-500/10 !text-zinc-400">⏳ em processamento</span>;
  if (modelType === "fallback_simples") return <span className="chip !border-sky-500/40 !bg-sky-500/10 !text-sky-500" title="Média de gols das últimas 10 partidas gerais de cada time (todas as competições)">📐 Modelo Simplificado</span>;
  return <span className="chip !border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" title="Poisson bivariado com correção Dixon-Coles">🧠 {version}</span>;
}

/** Card neutro (cinza) exibido no lugar do erro quando ainda não há histórico indexado. */
export function ProcessingCard({ homeName, awayName }: { homeName: string; awayName: string }) {
  return (
    <div className="card flex items-start gap-3 border-zinc-500/30 bg-[var(--surface-3)] px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-500/15 text-lg">⏳</span>
      <div>
        <p className="text-[0.82rem] font-extrabold">Análise em processamento</p>
        <p className="mt-0.5 text-[0.7rem] leading-relaxed muted">O histórico recente deste confronto ainda está sendo indexado pelo modelo. As probabilidades de {homeName} x {awayName} aparecem automaticamente assim que houver partidas recentes dos dois times na base.</p>
        <div className="mt-2 flex gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" /></div>
      </div>
    </div>
  );
}

export function QualityBadge({ quality, sampleHome, sampleAway }: { quality: Analysis["quality"]; sampleHome: number; sampleAway: number }) {
  const tone = quality === "alta" ? "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" : quality === "media" ? "!border-sky-500/40 !bg-sky-500/10 !text-sky-500" : quality === "baixa" ? "!border-amber-500/40 !bg-amber-500/10 !text-amber-500" : "!border-zinc-500/40 !bg-zinc-500/10 !text-zinc-400";
  const label = quality === "insuficiente" ? "indexando histórico" : `dados: ${quality}`;
  return <span className={`chip ${tone}`} title="Critério: jogos de cada equipe na base (≥15 e ≥150 na liga = alta · ≥8 = média · ≥5 = baixa · <5 = insuficiente)">{label} · {sampleHome}/{sampleAway} jogos</span>;
}

export function ProbBar({ m, homeShort, awayShort, title }: { m: Markets; homeShort: string; awayShort: string; title?: string }) {
  return (
    <div>
      {title ? <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-wide muted">{title}</p> : null}
      <div className="flex h-7 overflow-hidden rounded-lg text-[0.62rem] font-black text-white">
        <div className="flex items-center justify-center bg-emerald-600" style={{ width: `${m.home * 100}%` }}>{m.home >= 0.12 ? `${homeShort} ${pct(m.home)}` : ""}</div>
        <div className="flex items-center justify-center bg-slate-500" style={{ width: `${m.draw * 100}%` }}>{m.draw >= 0.12 ? `E ${pct(m.draw)}` : ""}</div>
        <div className="flex items-center justify-center bg-sky-600" style={{ width: `${m.away * 100}%` }}>{m.away >= 0.12 ? `${awayShort} ${pct(m.away)}` : ""}</div>
      </div>
      <div className="mt-1 flex justify-between text-[0.6rem] muted">
        <span>{homeShort} {pct(m.home)}</span><span>Empate {pct(m.draw)}</span><span>{awayShort} {pct(m.away)}</span>
      </div>
    </div>
  );
}

export function MarketGrid({ m, homeShort, awayShort }: { m: Markets; homeShort: string; awayShort: string }) {
  const items: [string, number][] = [
    ["Mais de 0.5 Gols", m.over05], ["Mais de 1.5 Gols", m.over15], ["Mais de 2.5 Gols", m.over25], ["Menos de 2.5 Gols", m.under25],
    ["Mais de 3.5 Gols", m.over35], ["Ambos marcam", m.btts], [`${homeShort} marca`, m.homeScores], [`${awayShort} marca`, m.awayScores],
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {items.map(([label, p]) => (
        <div key={label} className="rounded-xl border px-2.5 py-2 hairline">
          <div className="flex items-center justify-between"><span className="text-[0.64rem] font-semibold">{label}</span><span className="text-[0.8rem] font-black tabular-nums text-emerald-500">{pct(p)}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full bg-emerald-500" style={{ width: `${p * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Scorelines({ m }: { m: Markets }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {m.scorelines.map((s, i) => (
        <span key={s.score} className={`chip ${i === 0 ? "!border-emerald-500/50 !bg-emerald-500/10 !text-emerald-500" : ""}`}>{s.score} <b className="ml-1">{pct(s.p)}</b></span>
      ))}
    </div>
  );
}

function FormLine({ label, f }: { label: string; f: TeamForm }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-[0.68rem]">
      <span className="w-24 shrink-0 muted">{label}</span>
      <span className="flex gap-0.5">{f.sequence.map((r, i) => <span key={i} className={`flex h-4 w-4 items-center justify-center rounded text-[0.55rem] font-black text-white ${r === "V" ? "bg-emerald-500" : r === "E" ? "bg-slate-400" : "bg-rose-500"}`}>{r}</span>)}</span>
      <span className="flex-1 text-right tabular-nums">{f.played ? `${f.wins}V ${f.draws}E ${f.losses}D · ${f1(f.gf / f.played)} GP · ${f1(f.ga / f.played)} GC · ${f.cleanSheets} CS` : "—"}</span>
    </div>
  );
}

export function AnalysisPanel({ match, a, history }: { match: MatchRow; a: Analysis; history: { id: number; kind: string; createdAt: Date; minute: number; scoreAtPrediction: string; probs: Record<string, number>; dataQuality: string; settled: boolean; brier: string }[] }) {
  const hs = match.homeShort, as = match.awayShort;
  const updated = formatKickoff(a.asOf, true);
  return (
    <div className="space-y-3">
      <div className="card px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">🧠 IA Analista</span>
          <ModelBadge modelType={a.modelType} version={a.version} />
          <QualityBadge quality={a.quality} sampleHome={a.sampleHome} sampleAway={a.sampleAway} />
          <span className="chip">{a.matchesUsed} jogos no modelo</span>
          <span className="chip">dados de {updated}</span>
          <span className="chip">{match.status === "live" ? `ao vivo ${match.minute}′` : match.status === "finished" ? "encerrado" : `agendado ${formatKickoff(match.kickoff, true)}`}</span>
        </div>
      </div>

      {!a.pre || a.modelType === "sem_dados" ? (
        <ProcessingCard homeName={match.homeName} awayName={match.awayName} />
      ) : (
        <>
          <section className="card space-y-3 px-3 py-3">
            <ProbBar m={a.pre} homeShort={hs} awayShort={as} title="Previsão pré-jogo (1X2)" />
            {a.live ? (
              <>
                <ProbBar m={a.live} homeShort={hs} awayShort={as} title={`Probabilidade atualizada · ${match.minute}′ · placar ${match.homeScore}-${match.awayScore}`} />
                <p className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[0.62rem] text-emerald-700 dark:text-emerald-300">{a.liveNote}</p>
              </>
            ) : null}
            {match.status === "finished" ? <p className="rounded-lg bg-[var(--surface-3)] px-2 py-1.5 text-[0.64rem]"><b>Resultado observado:</b> {match.homeName} {match.homeScore} x {match.awayScore} {match.awayName}. A previsão pré-jogo acima é a que foi registrada antes da partida (quando existente).</p> : null}
            <div className="grid grid-cols-2 gap-2 text-[0.68rem]">
              <div className="rounded-xl bg-[var(--surface-3)] px-2.5 py-2"><p className="muted">Gols esperados {hs}</p><p className="text-[1rem] font-black">{f1((a.live ?? a.pre).lambdaHome)} <span className="text-[0.6rem] font-semibold muted">faixa {a.pre.homeGoalsRange[0]}–{a.pre.homeGoalsRange[1]}</span></p></div>
              <div className="rounded-xl bg-[var(--surface-3)] px-2.5 py-2"><p className="muted">Gols esperados {as}</p><p className="text-[1rem] font-black">{f1((a.live ?? a.pre).lambdaAway)} <span className="text-[0.6rem] font-semibold muted">faixa {a.pre.awayGoalsRange[0]}–{a.pre.awayGoalsRange[1]}</span></p></div>
            </div>
          </section>

          <section className="card px-3 py-3">
            <p className="mb-2 text-[0.78rem] font-extrabold">📊 Probabilidades de gols {a.live ? "(atualizadas ao vivo)" : ""}</p>
            <MarketGrid m={a.live ?? a.pre} homeShort={hs} awayShort={as} />
            <p className="mt-2 mb-1 text-[0.66rem] font-bold">Placares mais prováveis</p>
            <Scorelines m={a.live ?? a.pre} />
            <p className="mt-2 text-[0.58rem] muted">{a.modelType === "fallback_simples" ? `Modelo Simplificado: média de gols das últimas ${a.sampleHome}/${a.sampleAway} partidas gerais de cada time (todas as competições), encolhida para a média da liga; probabilidades derivadas da distribuição de Poisson.` : `Todas as probabilidades derivam da mesma distribuição de placares (Poisson bivariado com correção Dixon-Coles, ρ = ${a.ratings?.rho}).`} 1X2 soma 100%; over/under são complementares.</p>
          </section>

          <section className="card px-3 py-3">
            <p className="text-[0.78rem] font-extrabold">🧠 Relatório da IA</p>
            {/* 1. Resumo do confronto */}
            <p className="mt-0.5 text-[0.58rem] font-bold uppercase tracking-wide muted">1 · Resumo do confronto</p>
            <p className="mt-1 text-[0.72rem] leading-relaxed">{a.explanation.resumo}</p>

            {/* 2. Médias comparadas */}
            {a.explanation.mediasComparadas.length ? (
              <>
                <p className="mt-3 text-[0.58rem] font-bold uppercase tracking-wide muted">2 · Médias comparadas · {match.homeShort} vs {match.awayShort}</p>
                <div className="mt-1 overflow-hidden rounded-xl border hairline">
                  <div className="grid grid-cols-[1fr_3.2rem_3.2rem] gap-1 bg-[var(--surface-3)] px-2.5 py-1 text-[0.55rem] font-bold uppercase muted"><span>Métrica</span><span className="text-center text-emerald-500">{match.homeShort}</span><span className="text-center text-sky-500">{match.awayShort}</span></div>
                  {a.explanation.mediasComparadas.map((m) => (
                    <div key={m.metrica} className="grid grid-cols-[1fr_3.2rem_3.2rem] items-center gap-1 border-t px-2.5 py-1.5 text-[0.66rem] hairline"><span>{m.metrica}{m.leitura ? <span className="block text-[0.54rem] muted">{m.leitura}</span> : null}</span><span className="text-center font-black tabular-nums">{m.casa}</span><span className="text-center font-black tabular-nums">{m.fora}</span></div>
                  ))}
                </div>
              </>
            ) : null}

            {/* 3. Mercados em destaque */}
            <p className="mt-3 text-[0.58rem] font-bold uppercase tracking-wide muted">3 · Mercados em destaque (últimos 10 jogos reais)</p>
            {a.explanation.mercadosDestaque.length ? (
              <ul className="mt-1 space-y-1">
                {a.explanation.mercadosDestaque.map((m) => (
                  <li key={`${m.time}-${m.mercado}`} className="flex items-center gap-2 rounded-lg bg-emerald-500/5 px-2.5 py-1.5 text-[0.66rem]"><span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[0.6rem] font-black text-emerald-950">{m.acertos}/{m.total}</span><span>{m.texto}</span></li>
                ))}
              </ul>
            ) : <p className="mt-1 text-[0.64rem] muted">Nenhuma linha atingiu 7 de 10 nos últimos jogos reais das equipes.</p>}

            {/* 4. Alerta de incerteza */}
            {a.explanation.alertasIncerteza.length ? (
              <>
                <p className="mt-3 text-[0.58rem] font-bold uppercase tracking-wide muted">4 · Alerta de incerteza</p>
                <ul className="mt-1 space-y-1">{a.explanation.alertasIncerteza.map((t, i) => <li key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[0.64rem] leading-relaxed text-amber-700 dark:text-amber-300">⚠️ {t}</li>)}</ul>
              </>
            ) : null}

            <p className="mt-3 text-[0.58rem] font-bold uppercase tracking-wide muted">Detalhes</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/30 px-2.5 py-2"><p className="text-[0.7rem] font-bold text-emerald-500">Pontos do {match.homeName}</p><ul className="mt-1 space-y-1 text-[0.66rem] leading-relaxed">{a.explanation.mandante.map((t, i) => <li key={i}>• {t}</li>)}</ul></div>
              <div className="rounded-xl border border-sky-500/30 px-2.5 py-2"><p className="text-[0.7rem] font-bold text-sky-500">Pontos do {match.awayName}</p><ul className="mt-1 space-y-1 text-[0.66rem] leading-relaxed">{a.explanation.visitante.map((t, i) => <li key={i}>• {t}</li>)}</ul></div>
            </div>
            <p className="mt-2 text-[0.7rem] font-bold">Fatores decisivos</p>
            <div className="mt-1 divide-y divide-[var(--line)] rounded-xl border hairline">
              {a.explanation.fatores.map((f) => <div key={f.fator} className="flex flex-col gap-0.5 px-2.5 py-1.5 text-[0.66rem] sm:flex-row sm:gap-2"><span className="w-44 shrink-0 font-bold">{f.fator}</span><span className="muted">{f.impacto}</span></div>)}
            </div>
            <p className="mt-2 text-[0.7rem] font-bold">Cenários</p>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-3">
              {a.explanation.cenarios.map((c) => <div key={c.titulo} className="rounded-xl bg-[var(--surface-3)] px-2.5 py-2"><p className="text-[0.68rem] font-bold">{c.titulo} <span className="text-emerald-500">{pct(c.p)}</span></p><p className="mt-0.5 text-[0.62rem] leading-relaxed muted">{c.texto}</p></div>)}
            </div>
            <p className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2 text-[0.7rem] leading-relaxed"><b>Conclusão:</b> {a.explanation.conclusao}</p>
            {a.explanation.indisponivel.length ? <p className="mt-1.5 text-[0.6rem] muted"><b>Não disponível nesta análise:</b> {a.explanation.indisponivel.join("; ")}.</p> : null}
            <p className="mt-1 text-[0.58rem] muted">{a.explanation.motor}.</p>
          </section>
        </>
      )}

      {a.form ? (
        <section className="card px-3 py-3">
          <p className="text-[0.78rem] font-extrabold">📈 Desempenho recente</p>
          <div className="mt-1 divide-y divide-[var(--line)]">
            <FormLine label={`${hs} últimos 5`} f={a.form.home5} />
            <FormLine label={`${hs} últimos 10`} f={a.form.home10} />
            <FormLine label={`${hs} em casa`} f={a.form.homeAtHome} />
            <FormLine label={`${as} últimos 5`} f={a.form.away5} />
            <FormLine label={`${as} últimos 10`} f={a.form.away10} />
            <FormLine label={`${as} fora`} f={a.form.awayAtAway} />
          </div>
          <p className="mt-1 text-[0.56rem] muted">GP = gols pró por jogo · GC = gols contra por jogo · CS = jogos sem sofrer gol. Sequência da esquerda (mais recente) para a direita.</p>
          {a.table?.home && a.table?.away ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[0.66rem]">
              {[a.table.home, a.table.away].map((r) => (
                <div key={r.team} className="rounded-xl bg-[var(--surface-3)] px-2.5 py-2">
                  <p className="font-bold">{r.rank}º {r.name}</p>
                  <p className="muted">{r.points} pts em {r.played} j · {r.wins}V {r.draws}E {r.losses}D · {r.gf}:{r.ga} · aproveitamento {Math.round((r.points / Math.max(1, r.played * 3)) * 100)}%</p>
                  <p className="muted">casa {r.homePts} pts/{r.homePlayed} j · fora {r.awayPts} pts/{r.awayPlayed} j</p>
                </div>
              ))}
            </div>
          ) : null}
          {a.rest.home !== null || a.rest.away !== null ? <p className="mt-1.5 text-[0.62rem] muted">Descanso: {hs} {a.rest.home ?? "—"} dia(s) · {as} {a.rest.away ?? "—"} dia(s) desde o último jogo na base.</p> : null}
        </section>
      ) : null}

      {a.h2h && a.h2h.n > 0 ? (
        <section className="card px-3 py-3">
          <p className="text-[0.78rem] font-extrabold">🔁 Confronto direto <span className="text-[0.62rem] font-semibold muted">({a.h2h.n} jogos na base · {hs} {a.h2h.aWins}V · {a.h2h.draws}E · {as} {a.h2h.bWins}V · gols {a.h2h.aGoals}:{a.h2h.bGoals})</span></p>
          <div className="mt-1 divide-y divide-[var(--line)] text-[0.66rem]">
            {a.h2h.games.map((g, i) => <div key={i} className="flex items-center justify-between py-1"><span className="muted">{g.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span><span>{g.home} <b>{g.hg} x {g.ag}</b> {g.away}</span></div>)}
          </div>
          <p className="mt-1 text-[0.56rem] muted">Histórico serve de contexto — não é tratado como garantia de repetição.</p>
        </section>
      ) : null}

      <section className="card px-3 py-3">
        <p className="text-[0.78rem] font-extrabold">🎯 Projeções de estatísticas</p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {a.projections.items.map((p) => (
            <div key={p.label} className="rounded-xl border px-2.5 py-2 hairline">
              <div className="flex items-center justify-between"><span className="text-[0.68rem] font-bold">{p.icon} {p.label}</span>{p.total !== null ? <span className="text-[0.82rem] font-black text-emerald-500">{p.label === "Posse de bola" ? `${p.home}% · ${p.away}%` : p.total}</span> : <span className="chip !border-amber-500/40 !py-0 !text-amber-500">indisponível</span>}</div>
              <p className="text-[0.58rem] muted">{p.total !== null && p.label !== "Posse de bola" ? `${hs} ${p.home} · ${as} ${p.away}${p.range ? ` · faixa ${p.range[0]}–${p.range[1]}` : ""} · ` : ""}{p.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[0.56rem] leading-relaxed muted">{a.projections.sampleNote} Fonte: ESPN (estatísticas oficiais por partida). Estimativa = 70% médias dos próprios times + 30% média da liga; faixa = ±22–35% conforme a amostra.</p>
      </section>

      {history.length ? (
        <section className="card px-3 py-3">
          <p className="text-[0.78rem] font-extrabold">🗂️ Histórico de previsões registradas</p>
          <div className="mt-1 divide-y divide-[var(--line)] text-[0.64rem]">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-1 py-1">
                <span className="muted">{formatKickoff(h.createdAt, true)} · {h.kind === "live" ? `ao vivo ${h.minute}′ (${h.scoreAtPrediction})` : "pré-jogo"} · {h.dataQuality}</span>
                <span className="tabular-nums">{pct(Number(h.probs.home))} / {pct(Number(h.probs.draw))} / {pct(Number(h.probs.away))}{h.settled ? <span className="ml-1 text-emerald-500">· Brier {h.brier}</span> : null}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <p className="px-1 text-[0.58rem] leading-relaxed muted">Probabilidades são estimativas estatísticas, não certezas. Metodologia e desempenho histórico do modelo em <Link href="/ia/desempenho" className="font-bold text-[var(--brand)]">IA → Desempenho</Link>. Conteúdo informativo · +18 · jogue com responsabilidade.</p>
    </div>
  );
}
