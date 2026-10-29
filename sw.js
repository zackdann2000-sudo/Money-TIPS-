/* GreenScore — Service Worker de Web Push (padrão VAPID)
   Recebe o evento `push` mesmo com o site fechado e exibe a notificação. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "GreenScore", body: "Novo alerta", url: "/notificacoes", tag: "greenscore", icon: "/icon.svg" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body,
    icon: data.icon || "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag, // agrupa alertas do mesmo jogo
    renotify: true,
    vibrate: data.type === "goal" ? [120, 60, 120, 60, 200] : [80],
    timestamp: Date.now(),
    data: { url: data.url || "/notificacoes" },
    actions: [{ action: "open", title: "Abrir" }],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Clique: foca a aba do site se já existir, senão abre a URL do alerta
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notificacoes";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate ? client.navigate(url) : null;
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Se o navegador trocar a inscrição, reenvia a nova ao servidor
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
      .then((sub) => fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), userAgent: "sw-resubscribe" }) }))
      .catch(() => undefined),
  );
});
