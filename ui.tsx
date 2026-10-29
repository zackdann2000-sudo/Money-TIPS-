import Link from "next/link";
import type { ReactNode } from "react";
import type { MatchRow } from "@/lib/data";
import { eventMeta, formLetters, formatKickoff, initials, statusLabel, statusTone } from "@/lib/utils";

export function TeamBadge({
  name,
  color,
  colorAlt,
  size = 28,
  rounded = "full",
  logo,
}: {
  name: string;
  color: string;
  colorAlt?: string;
  size?: number;
  rounded?: "full" | "xl";
  logo?: string;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-black text-white shadow-sm ${rounded === "full" ? "rounded-full" : "rounded-xl"}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.34),
        background: `linear-gradient(140deg, ${color} 0%, ${colorAlt ?? "#0f172a"} 130%)`,
        letterSpacing: "-0.02em",
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function SectionHeader({
  title,
  href,
  action,
  icon,
  subtitle,
}: {
  title: string;
  href?: string;
  action?: string;
  icon?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3 px-1">
      <div>
        <h2 className="flex items-center gap-1.5 text-[0.95rem] font-extrabold tracking-tight">
          {icon}
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-[0.7rem] muted">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="text-[0.7rem] font-bold text-[var(--brand)]">
          {action ?? "Ver tudo"} →
        </Link>
      ) : null}
    </div>
  );
}

export function ScorePill({ match }: { match: MatchRow }) {
  return (
    <span className={`chip ${statusTone(match.status)}`}>
      {match.status === "live" ? <span className="live-dot" /> : null}
      {statusLabel(match.status, match.minute)}
    </span>
  );
}

export function MatchRow({ match, showStats = true, xg }: { match: MatchRow; showStats?: boolean; xg?: { home: number; away: number; source: string } | null }) {
  const isLive = match.status === "live";
  return (
    <Link
      href={match.source === "espn" ? `/jogos/${match.id}/centro` : `/jogos/${match.id}`}
      className="card card-hover flex items-stretch gap-2 px-2.5 py-2.5"
      prefetch={false}
    >
      <div className="flex w-[58px] shrink-0 flex-col items-center justify-center gap-1 border-r pr-2 hairline">
        <span className={`text-[0.62rem] font-bold uppercase ${isLive ? "text-emerald-500" : "muted"}`}>
          {match.status === "live" ? `${match.minute}'` : match.status === "finished" ? "FIM" : formatKickoff(match.kickoff)}
        </span>
        {isLive ? <span className="live-dot" /> : null}
        <span className="text-[0.55rem] font-semibold muted">
          {match.status === "live" ? (/HT|INT|intervalo/i.test(match.statusDetail) ? "Intervalo" : "ao vivo") : match.status === "finished" ? formatKickoff(match.kickoff) : new Date(match.kickoff).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TeamBadge name={match.homeName} color={match.homeColor} colorAlt={match.homeColorAlt} size={22} logo={match.homeLogo} />
            <span className="truncate text-[0.82rem] font-semibold">{match.homeName}</span>
          </div>
          <span className={`w-5 text-center text-[0.85rem] font-extrabold tabular-nums ${isLive ? "text-emerald-500" : ""}`}>
            {match.status === "scheduled" ? "-" : match.homeScore}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TeamBadge name={match.awayName} color={match.awayColor} colorAlt={match.awayColorAlt} size={22} logo={match.awayLogo} />
            <span className="truncate text-[0.82rem] font-semibold">{match.awayName}</span>
          </div>
          <span className={`w-5 text-center text-[0.85rem] font-extrabold tabular-nums ${isLive ? "text-emerald-500" : ""}`}>
            {match.status === "scheduled" ? "-" : match.awayScore}
          </span>
        </div>
        {showStats ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {xg ? <span className="chip !border-violet-500/30 !bg-violet-500/10 !py-0 !text-[0.55rem] !text-violet-400" title={`Gols esperados · ${xg.source}`}>xG {xg.home.toFixed(1)} - {xg.away.toFixed(1)}</span> : null}
            <span className="chip !py-0 !text-[0.55rem]">🚩 {match.homeCorners + match.awayCorners}</span>
            <span className="chip !py-0 !text-[0.55rem]">🟨 {match.homeCards + match.awayCards}</span>
            <span className="chip !py-0 !text-[0.55rem]">✋ {match.homeFouls + match.awayFouls}</span>
            <span className="chip !py-0 !text-[0.55rem]">🚫 {match.homeOffsides + match.awayOffsides}</span>
            {match.source === "espn" ? <span className="chip !border-emerald-500/30 !py-0 !text-[0.55rem] !text-emerald-500">🧠 IA</span> : null}
            {match.leagueName ? <span className="ml-auto truncate text-[0.55rem] muted">{match.leagueFlag} {match.leagueName}</span> : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function FormPills({ form, size = "sm" }: { form: string; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-1">
      {formLetters(form).map((item, index) => (
        <span
          key={`${item.letter}-${index}`}
          title={item.label}
          className={`inline-flex items-center justify-center rounded-md font-extrabold ${item.tone} ${size === "sm" ? "h-4 w-4 text-[0.55rem]" : "h-6 w-6 text-[0.7rem]"}`}
        >
          {item.letter}
        </span>
      ))}
    </div>
  );
}

export function StatBar({ label, home, away, suffix = "", icon }: { label: string; home: number; away: number; suffix?: string; icon?: string }) {
  const total = home + away;
  const homePct = total ? (home / total) * 100 : 50;
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-[0.72rem] font-semibold">
        <span className="tabular-nums">{home}{suffix}</span>
        <span className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wide muted">{icon} {label}</span>
        <span className="tabular-nums">{away}{suffix}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${homePct}%` }} />
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

export function InsightCard({
  insight,
  matchLabel,
  href,
}: {
  insight: { id: number; category: string; title: string; body: string; market: string; confidence: number; odds: string; source: string };
  matchLabel?: string;
  href?: string;
}) {
  const confTone = insight.confidence >= 78 ? "text-emerald-500" : insight.confidence >= 68 ? "text-amber-500" : "text-sky-500";
  return (
    <div className="card card-hover overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 hairline">
        <div className="flex min-w-0 items-center gap-2">
          <span className="chip !border-transparent !bg-[var(--brand-soft)] !text-[var(--brand)]">{insight.category}</span>
          <span className="truncate text-[0.68rem] font-semibold muted">{matchLabel ?? "Análise geral"}</span>
        </div>
        <span className={`text-[0.68rem] font-extrabold ${confTone}`}>{insight.confidence}%</span>
      </div>
      <div className="px-3 py-2.5">
        <h3 className="text-[0.85rem] font-bold leading-snug">{insight.title}</h3>
        <p className="mt-1 line-clamp-3 text-[0.75rem] leading-relaxed muted">{insight.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {insight.market ? <span className="chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400">{insight.market}</span> : null}
          {insight.odds && insight.odds !== "—" ? <span className="chip">Odd {insight.odds}</span> : <span className="chip !text-zinc-500" title="Nenhuma casa de apostas forneceu cotação para este mercado">Odd Indisponível</span>}
          <span className="ml-auto text-[0.6rem] muted">{insight.source}</span>
        </div>
        {href ? (
          <Link href={href} className="mt-2 inline-flex text-[0.7rem] font-bold text-[var(--brand)]">
            Analisar partida →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function EventLine({
  event,
  homeName,
  awayName,
}: {
  event: { id: number; minute: number; type: string; side: string; player: string; detail: string; scoreAfter: string };
  homeName: string;
  awayName: string;
}) {
  const meta = eventMeta(event.type);
  return (
    <div className="flex items-start gap-2.5 border-b px-3 py-2 last:border-0 hairline">
      <div className="w-9 shrink-0 pt-0.5 text-right text-[0.7rem] font-extrabold tabular-nums muted">{event.minute}'</div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-3)] text-sm">{meta.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.78rem] font-semibold leading-snug">
          {event.detail}
          {event.scoreAfter ? <span className="ml-1.5 rounded bg-[var(--brand-soft)] px-1.5 py-0.5 text-[0.62rem] font-extrabold text-[var(--brand)]">{event.scoreAfter}</span> : null}
        </p>
        <p className="text-[0.62rem] muted">
          {meta.label} · {event.side === "home" ? homeName : event.side === "away" ? awayName : "Partida"}
        </p>
      </div>
    </div>
  );
}

export function PremiumLock({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card relative overflow-hidden p-5 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] pitch" />
      <div className="relative">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-xl">🔒</div>
        <h3 className="mt-2 text-[0.95rem] font-extrabold">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-[0.75rem] muted">
          {description ?? "Seu acesso expirou. Assine o VIP para liberar estatísticas ao vivo, escalações previstas e alertas ilimitados."}
        </p>
        <Link href="/planos" className="btn btn-primary mt-3 w-full">
          Assinar VIP agora
        </Link>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, icon = "📭" }: { title: string; description?: string; icon?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 px-5 py-10 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-bold">{title}</p>
      {description ? <p className="max-w-xs text-[0.75rem] muted">{description}</p> : null}
    </div>
  );
}

export function AccessPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`chip ${active ? "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400" : "!border-rose-500/30 !bg-rose-500/10 !text-rose-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
      {label}
    </span>
  );
}

export function DataSourceBadge({ lastSuccessAt, matches }: { lastSuccessAt: Date | null | undefined; matches: number }) {
  const ok = Boolean(lastSuccessAt);
  const when = lastSuccessAt
    ? new Date(lastSuccessAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "—";
  return (
    <span className={`chip ${ok ? "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400" : "!border-amber-500/40 !text-amber-500"}`} title="Fonte: ESPN (dados oficiais)">
      {ok ? "✓" : "⚠"} Dados reais · ESPN · {ok ? `${matches} jogos · ${when}` : "aguardando sincronização"}
    </span>
  );
}

export function StatTile({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: string }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.62rem] font-bold uppercase tracking-wide muted">{label}</span>
        {icon ? <span className="text-sm">{icon}</span> : null}
      </div>
      <p className="mt-1 text-lg font-extrabold leading-none tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[0.6rem] muted">{hint}</p> : null}
    </div>
  );
}


/** Rodapé de rastreabilidade: "Fonte: X · Amostra: N jogos" + selo amarelo "Base Parcial" quando N < 5. */
export function DataFooter({ fonte, amostra, extra, dark = false }: { fonte: string; amostra?: number | null; extra?: string; dark?: boolean }) {
  const parcial = amostra !== undefined && amostra !== null && amostra < 5;
  const nome = ({ espn: "ESPN", bzzoiro: "Bzzoiro Sports Data", sportmonks: "Sportmonks", "football-data": "Football-Data.org", "api-football": "API-Football", none: "sem fonte", demo: "demonstração (mock)" } as Record<string, string>)[fonte] ?? fonte;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 border-t px-3 py-1.5 text-[0.56rem] ${dark ? "border-zinc-800 text-zinc-500" : "hairline muted"}`}>
      <span>Fonte: <b className={dark ? "text-zinc-300" : "text-[var(--ink)]"}>{nome}</b></span>
      {amostra !== undefined && amostra !== null ? <span>· Amostra: <b className={dark ? "text-zinc-300" : "text-[var(--ink)]"}>{amostra} jogo{amostra === 1 ? "" : "s"}</b></span> : null}
      {parcial ? <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.5rem] font-black text-amber-500" title="Menos de 5 jogos na amostra: use com cautela">Base Parcial</span> : null}
      {extra ? <span>· {extra}</span> : null}
    </div>
  );
}
