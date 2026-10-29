import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { ShellNav, type NavUser } from "@/components/nav";
import { LivePoller } from "@/components/client";
import { FavoritesProvider } from "@/components/favorites-context";
import { accessInfo, getSessionUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "GreenScore Live — Estatísticas de futebol ao vivo",
  description:
    "Placar ao vivo, gols, cartões, impedimentos, faltas, escanteios, escalações previstas e análises estatísticas dos principais campeonatos. Alertas do seu time favorito.",
  applicationName: "GreenScore Live",
  keywords: ["futebol ao vivo", "estatísticas", "escanteios", "impedimentos", "escalação prevista", "GreenScore"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070c0a" },
    { media: "(prefers-color-scheme: light)", color: "#f5f8f6" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('gs-theme')||'dark';document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;

import { ONESIGNAL_APP_ID, ONESIGNAL_PROXY_BASE, SDK_PAGE_PATH, SERVICE_WORKER_FILE, SITE_URL } from "@/lib/onesignal-config";

/** SDK do OneSignal servido via proxy (anti-bloqueador): Worker do Cloudflare se configurado, senão /osproxy no próprio site. */
const ONESIGNAL_SDK_SRC = `${ONESIGNAL_PROXY_BASE || "/osproxy"}${SDK_PAGE_PATH}`;

/** Inicialização padrão da v16: tudo dentro de OneSignalDeferred para rodar só depois do SDK carregar. */
const oneSignalInitScript = (externalId: string | null) => `
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "${ONESIGNAL_APP_ID}",
    serviceWorkerPath: "${SITE_URL ? `${SITE_URL}/${SERVICE_WORKER_FILE}` : `/${SERVICE_WORKER_FILE}`}",
    serviceWorkerParam: { scope: "/" },
    allowLocalhostAsSecureOrigin: true,
    notifyButton: { enable: false }
  });
  ${externalId ? `try { await OneSignal.login("${externalId}"); } catch (e) {}` : ""}
});`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser();
  let unread = 0;
  if (session) {
    try {
      unread = await getUnreadCount(session.id);
    } catch {
      unread = 0;
    }
  }
  const info = session ? accessInfo(session) : null;
  const navUser: NavUser = session
    ? {
        name: session.name,
        email: session.email,
        role: session.role,
        plan: session.plan,
        active: info?.active ?? false,
        daysLeft: info?.daysLeft ?? 0,
        initials: initials(session.name),
      }
    : null;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script src={ONESIGNAL_SDK_SRC} defer />
        <script dangerouslySetInnerHTML={{ __html: oneSignalInitScript(session ? String(session.id) : null) }} />
      </head>
      <body className="antialiased">
        <FavoritesProvider loggedIn={Boolean(session)}>
        <ShellNav user={navUser} unread={unread} />
        <div className="lg:pl-[248px]">
          <LivePoller enabled />
          <main className="safe-bottom mx-auto w-full max-w-6xl px-3 pt-3 lg:px-6 lg:pt-6">{children}</main>
          <footer className="mt-8 border-t px-4 pb-24 pt-6 text-center text-[0.65rem] muted hairline lg:px-8 lg:pb-8">
            <div className="mx-auto max-w-3xl space-y-2">
              <p className="font-bold text-[var(--ink)]">GreenScore Live · Estatísticas, análises e alertas em tempo real</p>
              <p>
                Gols · Cartões · Impedimentos · Faltas · Escanteios · Pênaltis · Escalação prevista · Últimos jogos · Desempenho dos times
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/analises" className="hover:text-[var(--brand)]">Análises</Link>
                <Link href="/ligas" className="hover:text-[var(--brand)]">Ligas</Link>
                <Link href="/planos" className="hover:text-[var(--brand)]">Planos VIP</Link>
                <Link href="/sobre" className="hover:text-[var(--brand)]">Como funciona</Link>
                <Link href="/admin" className="hover:text-[var(--brand)]">Painel do dono</Link>
              </div>
              <p className="mx-auto max-w-xl leading-relaxed">
                Conteúdo informativo. As análises estatísticas não garantem resultados. Aposte com responsabilidade · +18 · Dados de demonstração
                combinados com médias reais das ligas 2025/26.
              </p>
            </div>
          </footer>
        </div>
        </FavoritesProvider>
      </body>
    </html>
  );
}
