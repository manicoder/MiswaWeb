#!/bin/bash
# Unified dev runner for backend (FastAPI) and frontend (React)
# Usage: ./start.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Default ports
DEFAULT_BACKEND_PORT="${PORT:-8000}"
DEFAULT_FRONTEND_PORT="${FRONTEND_PORT:-3000}"

is_port_in_use() {
  local port="$1"
  lsof -i tcp:"$port" >/dev/null 2>&1
}

find_free_port() {
  local start_port="$1"
  local port="$start_port"
  while is_port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

BACKEND_PORT="$(find_free_port "$DEFAULT_BACKEND_PORT")"
FRONTEND_PORT="$(find_free_port "$DEFAULT_FRONTEND_PORT")"

# Backend URL for the frontend to call
BACKEND_URL="${REACT_APP_BACKEND_URL:-http://localhost:${BACKEND_PORT}}"

echo "🔧 Using BACKEND_URL=${BACKEND_URL}"
if [ "$BACKEND_PORT" != "$DEFAULT_BACKEND_PORT" ]; then
  echo "ℹ️  Default backend port ${DEFAULT_BACKEND_PORT} is busy; using ${BACKEND_PORT}"
fi
if [ "$FRONTEND_PORT" != "$DEFAULT_FRONTEND_PORT" ]; then
  echo "ℹ️  Default frontend port ${DEFAULT_FRONTEND_PORT} is busy; using ${FRONTEND_PORT}"
fi

# Start backend
start_backend() {
  echo "🚀 Starting backend on http://localhost:${BACKEND_PORT}"
  ( cd "$BACKEND_DIR" && PORT="$BACKEND_PORT" ./start.sh ) &
  BACKEND_PID=$!
  echo "🐍 Backend PID: ${BACKEND_PID}"
}

# Start frontend
start_frontend() {
  echo "🚀 Starting frontend on http://localhost:${FRONTEND_PORT}"
  cd "$FRONTEND_DIR"
  if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    if command -v yarn >/dev/null 2>&1; then
      yarn install --non-interactive
    else
      echo "❌ yarn is not installed. Install via: brew install yarn"
      exit 1
    fi
  fi
  # CRA/CRACO respects PORT env var to choose port
  PORT="$FRONTEND_PORT" REACT_APP_BACKEND_URL="$BACKEND_URL" yarn start &
  FRONTEND_PID=$!
  echo "⚛️  Frontend PID: ${FRONTEND_PID}"
}

cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  if [ -n "${FRONTEND_PID:-}" ] && ps -p "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "${BACKEND_PID:-}" ] && ps -p "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  wait || true
  echo "✅ All services stopped."
}

trap cleanup INT TERM EXIT

start_backend
start_frontend

echo ""
echo "📚 API docs:     http://localhost:${BACKEND_PORT}/docs"
echo "🖥️  Frontend:     http://localhost:${FRONTEND_PORT}"
echo "🔗 Backend URL in FE: ${BACKEND_URL}"
echo ""
echo "Press Ctrl+C to stop both."

# Wait on both processes
wait


