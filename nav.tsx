"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";

export type NavUser = {
  name: string;
  email: string;
  role: string;
  plan: string;
  active: boolean;
  daysLeft: number;
  initials: string;
} | null;

const NAV = [
  { href: "/", label: "Ao vivo", icon: "signal" },
  { href: "/jogos", label: "Jogos", icon: "ball" },
  { href: "/times", label: "Times", icon: "shield" },
  { href: "/jogadores", label: "Jogadores", icon: "player" },
  { href: "/ia", label: "IA Analista", icon: "brain" },
  { href: "/ligas", label: "Ligas", icon: "trophy" },
  { href: "/analises", label: "Análises", icon: "chart" },
];

const SECONDARY = [
  { href: "/money-tips", label: "Money Tips", icon: "star" },
  { href: "/detector", label: "Detector", icon: "signal" },
  { href: "/desapitos", label: "Desapitos", icon: "chart" },
  { href: "/alertas", label: "Sports Alert", icon: "signal" },
  { href: "/football-data", label: "Football-Data", icon: "plug" },
  { href: "/notificacoes", label: "Notificações", icon: "bell" },
  { href: "/planos", label: "Planos VIP", icon: "star" },
  { href: "/conta", label: "Minha conta", icon: "user" },
];

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    signal: <><path d="M4 15v3M9 11v7M14 7v11M19 4v14" {...common} /></>,
    ball: <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M12 7.5l3.5 2.5-1.3 4h-4.4l-1.3-4z" {...common} /></>,
    shield: <><path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" {...common} /><path d="M9 12l2 2 4-4" {...common} /></>,
    trophy: <><path d="M8 4h8v5a4 4 0 01-8 0z" {...common} /><path d="M8 5H5v2a3 3 0 003 3M16 5h3v2a3 3 0 01-3 3M10 17h4M12 13v4M9 21h6" {...common} /></>,
    chart: <><path d="M4 19h16M7 16V9M12 16V5M17 16v-4" {...common} /></>,
    bell: <><path d="M6 9a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" {...common} /><path d="M10 18a2 2 0 004 0" {...common} /></>,
    star: <><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" {...common} /></>,
    user: <><circle cx="12" cy="8" r="3.6" {...common} /><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4S18.3 16.4 19.5 20" {...common} /></>,
    plug: <><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4" {...common} /></>,
    brain: <><path d="M9 4.5a3 3 0 00-3 3v.6A3 3 0 004.5 11v1a3 3 0 001.5 2.6V16a3 3 0 003 3h3V4.5zm6 0a3 3 0 013 3v.6A3 3 0 0119.5 11v1a3 3 0 01-1.5 2.6V16a3 3 0 01-3 3h-3V4.5z" {...common} /><path d="M12 4.5v15" {...common} /></>,
    player: <><circle cx="12" cy="6.5" r="2.6" {...common} /><path d="M8 21l1.5-6.5L7 12l3-3.5h4l3 3.5-2.5 2.5L16 21M9.5 14.5h5" {...common} /></>,
    gear: <><circle cx="12" cy="12" r="3" {...common} /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" {...common} /></>,
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{paths[name] ?? paths.ball}</svg>;
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = localStorage.getItem("gs-theme");
    const initial = stored === "light" ? "light" : stored === "dark" ? "dark" : "dark";
    setTheme(initial);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("gs-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  return { theme, toggle };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className="flex h-9 w-9 items-center justify-center rounded-xl border text-[0.95rem] hairline bg-[var(--surface-2)]"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-emerald-900/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 15l5-6 4 4 3-4 4 5" />
          <path d="M4 19h16" />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-[1.02rem] font-black tracking-tight">GreenScore</span>
          <span className="block text-[0.55rem] font-bold uppercase tracking-[0.18em] text-emerald-500">Live Analytics</span>
        </span>
      ) : null}
    </Link>
  );
}

export function ShellNav({ user, unread }: { user: NavUser; unread: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 glass border-b hairline lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <Logo />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/notificacoes" className="relative flex h-9 w-9 items-center justify-center rounded-xl border hairline bg-[var(--surface-2)]">
              <Icon name="bell" />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-black text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            {user ? (
              <Link href="/conta" className="flex items-center gap-1.5 rounded-xl border px-1.5 py-1 hairline bg-[var(--surface-2)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[0.6rem] font-black text-[var(--brand)]">
                  {user.initials}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${user.active ? "bg-emerald-500" : "bg-rose-500"}`} />
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary !px-2.5 !py-1.5 !text-[0.7rem]">Entrar</Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2 no-scrollbar">
          <Link href="/jogos" className={`chip ${isActive("/jogos") ? "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" : ""}`}>
            <span className="live-dot" /> Ao vivo agora
          </Link>
          <Link href="/times" className="chip">Times</Link>
          <Link href="/jogadores" className={`chip ${isActive("/jogadores") ? "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" : ""}`}>🏅 Jogadores</Link>
          <Link href="/ia" className={`chip ${isActive("/ia") ? "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" : ""}`}>🧠 IA</Link>
          <Link href="/ligas" className="chip">Ligas</Link>
          <Link href="/money-tips" className={`chip ${isActive("/money-tips") ? "!border-violet-500/40 !bg-violet-500/10 !text-violet-400" : ""}`}>💜 Money Tips</Link>
          <Link href="/detector" className={`chip ${isActive("/detector") ? "!border-sky-500/40 !bg-sky-500/10 !text-sky-400" : ""}`}>🔎 Detector</Link>
          <Link href="/desapitos" className={`chip ${isActive("/desapitos") ? "!border-amber-500/40 !bg-amber-500/10 !text-amber-400" : ""}`}>📉 Desapitos</Link>
          <Link href="/alertas" className={`chip ${isActive("/alertas") ? "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" : ""}`}>📡 Sports Alert</Link>
          <Link href="/football-data" className={`chip ${isActive("/football-data") ? "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500" : ""}`}>🔌 FD.org</Link>
          <Link href="/analises" className="chip">Oportunidades</Link>
          {user?.role === "admin" ? <Link href="/admin" className="chip !text-amber-500">👑 Admin</Link> : null}
          {!user ? <Link href="/planos" className="chip !border-emerald-500/40 !text-emerald-500">VIP</Link> : null}
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] flex-col border-r px-3 py-4 hairline bg-[var(--surface-2)] lg:flex">
        <div className="flex items-center justify-between px-1">
          <Logo />
          <ThemeToggle />
        </div>
        <nav className="mt-6 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.83rem] font-bold transition ${
                isActive(item.href)
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="my-4 border-t hairline" />
        <nav className="space-y-1">
          {SECONDARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.83rem] font-bold transition ${
                isActive(item.href)
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.href === "/notificacoes" && unread > 0 ? (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-black text-white">{unread}</span>
              ) : null}
            </Link>
          ))}
          {user?.role === "admin" ? (
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.83rem] font-bold transition ${
                isActive("/admin") ? "bg-amber-500/10 text-amber-500" : "text-[var(--muted)] hover:bg-[var(--surface-3)]"
              }`}
            >
              <Icon name="gear" />
              Painel do dono
            </Link>
          ) : null}
        </nav>
        <div className="mt-auto">
          {user ? (
            <div className="card px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[0.7rem] font-black text-[var(--brand)]">
                  {user.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[0.75rem] font-bold">{user.name}</p>
                  <p className="truncate text-[0.6rem] muted">{user.role === "admin" ? "Proprietário" : user.plan === "free" ? "Teste grátis" : "VIP ativo"}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[0.6rem] muted">
                <span className={`h-1.5 w-1.5 rounded-full ${user.active ? "bg-emerald-500" : "bg-rose-500"}`} />
                {user.active ? `${user.daysLeft} dia(s) restantes` : "Acesso expirado"}
              </div>
              <div className="mt-2 flex gap-1.5">
                <Link href="/conta" className="btn btn-ghost flex-1 !py-1 !text-[0.65rem]">Conta</Link>
                <form action={logoutAction} className="flex-1">
                  <button className="btn btn-ghost w-full !py-1 !text-[0.65rem]">Sair</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="card brand-gradient px-3 py-3 text-white">
              <p className="text-[0.78rem] font-extrabold leading-tight">1 dia grátis com Gmail</p>
              <p className="mt-0.5 text-[0.62rem] text-emerald-50/80">Alertas, escalação e dados ao vivo.</p>
              <Link href="/cadastro" className="btn mt-2 w-full !bg-white !py-1.5 !text-[0.7rem] !text-emerald-900">Criar conta</Link>
              <Link href="/login" className="mt-1 block text-center text-[0.62rem] font-bold text-emerald-50/90">Já tenho conta</Link>
            </div>
          )}
        </div>
      </aside>

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex h-16 items-stretch justify-around px-1">
          {[...NAV.slice(0, 2), { href: "/ia", label: "IA", icon: "brain" }, { href: "/jogadores", label: "Jogadores", icon: "player" }, { href: user ? "/conta" : "/cadastro", label: user ? "Conta" : "VIP", icon: "user" }].map((item) => (
            <Link key={item.label} href={item.href} className="flex flex-1 flex-col items-center justify-center gap-0.5">
              <span className={`flex h-7 w-12 items-center justify-center rounded-lg transition ${isActive(item.href) ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--muted)]"}`}>
                <Icon name={item.icon} />
              </span>
              <span className={`text-[0.58rem] font-bold ${isActive(item.href) ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function AdminTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`chip !px-3 !py-1.5 ${pathname === tab.href ? "!border-emerald-500/50 !bg-emerald-500/10 !text-emerald-500" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
