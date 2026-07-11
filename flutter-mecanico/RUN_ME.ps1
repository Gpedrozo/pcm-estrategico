# ==========================================
# SCRIPT DEFINITIVO - execução automática
# Cole e execute NO TERMINAL POWERSHELL
# ==========================================
Write-Host "=== LIMPANDO CACHE E ARQUIVOS ANTIGOS ===" -ForegroundColor Yellow

# Remove lock corrompido
Remove-Item "pubspec.lock" -Force -ErrorAction SilentlyContinue

# Remove cache de hooks (causa do erro objective_c)
Remove-Item ".dart_tool" -Recurse -Force -ErrorAction SilentlyContinue

# Remove stubs criados acidentalmente
Remove-Item "stubs" -Recurse -Force -ErrorAction SilentlyContinue

# Remove script auxiliar
Remove-Item "__RUN_APP.ps1" -Force -ErrorAction SilentlyContinue

Write-Host "=== BAIXANDO DEPENDÊNCIAS ===" -ForegroundColor Yellow
flutter pub get

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== RODANDO APP NO CHROME ===" -ForegroundColor Green
    flutter run -d chrome
} else {
    Write-Host "=== ERRO: falha ao baixar dependências ===" -ForegroundColor Red
    pause
}