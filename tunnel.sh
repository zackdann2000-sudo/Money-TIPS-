#!/usr/bin/env bash
# Expõe o site em uma URL fixa via Cloudflare Named Tunnel.
# Pré-requisito (uma vez, no painel Cloudflare Zero Trust → Networks → Tunnels → Create tunnel → Cloudflared):
#   copie o TOKEN do túnel e configure um "Public hostname" apontando para http://localhost:3000
# Uso:  CLOUDFLARE_TUNNEL_TOKEN=xxxx ./scripts/tunnel.sh
set -euo pipefail
BIN="${CLOUDFLARED_BIN:-/tmp/cloudflared}"
if [ ! -x "$BIN" ]; then
  echo "baixando cloudflared…"; curl -sL -o "$BIN" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64; chmod +x "$BIN"
fi
if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  echo "iniciando Named Tunnel (URL fixa definida no painel Cloudflare)…"
  exec "$BIN" tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
else
  echo "⚠ Sem CLOUDFLARE_TUNNEL_TOKEN: abrindo Quick Tunnel (URL ALEATÓRIA, só para teste)…"
  exec "$BIN" tunnel --no-autoupdate --url http://localhost:3000
fi
