#!/usr/bin/env bash
# Starts the Astro docs dev server and opens it in the browser.
# Detects the available package manager and finds a free port automatically.

set -euo pipefail

DOCS_DIR="docs"

if [ ! -d "$DOCS_DIR" ]; then
  echo "Error: $DOCS_DIR directory not found in $(pwd)"
  exit 1
fi

# Use the port provided as the first argument, or detect a free one automatically.
if [ -n "${1:-}" ]; then
  PORT="$1"
else
  # Try Python to find an available port dynamically.
  if command -v python3 >/dev/null 2>&1; then
    PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
  elif command -v python >/dev/null 2>&1; then
    PORT=$(python -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
  else
    # Fall back to scanning a port range if Python is unavailable.
    START_PORT=3000
    END_PORT=$((START_PORT + 99))
    PORT=""
    for p in $(seq $START_PORT $END_PORT); do
      if ! (ss -ltn 2>/dev/null | grep -qE "[:.]$p\b"); then
        PORT=$p
        break
      fi
    done
    PORT=${PORT:-3000}
  fi
fi

cd "$DOCS_DIR"

# Disable the Astro dev toolbar globally to suppress the in-browser overlay.
if command -v npx >/dev/null 2>&1; then
  echo "Disabling Astro dev toolbar (devToolbar preference)"
  npx astro preferences disable devToolbar --global >/dev/null 2>&1 || true
fi

# Detect the preferred package manager: pnpm > yarn > npm.
PKG_MANAGER="npm"
if command -v pnpm >/dev/null 2>&1; then
  PKG_MANAGER="pnpm"
elif command -v yarn >/dev/null 2>&1; then
  PKG_MANAGER="yarn"
elif command -v npm >/dev/null 2>&1; then
  PKG_MANAGER="npm"
fi

# Install docs dependencies if node_modules is missing.
if [ ! -d "node_modules" ]; then
  echo "Installing docs dependencies with $PKG_MANAGER..."
  if [ "$PKG_MANAGER" = "pnpm" ]; then
    pnpm install
  elif [ "$PKG_MANAGER" = "yarn" ]; then
    yarn install --silent
  else
    npm install --no-audit --no-fund --silent
  fi
fi

# Build the dev server start command for the detected package manager.
DEV_CMD=""
if [ "$PKG_MANAGER" = "pnpm" ]; then
  DEV_CMD="pnpm run dev -- --port $PORT"
elif [ "$PKG_MANAGER" = "yarn" ]; then
  DEV_CMD="yarn dev --port $PORT"
else
  DEV_CMD="npm run dev -- --port $PORT"
fi

echo "Starting Astro dev server (docs) on http://127.0.0.1:$PORT"

# Launch the dev server as a background process.
# The PID is captured so it can be stopped on exit via the cleanup trap.
sh -c "$DEV_CMD" &
SERVER_PID=$!

cleanup() {
  echo "Stopping dev server (PID $SERVER_PID)"
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

URL="http://127.0.0.1:$PORT/"

# Poll until the server is accepting connections, up to MAX_WAIT seconds.
MAX_WAIT=20
WAITED=0
SLEEP_INTERVAL=0.25
while [ $WAITED -lt $MAX_WAIT ]; do
  if command -v curl >/dev/null 2>&1; then
    if curl -sSf --head "$URL" >/dev/null 2>&1; then
      break
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -q --spider "$URL" >/dev/null 2>&1; then
      break
    fi
  fi
  sleep "$SLEEP_INTERVAL"
  WAITED=$(awk "BEGIN{print $WAITED+$SLEEP_INTERVAL}")
done

# Open the browser to the dev server URL using the platform's default opener.
open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 || true
  else
    echo "Preview available at: $URL"
  fi
}

open_browser

echo "Press Ctrl+C to stop the preview and exit."

# Wait for the dev server process to finish (normally after Ctrl+C).
wait "$SERVER_PID" || true
