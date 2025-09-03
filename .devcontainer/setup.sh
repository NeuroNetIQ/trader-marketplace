#!/bin/bash
set -e

echo "🚀 Setting up NeuroNetIQ ML Marketplace development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build all packages
echo "🔧 Building packages..."
pnpm build

# Make CLI globally available
echo "🛠️ Setting up CLI..."
chmod +x packages/marketplace-cli/bin/mp.js

# Test CLI installation
echo "🧪 Testing CLI..."
./packages/marketplace-cli/bin/mp.js --version

# Set up git hooks (if available)
if [ -f ".githooks/pre-commit" ]; then
    echo "🪝 Setting up git hooks..."
    git config core.hooksPath .githooks
fi

echo "✅ Development environment ready!"
echo ""
echo "🎯 Quick commands:"
echo "  mp --help                    # CLI help"
echo "  mp doctor                    # Health checks"
echo "  pnpm build                   # Build all packages"
echo "  pnpm test                    # Run tests"
echo "  ./scripts/e2e-test.sh        # E2E tests"
echo ""
echo "🚀 Start developing with the ML Marketplace!"
