#!/usr/bin/env bash
# ============================================================================
# DISPOSITIVOS RLS FIX - AUTOMATIC DEPLOYMENT SCRIPT
# ============================================================================
# 
# Purpose: Apply RLS policy fix to dispositivos_moveis and qrcodes_vinculacao
# Usage: chmod +x deploy_dispositivos_fix.sh && ./deploy_dispositivos_fix.sh
#
# Manual Alternative: 
#   supabase db push --linked
# 
# ============================================================================

set -e

PROJECT_DIR="$(pwd)"
MIGRATION_FILE="supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql"

echo "=========================================="
echo "Dispositivos RLS Fix - Deployment Script"
echo "=========================================="
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found at: $MIGRATION_FILE"
    echo "Make sure you're running from project root directory"
    exit 1
fi

echo "📂 Project: $PROJECT_DIR"
echo "📄 Migration: $MIGRATION_FILE"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Try to push migration
echo "🚀 Pushing migration to Supabase..."
echo ""

if supabase db push --linked; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "Migration applied successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Login as SYSTEM_OWNER to the app"
    echo "  2. Navigate to Owner module → Dispositivos tab"
    echo "  3. Verify device list loads without errors"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "⚠️  PUSH FAILED"
    echo "=========================================="
    echo ""
    echo "Possible causes:"
    echo "  • Supabase project not linked (run: supabase link)"
    echo "  • Insufficient permissions"
    echo "  • Network issues"
    echo ""
    echo "Alternative: Apply migration manually via Supabase Dashboard:"
    echo "  1. Go to https://app.supabase.com"
    echo "  2. Select project 'pcm-estrategico'"
    echo "  3. SQL Editor → New Query"
    echo "  4. Copy content from: $MIGRATION_FILE"
    echo "  5. Run the query"
    echo ""
    exit 1
fi
