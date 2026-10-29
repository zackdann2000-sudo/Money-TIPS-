"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, RadialBar, RadialBarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* ====================================================================== */
/*  Componentes visuais (recharts) — estilo ScoreLab, responsivos           */
/*  Todos recebem dados prontos por props; nenhuma lógica de backend aqui.  */
/* ====================================================================== */

const GREEN = "#22c55e", RED = "#f43f5e", SKY = "#38bdf8", AMBER = "#f59e0b", GRAY = "#52525b", VIOLET = "#a78bfa";
const TT = { background: "#09090b", border: "1px solid #27272a", borderRadius: 10, fontSize: 11 } as const;

/* ------------------------------ 1. Donut ------------------------------ */
export function DonutChart({ green, red, size = 160, label = "acerto" }: { green: number; red: number; size?: number; label?: string }) {
  const total = green + red;
  const pct = total ? Math.round((green / total) * 100) : 0;
  const data = total ? [{ name: "Greens", value: green }, { name: "Reds", value: red }] : [{ name: "Sem dados", value: 1 }];
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive>
            {total ? <><Cell fill={GREEN} /><Cell fill={RED} /></> : <Cell fill={GRAY} />}
          </Pie>
          {total ? <Tooltip formatter={(v, n) => [`${Number(v)} (${Math.round((Number(v) / total) * 100)}%)`, String(n)]} contentStyle={TT} /> : null}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[1.6rem] font-black leading-none ${total ? "text-emerald-400" : "text-zinc-500"}`}>{total ? `${pct}%` : "—"}</span>
        <span className="text-[0.55rem] uppercase tracking-wide text-zinc-500">{label}</span>
      </div>
    </div>
  );
}

/* --------------------------- 4. Radial (H2H) --------------------------- */
export function RadialStat({ label, value, total, color = GREEN, size = 92 }: { label: string; value: number; total: number; color?: string; size?: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const data = [{ name: label, value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={data} innerRadius="72%" outerRadius="100%" startAngle={225} endAngle={-45} barSize={9}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#27272a" }} isAnimationActive />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[0.95rem] font-black leading-none text-zinc-100">{total ? `${pct}%` : "—"}</span><span className="text-[0.48rem] text-zinc-500">{total ? `${value}/${total}` : "sem base"}</span></div>
      </div>
      <span className="mt-0.5 text-center text-[0.58rem] font-bold text-zinc-300">{label}</span>
    </div>
  );
}

/* ------------------------- 3. Match Momentum ------------------------- */
export type MomentumPoint = { minute: number; value: number }; // >0 pressão do mandante, <0 do visitante (−100..100)

export function MomentumChart({ data, homeName, awayName, homeColor = GREEN, awayColor = SKY, goals = [], source }: { data: MomentumPoint[]; homeName: string; awayName: string; homeColor?: string; awayColor?: string; goals?: { minute: number; side: "home" | "away" }[]; source: string }) {
  const series = data.map((p) => ({ minute: p.minute, home: p.value > 0 ? p.value : 0, away: p.value < 0 ? p.value : 0 }));
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-3 py-2"><p className="text-[0.78rem] font-extrabold">Match Momentum</p><span className="text-[0.55rem] text-zinc-500">pressão minuto a minuto · {source}</span></div>
      <div className="flex items-center justify-between px-3 text-[0.6rem] font-bold"><span style={{ color: homeColor }}>▲ {homeName}</span><span style={{ color: awayColor }}>▼ {awayName}</span></div>
      <div className="h-44 w-full px-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
            <defs>
              <linearGradient id="gHome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={homeColor} stopOpacity={0.85} /><stop offset="100%" stopColor={homeColor} stopOpacity={0.1} /></linearGradient>
              <linearGradient id="gAway" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={awayColor} stopOpacity={0.85} /><stop offset="100%" stopColor={awayColor} stopOpacity={0.1} /></linearGradient>
            </defs>
            <XAxis dataKey="minute" tick={{ fontSize: 9, fill: "#71717a" }} ticks={[15, 30, 45, 60, 75, 90]} tickLine={false} axisLine={{ stroke: "#27272a" }} />
            <YAxis domain={[-100, 100]} tick={{ fontSize: 9, fill: "#71717a" }} ticks={[-100, 0, 100]} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="#3f3f46" />
            <ReferenceLine x={45} stroke="#3f3f46" strokeDasharray="3 3" label={{ value: "INT", fontSize: 9, fill: "#71717a", position: "top" }} />
            {goals.map((g, i) => <ReferenceLine key={i} x={g.minute} stroke={g.side === "home" ? homeColor : awayColor} strokeWidth={1.5} label={{ value: "⚽", fontSize: 11, position: g.side === "home" ? "top" : "bottom" }} />)}
            <Tooltip formatter={(v, n) => [`${Math.abs(Math.round(Number(v)))}`, n === "home" ? homeName : awayName]} labelFormatter={(m) => `${m}′`} contentStyle={TT} />
            <Area type="monotone" dataKey="home" stroke={homeColor} fill="url(#gHome)" strokeWidth={1.5} isAnimationActive />
            <Area type="monotone" dataKey="away" stroke={awayColor} fill="url(#gAway)" strokeWidth={1.5} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------- 5. Will They Score? ---------------------- */
export function WillTheyScore({ homeName, awayName, homeScores, awayScores, homeCleanSheet, awayCleanSheet, source }: { homeName: string; awayName: string; homeScores: number; awayScores: number; homeCleanSheet: number; awayCleanSheet: number; source: string }) {
  const items = [
    { label: `${homeName} marca`, p: homeScores, color: GREEN },
    { label: `${awayName} marca`, p: awayScores, color: SKY },
    { label: `Clean sheet ${homeName}`, p: homeCleanSheet, color: AMBER, hint: "não sofre gol" },
    { label: `Clean sheet ${awayName}`, p: awayCleanSheet, color: VIOLET, hint: "não sofre gol" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-3 py-2"><p className="text-[0.78rem] font-extrabold">Will They Score?</p><span className="text-[0.55rem] text-zinc-500">{source}</span></div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col items-center rounded-xl bg-zinc-900/60 px-2 py-2">
            <RadialStat label="" value={Math.round(it.p * 100)} total={100} color={it.color} size={84} />
            <span className="-mt-2 text-center text-[0.6rem] font-bold text-zinc-200">{it.label}</span>
            {it.hint ? <span className="text-[0.48rem] text-zinc-500">{it.hint}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------- 6. Radar do jogador ---------------------- */
export type RadarAxis = { atributo: string; jogador: number; liga: number; bruto?: string };

export function PlayerRadar({ data, playerName, source }: { data: RadarAxis[]; playerName: string; source: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-3 py-2"><p className="text-[0.78rem] font-extrabold">Perfil de atributos</p><span className="text-[0.55rem] text-zinc-500">vs média da liga · {source}</span></div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis dataKey="atributo" tick={{ fontSize: 10, fill: "#d4d4d8" }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Média da liga" dataKey="liga" stroke={GRAY} fill={GRAY} fillOpacity={0.25} />
            <Radar name={playerName} dataKey="jogador" stroke={GREEN} fill={GREEN} fillOpacity={0.35} />
            <Tooltip formatter={(v, n, p) => { const bruto = (p as { payload?: { bruto?: string } })?.payload?.bruto; return [`${Math.round(Number(v))}/100${bruto && n !== "Média da liga" ? ` (${bruto})` : ""}`, String(n)]; }} contentStyle={TT} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-3 px-3 pb-2 text-[0.58rem]"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />{playerName}</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-zinc-500" />Média da liga (=50)</span></div>
    </div>
  );
}

/* ------------- util: só renderiza no cliente (evita SSR width 0) ------------- */
export function ClientOnly({ children, height = 160 }: { children: React.ReactNode; height?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <>{children}</> : <div className="animate-pulse rounded-2xl bg-zinc-900" style={{ height }} />;
}
