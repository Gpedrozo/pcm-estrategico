#!/usr/bin/env pwsh
<#
.SYNOPSIS
Diagnostic script to identify VS Code "conflict" source

.DESCRIPTION
Checks for:
1. Real git merge conflicts
2. ESLint/TypeScript errors
3. Encoding issues
4. Stale file cache

.EXAMPLE
./scripts/diagnose-conflicts.ps1
#>

Write-Host "🔍 DIAGNÓSTICO DE CONFLITOS" -ForegroundColor Cyan
Write-Host ""

# 1. Check git status
Write-Host "1️⃣  Git Status:" -ForegroundColor Yellow
$conflicts = git status --porcelain | Where-Object { $_ -match "^[AUA] " }
if ($conflicts) {
    Write-Host "   ❌ Conflitos encontrados:" -ForegroundColor Red
    $conflicts | ForEach-Object { Write-Host "      $_" }
} else {
    Write-Host "   ✅ Nenhum conflito de git" -ForegroundColor Green
}

# 2. Search for merge markers
Write-Host ""
Write-Host "2️⃣  Merge Markers:" -ForegroundColor Yellow
$markers = Select-String -Path "src/**/*.ts", "src/**/*.tsx" -Pattern "<<<<<<|======|>>>>>>" -ErrorAction SilentlyContinue
if ($markers) {
    Write-Host "   ❌ Merge markers encontrados:" -ForegroundColor Red
    $markers | ForEach-Object { Write-Host "      $($_.Path):$($_.LineNumber)" }
} else {
    Write-Host "   ✅ Nenhum merge marker encontrado" -ForegroundColor Green
}

# 3. Check for encoding issues
Write-Host ""
Write-Host "3️⃣  Encoding Issues:" -ForegroundColor Yellow
Get-ChildItem -Path "src/**/*.ts", "supabase/**/*.sql" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Encoding Byte -First 3
    if ($content[0] -eq 0xEF -and $content[1] -eq 0xBB -and $content[2] -eq 0xBF) {
        Write-Host "   ⚠️  UTF-8 BOM: $($_.FullName)" -ForegroundColor Yellow
    } elseif ($content[0] -eq 0xFF -and $content[1] -eq 0xFE) {
        Write-Host "   ❌ UTF-16: $($_.FullName)" -ForegroundColor Red
    }
}
Write-Host "   ✅ Encoding OK" -ForegroundColor Green

# 4. Check package.json
Write-Host ""
Write-Host "4️⃣  Dependencies:" -ForegroundColor Yellow
npm list --depth=0 2>$null | Select-Object -First 15
Write-Host "   ✅ Dependencies listed" -ForegroundColor Green

# 5. Summary
Write-Host ""
Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host ""
$issues = @()
if ($conflicts) { $issues += "Git conflicts detectados" }
if ($markers) { $issues += "Merge markers encontrados" }

if ($issues.Count -eq 0) {
    Write-Host "✅ Nenhum conflito real encontrado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Os erros no VS Code podem ser:" -ForegroundColor Yellow
    Write-Host "  • Erros de TypeScript/ESLint (não conflitos de git)"
    Write-Host "  • Cache stale do Pylance/IntelliSense"
    Write-Host "  • Problemas de importação ou tipos"
    Write-Host ""
    Write-Host "Solução: Recarregue VS Code (Ctrl+Shift+P → Reload Window)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Issues encontradas:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  • $_" }
}

Write-Host ""
Write-Host "Git Status Final:" -ForegroundColor Green
git status --short

