#!/usr/bin/env bash
set -euo pipefail

echo "Starting SecureDove server and client..."

# Start server in background
( cd server && npm start ) &
SERVER_PID=$!

# Start client in background
( cd client && npm run dev ) &
CLIENT_PID=$!

cleanup() {
  echo
  echo "Stopping server and client..."
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
}
trap cleanup INT TERM

echo "Both server and client are starting..."
echo "Press Ctrl+C to stop both."

# Wait for both processes to exit
wait "$SERVER_PID" "$CLIENT_PID"

