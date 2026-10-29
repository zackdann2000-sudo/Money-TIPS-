import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction, toggleFavoriteAction } from "@/app/actions";
import { accessInfo, getSessionUser } from "@/lib/auth";
import { getActiveSubscription, getFavorites, getRecentAccessForUser, getUserNotifications } from "@/lib/data";
import { AccessPill, SectionHeader, TeamBadge } from "@/components/ui";
import { eventMeta, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const info = accessInfo(session);
  const [favorites, notifications, logs, subscription] = await Promise.all([
    getFavorites(session.id),
    getUserNotifications(session.id),
    getRecentAccessForUser(session.id),
    getActiveSubscription(session.id),
  ]);
  const expires = new Date(session.accessExpiresAt);

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden">
        <div className="relative brand-gradient px-3.5 py-3.5 text-white">
          <div className="pointer-events-none absolute inset-0 pitch opacity-25" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-base font-black">{initials(session.name)}</span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black">{session.name}</h1>
              <p className="truncate text-[0.65rem] text-emerald-50/85">{session.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="chip !border-white/25 !bg-white/15 !text-white">{session.role === "admin" ? "👑 Proprietário" : info.plan === "free" ? "Teste grátis" : "💎 VIP"}</span>
                <span className={`chip !border-white/25 !text-white ${info.active ? "!bg-emerald-400/25" : "!bg-rose-500/30"}`}>{info.active ? "ATIVO" : "EXPIRADO"}</span>
              </div>
            </div>
            <form action={logoutAction}>
              <button className="rounded-lg bg-white/15 px-2.5 py-1.5 text-[0.65rem] font-bold">Sair</button>
            </form>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--line)] text-center">
          <div className="px-1 py-2">
            <p className="text-[0.95rem] font-black">{info.active ? info.daysLeft : 0}</p>
            <p className="text-[0.52rem] muted">dias restantes</p>
          </div>
          <div className="px-1 py-2">
            <p className="text-[0.95rem] font-black">{expires.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
            <p className="text-[0.52rem] muted">expira em</p>
          </div>
          <div className="px-1 py-2">
            <p className="text-[0.95rem] font-black">{favorites.length}</p>
            <p className="text-[0.52rem] muted">favoritos</p>
          </div>
        </div>
      </section>

      {info.active ? (
        <div className={`card px-3 py-2.5 ${info.plan === "free" ? "border-amber-500/40" : "border-emerald-500/40"}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[0.8rem] font-bold">
                {info.plan === "free" ? "⏳ Você está no período de teste" : "💎 Assinatura VIP ativa"}
              </p>
              <p className="text-[0.65rem] muted">
                {subscription ? `Plano ${subscription.planSlug} · válido até ${new Date(subscription.expiresAt).toLocaleDateString("pt-BR")}` : `Acesso garantido até ${expires.toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <Link href="/planos" className="btn btn-primary shrink-0 !px-2.5 !py-1.5 !text-[0.68rem]">{info.plan === "free" ? "Assinar VIP" : "Renovar"}</Link>
          </div>
        </div>
      ) : (
        <div className="card border-rose-500/40 px-3 py-3">
          <p className="text-[0.85rem] font-extrabold text-rose-500">Acesso expirado em {expires.toLocaleDateString("pt-BR")}</p>
          <p className="mt-0.5 text-[0.68rem] muted">Para continuar vendo estatísticas ao vivo, escalações previstas e alertas, ative um plano VIP. Seu histórico e favoritos continuam salvos.</p>
          <Link href="/planos" className="btn btn-primary mt-2 w-full">Assinar plano VIP</Link>
        </div>
      )}

      <section>
        <SectionHeader title="Meus times favoritos" subtitle="Você recebe alertas quando eles jogam" href="/times" action="Adicionar" icon={<span>⭐</span>} />
        {favorites.length ? (
          <div className="space-y-1.5">
            {favorites.map(({ team }) => (
              <div key={team.id} className="card flex items-center gap-2 px-2.5 py-2">
                <TeamBadge name={team.name} color={team.badgeColor} colorAlt={team.badgeColorAlt} size={26} />
                <div className="min-w-0 flex-1">
                  <Link href={`/times/${team.slug}`} className="truncate text-[0.78rem] font-bold">{team.name}</Link>
                  <p className="text-[0.55rem] muted">{team.avgCorners} escanteios · {team.avgFouls} faltas · {team.avgOffsides} impedimentos por jogo</p>
                </div>
                <form action={toggleFavoriteAction}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="redirectTo" value="/conta" />
                  <button className="chip !border-amber-500/40 !text-amber-500">★ remover</button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="card px-3 py-3 text-[0.72rem] muted">Nenhum favorito ainda. <Link href="/times" className="font-bold text-[var(--brand)]">Escolha um time</Link> e ative os alertas.</div>
        )}
      </section>

      <section>
        <SectionHeader title="Últimos alertas" subtitle="Configure quais lances geram alerta e som" href="/notificacoes#configurar" action="Configurar" icon={<span>🔔</span>} />
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          {notifications.slice(0, 5).map((notification) => (
            <div key={notification.id} className="flex items-center gap-2 px-2.5 py-2">
              <span className="text-sm">{eventMeta(notification.type).icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.72rem] font-semibold">{notification.title}</p>
                <p className="truncate text-[0.58rem] muted">{notification.body}</p>
              </div>
              {!notification.isRead ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
            </div>
          ))}
          {!notifications.length ? <div className="px-3 py-4 text-center text-[0.72rem] muted">Nenhuma notificação recebida.</div> : null}
        </div>
      </section>

      <section>
        <SectionHeader title="Histórico de acessos" subtitle="Segurança e monitoramento da conta" icon={<span>🔐</span>} />
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          {logs.length ? logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="truncate text-[0.68rem] font-semibold">{log.path}</span>
              <span className="shrink-0 text-[0.58rem] muted">{new Date(log.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )) : <div className="px-3 py-3 text-center text-[0.7rem] muted">Nenhum acesso registrado ainda.</div>}
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div>
          <p className="text-[0.72rem] font-bold">Tema do aplicativo</p>
          <p className="text-[0.6rem] muted">Alterne entre claro e escuro no ícone 🌙/☀️ do cabeçalho.</p>
        </div>
        <AccessPill active={info.active} label={info.label} />
      </section>

      {session.role === "admin" ? (
        <Link href="/admin" className="card card-hover flex items-center justify-between px-3 py-2.5">
          <div>
            <p className="text-[0.8rem] font-extrabold">👑 Painel do proprietário</p>
            <p className="text-[0.62rem] muted">Usuários, acessos, planos, jogos e APIs</p>
          </div>
          <span className="text-[var(--brand)]">→</span>
        </Link>
      ) : null}
    </div>
  );
}
