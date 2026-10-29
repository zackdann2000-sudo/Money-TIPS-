#!/usr/bin/env bash
# Sobe o site em produção + túnel, e reinicia ambos se caírem (para rodar em uma VPS/PC ligado).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
( while true; do npm run start -- --hostname 0.0.0.0 --port 3000 || true; sleep 2; done ) &
( while true; do ./scripts/tunnel.sh || true; sleep 5; done ) &
wait
