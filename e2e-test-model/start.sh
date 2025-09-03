#!/usr/bin/env bash
set -e

echo "Starting RunPod Signal HTTP server..."
echo "Environment:"
echo "  PORT: ${PORT:-8080}"
echo "  VENDOR_ID: ${VENDOR_ID}"
echo "  DEPLOYMENT_ID: ${DEPLOYMENT_ID}"
echo "  INFRA_SIGNALS_URL: ${INFRA_SIGNALS_URL}"

# Start the Node.js server
exec node dist/server.js