"use client";

import { useState } from "react";

/* ----------------------------- Tipos públicos ----------------------------- */

export type MatchEvent = {
  minuto: string; // "4'", "45+2'", "90+5'"
  tipo: "gol" | "penalti" | "gol_contra" | "cartao_amarelo" | "cartao_vermelho" | "substituicao" | "var" | "penalti_perdido";
  time: "casa" | "fora";
  jogador?: string;
  assistencia?: string;
  placar?: string;
  jogador_saiu?: string;
  jogador_entrou?: string;
  observacao?: string;
};

export type MatchTeam = { nome: string; sigla: string; escudo?: string; cor?: string };

export type MatchStat = { label: string; casa: number; fora: number; sufixo?: string; icone?: string };

export type MatchLineup = { formacao: string; titulares: { numero: number; nome: string; posicao: string }[]; tecnico?: string };

export type MatchDetailsProps = {
  casa: MatchTeam;
  fora: MatchTeam;
  placar: { casa: number; fora: number };
  status: string; // "Encerrado" | "67'" | "Intervalo" | "Agendado"
  competicao: string;
  dataHora?: string;
  estadio?: string;
  eventos: MatchEvent[];
  estatisticas?: MatchStat[];
  avancadas?: MatchStat[];
  formacoes?: { casa: MatchLineup | null; fora: MatchLineup | null };
  fonte?: string;
  demo?: boolean;
};

/* ------------------------------- Mock (demo) ------------------------------ */

export const mockEvents: MatchEvent[] = [
  { minuto: "4'", tipo: "gol", time: "casa", jogador: "Castillo R.", assistencia: "Igor Rabello", placar: "1-0" },
  { minuto: "25'", tipo: "cartao_amarelo", time: "fora", jogador: "Barreal A." },
  { minuto: "49'", tipo: "gol", time: "fora", jogador: "Gabriel", assistencia: "Rodinei", placar: "1-1" },
  { minuto: "57'", tipo: "substituicao", time: "casa", jogador_saiu: "Hulk", jogador_entrou: "Savarino" },
  { minuto: "63'", tipo: "gol", time: "fora", jogador: "Vegetti", assistencia: "Paulo Henrique", placar: "1-2" },
  { minuto: "71'", tipo: "substituicao", time: "fora", jogador_saiu: "Barreal A.", jogador_entrou: "Lucas Piton" },
  { minuto: "83'", tipo: "cartao_vermelho", time: "casa", jogador: "Battaglia" },
  { minuto: "90+5'", tipo: "cartao_amarelo", time: "fora", jogador: "Savarino" },
];

/* -------------------------------- Helpers --------------------------------- */

const ICON: Record<MatchEvent["tipo"], string> = {
  gol: "⚽",
  penalti: "⚽",
  gol_contra: "⚽",
  cartao_amarelo: "🟨",
  cartao_vermelho: "🟥",
  substituicao: "🔄",
  var: "📺",
  penalti_perdido: "❌",
};

function minuteValue(minuto: string) {
  const m = minuto.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
}

function Crest({ team, size = 56 }: { team: MatchTeam; size?: number }) {
  if (team.escudo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.escudo} alt={team.nome} width={size} height={size} className="object-contain drop-shadow-lg" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex items-center justify-center rounded-full font-black text-white shadow-lg" style={{ width: size, height: size, fontSize: size * 0.32, background: `linear-gradient(140deg, ${team.cor ?? "#16a34a"}, #0f172a 140%)` }}>
      {team.sigla.slice(0, 3)}
    </span>
  );
}

/* ------------------------------ Timeline item ----------------------------- */

function EventCard({ e }: { e: MatchEvent }) {
  const isHome = e.time === "casa";
  const isGoal = e.tipo === "gol" || e.tipo === "penalti" || e.tipo === "gol_contra";
  const body = (
    <div className={`min-w-0 ${isHome ? "text-right" : "text-left"}`}>
      {e.tipo === "substituicao" ? (
        <>
          <p className="truncate text-[0.78rem] font-bold text-emerald-400">▲ {e.jogador_entrou}</p>
          <p className="truncate text-[0.7rem] text-rose-400">▼ {e.jogador_saiu}</p>
          {e.observacao ? <p className="text-[0.58rem] text-zinc-500">{e.observacao}</p> : null}
        </>
      ) : (
        <>
          <p className={`truncate text-[0.8rem] font-bold ${isGoal ? "text-white" : "text-zinc-200"}`}>
            {e.jogador}
            {e.tipo === "penalti" ? <span className="ml-1 text-[0.6rem] font-semibold text-zinc-400">(pên.)</span> : null}
            {e.tipo === "gol_contra" ? <span className="ml-1 text-[0.6rem] font-semibold text-rose-400">(contra)</span> : null}
            {e.tipo === "penalti_perdido" ? <span className="ml-1 text-[0.6rem] font-semibold text-rose-400">pênalti perdido</span> : null}
          </p>
          {e.assistencia ? <p className="truncate text-[0.66rem] text-zinc-400">assist. {e.assistencia}</p> : null}
          {e.observacao ? <p className="truncate text-[0.6rem] text-zinc-500">{e.observacao}</p> : null}
        </>
      )}
    </div>
  );
  return (
    <li className="relative grid grid-cols-[1fr_3.4rem_1fr] items-center gap-2 py-2">
      {/* lado casa */}
      <div className={`flex items-center justify-end gap-2 ${isHome ? "" : "invisible"}`}>
        {isHome ? body : null}
        {isHome ? <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${isGoal ? "bg-emerald-500/20 ring-1 ring-emerald-500/40" : "bg-zinc-800"}`}>{ICON[e.tipo]}</span> : null}
      </div>
      {/* minuto central */}
      <div className="flex flex-col items-center">
        <span className={`z-10 rounded-full px-2 py-0.5 text-[0.62rem] font-black tabular-nums ${isGoal ? "bg-emerald-500 text-emerald-950" : "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700"}`}>{e.minuto}</span>
        {isGoal && e.placar ? <span className="mt-0.5 text-[0.6rem] font-extrabold text-emerald-400">{e.placar}</span> : null}
      </div>
      {/* lado fora */}
      <div className={`flex items-center gap-2 ${isHome ? "invisible" : ""}`}>
        {!isHome ? <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${isGoal ? "bg-emerald-500/20 ring-1 ring-emerald-500/40" : "bg-zinc-800"}`}>{ICON[e.tipo]}</span> : null}
        {!isHome ? body : null}
      </div>
    </li>
  );
}

function Divider({ label, score }: { label: string; score?: string }) {
  return (
    <li className="relative my-1 flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-zinc-800" />
      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.14em] text-zinc-400">{label}{score ? <span className="ml-2 text-zinc-200">{score}</span> : null}</span>
      <span className="h-px flex-1 bg-zinc-800" />
    </li>
  );
}

function StatRow({ s }: { s: MatchStat }) {
  const total = s.casa + s.fora;
  const hp = total ? (s.casa / total) * 100 : 50;
  const homeLeads = s.casa > s.fora, awayLeads = s.fora > s.casa;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-[0.74rem] font-bold">
        <span className={`tabular-nums ${homeLeads ? "text-emerald-400" : "text-zinc-200"}`}>{s.casa}{s.sufixo ?? ""}</span>
        <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-zinc-400">{s.icone ? `${s.icone} ` : ""}{s.label}</span>
        <span className={`tabular-nums ${awayLeads ? "text-sky-400" : "text-zinc-200"}`}>{s.fora}{s.sufixo ?? ""}</span>
      </div>
      <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-zinc-800"><div className="h-full rounded-l-full bg-emerald-500" style={{ width: `${hp}%` }} /></div>
        <div className="flex flex-1 overflow-hidden rounded-r-full bg-zinc-800"><div className="h-full rounded-r-full bg-sky-500" style={{ width: `${100 - hp}%` }} /></div>
      </div>
    </div>
  );
}

function Lineup({ team, lineup, side }: { team: MatchTeam; lineup: MatchLineup | null; side: "casa" | "fora" }) {
  if (!lineup) return <div className="rounded-xl border border-zinc-800 px-3 py-4 text-center text-[0.7rem] text-zinc-500">Escalação de {team.nome} não divulgada.</div>;
  const lines = [lineup.titulares.slice(0, 1), lineup.titulares.slice(1, 5), lineup.titulares.slice(5, 8), lineup.titulares.slice(8, 11)];
  return (
    <div>
      <div className="flex items-center justify-between px-1 text-[0.7rem]"><span className="font-bold text-zinc-200">{team.nome}</span><span className="text-zinc-400">{lineup.formacao}{lineup.tecnico ? ` · ${lineup.tecnico}` : ""}</span></div>
      <div className="pitch mt-1.5 rounded-xl bg-gradient-to-b from-emerald-900 to-emerald-950 px-2 py-4">
        <div className={`mx-auto flex max-w-[300px] gap-5 ${side === "fora" ? "flex-col-reverse" : "flex-col"}`}>
          {lines.map((line, i) => (
            <div key={i} className="flex items-start justify-around gap-1">
              {line.map((p) => (
                <div key={`${p.numero}-${p.nome}`} className="flex w-[48px] flex-col items-center text-center">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[0.6rem] font-black text-white ${side === "casa" ? "border-emerald-300/40 bg-emerald-500/40" : "border-sky-300/40 bg-sky-500/40"}`}>{p.numero || "–"}</span>
                  <span className="mt-0.5 w-full truncate text-[0.52rem] font-bold text-white">{p.nome.split(" ").slice(-1)[0]}</span>
                  <span className="text-[0.45rem] uppercase text-emerald-200/80">{p.posicao}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Componente -------------------------------- */

const TABS = ["SUMÁRIO", "ESTATÍSTICAS", "FORMAÇÕES", "ESTATÍSTICAS AVANÇADAS"] as const;

export default function MatchDetails(props: MatchDetailsProps) {
  const { casa, fora, placar, status, competicao, dataHora, estadio, eventos, estatisticas = [], avancadas = [], formacoes, fonte, demo } = props;
  const [tab, setTab] = useState<(typeof TABS)[number]>("SUMÁRIO");
  const sorted = [...eventos].sort((a, b) => minuteValue(a.minuto) - minuteValue(b.minuto));
  const first = sorted.filter((e) => minuteValue(e.minuto) <= 45.99);
  const second = sorted.filter((e) => minuteValue(e.minuto) > 45.99);
  const htScore = (() => {
    const last = [...first].reverse().find((e) => e.placar);
    return last?.placar ?? (eventos.length ? "0-0" : undefined);
  })();
  const isLive = /\d+'|intervalo/i.test(status);
  const finished = /encerr|fim/i.test(status);

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
      {/* Cabeçalho */}
      <header className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 pb-4 pt-3">
        <div className="pointer-events-none absolute inset-0 pitch opacity-[0.06]" />
        <div className="relative flex items-center justify-between text-[0.62rem] font-semibold text-zinc-400">
          <span className="truncate">{competicao}</span>
          <span className="flex items-center gap-1.5">{demo ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">DEMO</span> : null}{dataHora}</span>
        </div>
        <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Crest team={casa} />
            <span className="text-[0.8rem] font-bold leading-tight">{casa.nome}</span>
            <span className="text-[0.55rem] uppercase tracking-wide text-zinc-500">Casa</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-3 text-[2.6rem] font-black leading-none tabular-nums tracking-tight">
              <span>{placar.casa}</span><span className="text-zinc-600">-</span><span>{placar.fora}</span>
            </div>
            <span className={`mt-2 rounded-full px-3 py-1 text-[0.62rem] font-extrabold uppercase tracking-wide ${isLive ? "bg-emerald-500 text-emerald-950" : finished ? "bg-zinc-800 text-zinc-300" : "bg-sky-500/15 text-sky-400"}`}>
              {isLive ? <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-950" /> : null}{status}
            </span>
            {htScore && (finished || second.length) ? <span className="mt-1 text-[0.58rem] text-zinc-500">1º tempo {htScore}</span> : null}
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Crest team={fora} />
            <span className="text-[0.8rem] font-bold leading-tight">{fora.nome}</span>
            <span className="text-[0.55rem] uppercase tracking-wide text-zinc-500">Fora</span>
          </div>
        </div>
        {estadio ? <p className="relative mt-2 text-center text-[0.58rem] text-zinc-500">📍 {estadio}</p> : null}
      </header>

      {/* Abas */}
      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`relative shrink-0 px-3 py-2.5 text-[0.66rem] font-extrabold tracking-wide transition ${tab === t ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t}
            {tab === t ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-400" /> : null}
          </button>
        ))}
      </nav>

      {/* Conteúdo */}
      <div className="px-3 py-3">
        {tab === "SUMÁRIO" ? (
          sorted.length === 0 ? (
            <p className="py-8 text-center text-[0.72rem] text-zinc-500">Nenhum evento registrado para esta partida.</p>
          ) : (
            <ul className="relative">
              <span className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-zinc-800" />
              <Divider label="1º Tempo" />
              {first.map((e, i) => <EventCard key={`1-${i}`} e={e} />)}
              {second.length || finished ? <Divider label="2º Tempo" score={htScore ? `(${htScore})` : undefined} /> : null}
              {second.map((e, i) => <EventCard key={`2-${i}`} e={e} />)}
              {finished ? <Divider label="Fim de jogo" score={`${placar.casa}-${placar.fora}`} /> : null}
            </ul>
          )
        ) : null}

        {tab === "ESTATÍSTICAS" ? (
          estatisticas.length ? (
            <div className="divide-y divide-zinc-900">
              <div className="flex items-center justify-between pb-1 text-[0.6rem] font-bold uppercase text-zinc-500"><span className="text-emerald-400">{casa.sigla}</span><span>Estatísticas da partida</span><span className="text-sky-400">{fora.sigla}</span></div>
              {estatisticas.map((s) => <StatRow key={s.label} s={s} />)}
            </div>
          ) : <p className="py-8 text-center text-[0.72rem] text-zinc-500">Estatísticas não disponíveis para esta partida.</p>
        ) : null}

        {tab === "FORMAÇÕES" ? (
          <div className="space-y-3">
            <Lineup team={casa} lineup={formacoes?.casa ?? null} side="casa" />
            <Lineup team={fora} lineup={formacoes?.fora ?? null} side="fora" />
          </div>
        ) : null}

        {tab === "ESTATÍSTICAS AVANÇADAS" ? (
          avancadas.length ? (
            <div className="divide-y divide-zinc-900">
              <div className="flex items-center justify-between pb-1 text-[0.6rem] font-bold uppercase text-zinc-500"><span className="text-emerald-400">{casa.sigla}</span><span>Métricas avançadas</span><span className="text-sky-400">{fora.sigla}</span></div>
              {avancadas.map((s) => <StatRow key={s.label} s={s} />)}
            </div>
          ) : <p className="py-8 text-center text-[0.72rem] text-zinc-500">Métricas avançadas indisponíveis para esta partida.</p>
        ) : null}
      </div>

      <footer className="border-t border-zinc-800 px-3 py-2 text-[0.56rem] text-zinc-500">
        {fonte ?? (demo ? "Dados de demonstração (mockEvents)" : "Fonte: ESPN")} · casa à esquerda, visitante à direita · minutos com acréscimos (ex.: 90+5′)
      </footer>
    </div>
  );
}
