#!/bin/bash
# mp-zhiming/scripts/test-e2e.sh · 本地一键 E2E 启动
# 用法:
#   ./scripts/test-e2e.sh        # 默认跑全部
#   KEEP_SERVER=1 ./scripts/test-e2e.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_PORT="${SERVER_PORT:-3010}"
H5_PORT="${H5_PORT:-10086}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${GREEN}[e2e]${NC} $*"; }
warn() { echo -e "${YELLOW}[e2e]${NC} $*"; }
err() { echo -e "${RED}[e2e]${NC} $*" >&2; }

check_port() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
wait_for_url() {
  local url=$1 name=$2 timeout=${3:-60}
  for i in $(seq 1 "$timeout"); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    [ "$code" = "200" ] && { log "$name ready ($i s)"; return 0; }
    sleep 1
  done
  err "$name failed within ${timeout}s"
  return 1
}

# ══════════════ 主仓 server(共享) ══════════════
ensure_server() {
  if check_port "$SERVER_PORT"; then
    warn "main server already on :$SERVER_PORT (reusing)"
    return 0
  fi
  log "⚠️ main server NOT on :$SERVER_PORT"
  warn "请手动启动主仓 server:"
  warn "  cd ../SM-APP && PORT=3010 pnpm -F @zhiming/server dev"
  err "无法继续"
  exit 1
}

ensure_h5() {
  if check_port "$H5_PORT"; then
    warn "Taro H5 already on :$H5_PORT (reusing)"
    return 0
  fi
  log "starting Taro H5 on :$H5_PORT"
  cd "$REPO_ROOT"
  nohup pnpm dev:h5 > /tmp/zhiming-mp-e2e-h5.log 2>&1 &
  echo $! > /tmp/zhiming-mp-e2e-h5.pid
  wait_for_url "http://localhost:$H5_PORT" "Taro H5" 60
}

cleanup() {
  if [ "${KEEP_SERVER:-0}" = "1" ]; then
    warn "KEEP_SERVER=1 · 保留 Taro H5 alive"
    return 0
  fi
  [ -f /tmp/zhiming-mp-e2e-h5.pid ] && kill "$(cat /tmp/zhiming-mp-e2e-h5.pid)" 2>/dev/null && warn "killed Taro H5" || true
  rm -f /tmp/zhiming-mp-e2e-h5.pid
}
trap cleanup EXIT

ensure_server
ensure_h5

log "running mp-zhiming E2E"
cd "$REPO_ROOT"
E2E_BASE_URL="http://localhost:$H5_PORT" \
  pnpm exec playwright test e2e/journey.spec.ts --reporter=list

log "done"