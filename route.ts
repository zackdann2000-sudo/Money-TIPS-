import { NextRequest } from "next/server";
import { ONESIGNAL_WORKER, proxyBase } from "@/lib/onesignal-config";

/**
 * Proxy do OneSignal embutido no site — porta do repositório verificatorrus/onesignal-proxy
 * (Cloudflare Worker) para uma rota Next.js. Serve o SDK, a API e as imagens do OneSignal
 * a partir do MESMO domínio do site, renomeando OneSignalSDK* → TwoSignalSDK* para escapar
 * das listas de bloqueio.
 *
 *   /osproxy/sdks/...   → https://cdn.onesignal.com/sdks/...
 *   /osproxy/api/...    → https://onesignal.com/api/...
 *   /osproxy/osimg/...  → https://img.onesignal.com/...
 */
export const dynamic = "force-dynamic";

// Upstream = SEU Worker do Cloudflare (que repassa para cdn.onesignal.com / onesignal.com).
// Assim o servidor do site também não depende do CDN; as regexes abaixo continuam cobrindo o CDN
// porque o conteúdo devolvido pelo Worker ainda contém essas URLs originais.
const upstreamCdn = ONESIGNAL_WORKER;   // /sdks/*
const upstreamMain = ONESIGNAL_WORKER;  // /api/*
const osCdnUrl = "https://cdn.onesignal.com";
const osMainUrl = "https://onesignal.com";
const osImgUrl = "https://img.onesignal.com";
const cdkRealName = "OneSignalSDK";
const cdkFakeName = "TwoSignalSDK";
const regexSDKFile = new RegExp(cdkRealName + "([\\S]*?)\\.js", "g");
const regexCdnUrl = new RegExp(osCdnUrl, "g");
const regexMainUrl = new RegExp(osMainUrl, "g");
const regexImgUrl = new RegExp(osImgUrl, "g");

const HOP = new Set(["host", "connection", "content-length", "transfer-encoding", "accept-encoding", "cf-connecting-ip", "x-forwarded-for"]);

function forwardHeaders(req: NextRequest) {
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) headers.set(k, v);
  });
  headers.set("X-Forwarded-For", req.headers.get("x-forwarded-for") ?? "");
  headers.set("Accept-Encoding", "identity");
  return headers;
}

/** Origem pública vista pelo navegador (atrás de proxy reverso usa x-forwarded-*). */
function publicOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(host);
  // Web Push exige HTTPS: fora de localhost, sempre https (proxies reversos nem sempre enviam x-forwarded-proto)
  const proto = isLocal ? (req.headers.get("x-forwarded-proto") ?? "http") : "https";
  return `${proto}://${host}`;
}

function cleanResponseHeaders(src: Headers) {
  const h = new Headers(src);
  ["content-encoding", "content-length", "transfer-encoding", "connection"].forEach((k) => h.delete(k));
  h.set("Access-Control-Allow-Origin", "*");
  return h;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const urlPath = "/" + path.join("/") + (req.nextUrl.search || "");
  // Reescreve para a URL pública do proxy: Worker (absoluta) ou caminho relativo /osproxy
  // (relativo funciona em qualquer domínio e evita vazar o host interno do servidor).
  const configured = proxyBase("");
  const MYSUBDOMAIN = configured.startsWith("http") ? configured : `${publicOrigin(req)}/osproxy`;
  const init: RequestInit = { method: req.method, headers: forwardHeaders(req), redirect: "manual", body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer() };

  // https://cdn.onesignal.com/sdks/
  if (urlPath.startsWith("/sdks/")) {
    const realPath = urlPath.replace(cdkFakeName, cdkRealName);
    let resp = await fetch(upstreamCdn + realPath, init);
    if (!resp.ok) resp = await fetch(osCdnUrl + realPath, init); // fallback direto ao CDN se o Worker falhar
    const headers = cleanResponseHeaders(resp.headers);
    if (req.method === "GET" && (realPath.includes("js") || realPath.includes("css")) && !realPath.includes("map")) {
      let body = await resp.text();
      body = body.replace(regexCdnUrl, MYSUBDOMAIN).replace(regexMainUrl, MYSUBDOMAIN).replace(new RegExp(ONESIGNAL_WORKER, "g"), MYSUBDOMAIN).replace(regexSDKFile, (_m, g: string) => `${cdkFakeName}${g ?? ""}.js`);
      headers.set("Content-Type", realPath.includes("css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8");
      headers.set("Cache-Control", "public, max-age=3600");
      if (realPath.includes(".sw.js") || realPath.includes("Worker")) headers.set("Service-Worker-Allowed", "/");
      return new Response(body, { status: resp.status, headers });
    }
    return new Response(resp.body, { status: resp.status, headers });
  }
  // https://onesignal.com/api/
  if (urlPath.startsWith("/api/")) {
    let resp = await fetch(upstreamMain + urlPath, init);
    if (resp.status >= 500) resp = await fetch(osMainUrl + urlPath, init);
    const headers = cleanResponseHeaders(resp.headers);
    const ct = resp.headers.get("content-type") ?? "";
    if (ct.includes("javascript") || ct.includes("json")) {
      const body = (await resp.text()).replace(regexImgUrl, MYSUBDOMAIN + "/osimg");
      return new Response(body, { status: resp.status, headers });
    }
    return new Response(resp.body, { status: resp.status, headers });
  }
  // https://img.onesignal.com/
  if (urlPath.startsWith("/osimg/")) {
    const resp = await fetch(osImgUrl + urlPath.replace("/osimg", ""), init);
    const headers = cleanResponseHeaders(resp.headers);
    headers.set("Cache-Control", "public, max-age=2678400");
    if (urlPath.includes("png")) headers.set("Content-Type", "image/png");
    return new Response(resp.body, { status: resp.status, headers });
  }
  return new Response("NOT FOUND", { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = async () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "*" } });
