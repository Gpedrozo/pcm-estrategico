#!/usr/bin/env pwsh
# ============================================================================
# DISPOSITIVOS RLS FIX - AUTOMATIC DEPLOYMENT SCRIPT (WINDOWS)
# ============================================================================
# 
# Purpose: Apply RLS policy fix to dispositivos_moveis and qrcodes_vinculacao
# Usage: .\deploy_dispositivos_fix.ps1
#
# Manual Alternative: 
#   supabase db push --linked
# 
# ============================================================================

$ErrorActionPreference = "Stop"

$ProjectDir = Get-Location
$MigrationFile = "supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql"
$MigrationPath = Join-Path $ProjectDir $MigrationFile

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Dispositivos RLS Fix - Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
if (-not (Test-Path $MigrationPath)) {
    Write-Host "❌ Error: Migration file not found at: $MigrationPath" -ForegroundColor Red
    Write-Host "Make sure you're running from project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Project: $ProjectDir" -ForegroundColor Gray
Write-Host "📄 Migration: $MigrationFile" -ForegroundColor Gray
Write-Host ""

# Check if Supabase CLI is installed
$SupabasePath = (Get-Command supabase -ErrorAction SilentlyContinue).Source
if (-not $SupabasePath) {
    Write-Host "❌ Error: Supabase CLI not installed" -ForegroundColor Red
    Write-Host "Install with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found: $SupabasePath" -ForegroundColor Green
Write-Host ""

# Try to push migration
Write-Host "🚀 Pushing migration to Supabase..." -ForegroundColor Yellow
Write-Host ""

try {
    supabase db push --linked
    $ExitCode = $LASTEXITCODE
    
    if ($ExitCode -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "✅ SUCCESS!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Login as SYSTEM_OWNER to the app" -ForegroundColor Gray
        Write-Host "  2. Navigate to Owner module → Dispositivos tab" -ForegroundColor Gray
        Write-Host "  3. Verify device list loads without errors" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Yellow
        Write-Host "⚠️  PUSH FAILED" -ForegroundColor Yellow
        Write-Host "==========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Possible causes:" -ForegroundColor Yellow
        Write-Host "  • Supabase project not linked (run: supabase link)" -ForegroundColor Gray
        Write-Host "  • Insufficient permissions" -ForegroundColor Gray
        Write-Host "  • Network issues" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Alternative: Apply migration manually via Supabase Dashboard:" -ForegroundColor Cyan
        Write-Host "  1. Go to https://app.supabase.com" -ForegroundColor Gray
        Write-Host "  2. Select project 'pcm-estrategico'" -ForegroundColor Gray
        Write-Host "  3. SQL Editor → New Query" -ForegroundColor Gray
        Write-Host "  4. Copy content from: $MigrationFile" -ForegroundColor Gray
        Write-Host "  5. Run the query" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "❌ ERROR" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual deployment:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://app.supabase.com" -ForegroundColor Gray
    Write-Host "  2. Select project 'pcm-estrategico'" -ForegroundColor Gray
    Write-Host "  3. SQL Editor → New Query" -ForegroundColor Gray
    Write-Host "  4. Copy content from: $MigrationFile" -ForegroundColor Gray
    Write-Host "  5. Run the query" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
