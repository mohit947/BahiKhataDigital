#!/bin/bash
# ─────────────────────────────────────────────
#  Vanya Traders — Start Script
#  Run: ./start.sh
# ─────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
PG_DATA="$HOME/vanya_pgdata"

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║      Vanya Traders v1.0          ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# ── Database ─────────────────────────────────
echo "▶  [1/3] Database..."
if [ ! -d "$PG_DATA" ]; then
  echo "  First run: setting up PostgreSQL at $PG_DATA"
  initdb -D "$PG_DATA" --username="$(whoami)"
fi

if ! pg_isready -h localhost -p 5434 2>/dev/null | grep -q "accepting"; then
  pg_ctl start -D "$PG_DATA" -l /tmp/vanya_pg.log -o "-p 5434" -s
  sleep 2
fi

psql -h localhost -p 5434 -U "$(whoami)" postgres \
  -tc "SELECT 1 FROM pg_database WHERE datname='vanya_traders'" | grep -q 1 || \
  psql -h localhost -p 5434 -U "$(whoami)" postgres -c "CREATE DATABASE vanya_traders;"

echo "  ✓ localhost:5434/vanya_traders"

# ── Backend ───────────────────────────────────
echo ""
echo "▶  [2/3] Backend (FastAPI on :8000)..."
cd "$ROOT/backend"
[ ! -d "venv" ] && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
source venv/bin/activate

osascript -e "tell application \"Terminal\" to activate" \
          -e "tell application \"Terminal\" to do script \"cd '$ROOT/backend' && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\""

echo "  ✓ Opening Terminal tab for backend"
sleep 4

# ── Frontend ──────────────────────────────────
echo ""
echo "▶  [3/3] Frontend (Next.js on :3001)..."
cd "$ROOT/frontend"
[ ! -d "node_modules" ] && npm install

osascript -e "tell application \"Terminal\" to activate" \
          -e "tell application \"Terminal\" to do script \"cd '$ROOT/frontend' && npm run dev\""

echo "  ✓ Opening Terminal tab for frontend"
sleep 5

echo ""
echo "  ┌──────────────────────────────────────────┐"
echo "  │  ✅  Vanya Traders is running!            │"
echo "  │                                          │"
echo "  │  🌐 App      →  http://localhost:3001    │"
echo "  │  ⚙️  API      →  http://localhost:8000   │"
echo "  │  📖 API Docs →  http://localhost:8000/docs│"
echo "  │                                          │"
echo "  │  Login: mohit@expora.in                  │"
echo "  │  Password: Vanya@2024                    │"
echo "  └──────────────────────────────────────────┘"
echo ""
open "http://localhost:3001"
