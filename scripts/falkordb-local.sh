#!/usr/bin/env bash
# Run FalkorDB without Docker: redis-server + the official FalkorDB module (Linux x64).
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)/.falkordb"; mkdir -p "$DIR"
if [ ! -f "$DIR/falkordb.so" ]; then
  curl -fsSL -o "$DIR/falkordb.so" https://github.com/FalkorDB/FalkorDB/releases/download/v6.0.1/falkordb-x64.so
  chmod +x "$DIR/falkordb.so"
fi
exec redis-server --port "${FALKORDB_PORT:-6379}" --loadmodule "$DIR/falkordb.so" --save '' --appendonly no
