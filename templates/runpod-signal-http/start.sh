#!/usr/bin/env bash
set -e

echo "🚀 Starting RunPod Signal HTTP server..."
echo "Environment:"
echo "  PORT: ${PORT:-8080}"
echo "  HOST: ${HOST:-0.0.0.0}"
echo "  MODEL_VERSION: ${MODEL_VERSION:-1.0.0}"
echo "  VENDOR_ID: ${VENDOR_ID:-not configured}"
echo "  DEPLOYMENT_ID: ${DEPLOYMENT_ID:-not configured}"
echo "  LOG_LEVEL: ${LOG_LEVEL:-info}"

if [ -n "$INFRA_SIGNALS_URL" ]; then
  echo "  INFRA_SIGNALS_URL: $INFRA_SIGNALS_URL"
  echo "  MARKETPLACE_TOKEN: ${MARKETPLACE_TOKEN:0:20}..."
else
  echo "  ⚠️  Infrastructure not configured"
fi

echo ""
echo "Starting server..."

# Start the Node.js server
exec node dist/server.js
