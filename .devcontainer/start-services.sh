#!/bin/bash
set -e

echo "🚀 Starting development services..."

# Start Supabase services
echo "🗄️ Starting Supabase..."
cd /workspace
supabase start || echo "⚠️ Supabase start failed - may need manual setup"

# Apply marketplace migrations
echo "📊 Applying marketplace database schema..."
supabase db push || echo "⚠️ Database migration failed - check connection"

# Seed sample data
echo "🌱 Seeding sample data..."
cat << 'EOF' | supabase db sql
-- Sample vendor
INSERT INTO marketplace_vendors (id, name, api_key_hash, status) VALUES 
('vendor_dev_001', 'Development Vendor', 'hashed_api_key', 'active')
ON CONFLICT (id) DO NOTHING;

-- Sample dataset round
INSERT INTO dataset_rounds (id, name, description, is_current, files) VALUES 
('2025-01-03', 'Development Round', 'Sample trading data for development', TRUE, 
'[{"name":"train.csv","type":"train","size_bytes":1000000,"format":"csv"}]')
ON CONFLICT (id) DO UPDATE SET is_current = TRUE;
EOF

echo "✅ Development services ready!"
echo ""
echo "🎯 Available services:"
echo "  Supabase API: http://localhost:54321"
echo "  Supabase Dashboard: http://localhost:54323"
echo "  PostgreSQL: localhost:54322"
echo ""
echo "🛠️ Development commands:"
echo "  mp doctor                    # Check health"
echo "  pnpm dev:inference          # Start inference template"
echo "  pnpm test                   # Run all tests"
