# Script para deletar todos os arquivos do Portal do Mecânico
Write-Host "Deletando arquivos do Portal do Mecânico..." -ForegroundColor Yellow

# Páginas do Sistema A
Remove-Item -Path "src/pages/portal-mecanico" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/pages/portal-mecanico"

# Páginas do Sistema B
Remove-Item -Path "src/pages/PortalMecanicoOS.tsx" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/pages/PortalMecanicoOS.tsx"
Remove-Item -Path "src/pages/PainelMecanico.tsx" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/pages/PainelMecanico.tsx"

# Componentes de layout
Remove-Item -Path "src/components/layout/PortalMecanicoLayout.tsx" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/components/layout/PortalMecanicoLayout.tsx"
Remove-Item -Path "src/components/layout/PortalMecanicoNav.tsx" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/components/layout/PortalMecanicoNav.tsx"
Remove-Item -Path "src/components/layout/PortalMecanicoTopBar.tsx" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/components/layout/PortalMecanicoTopBar.tsx"

# Context
Remove-Item -Path "src/contexts/PortalMecanicoContext.tsx" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] src/contexts/PortalMecanicoContext.tsx"

# Migration
Remove-Item -Path "supabase/migrations/20260727000000_fix_portal_mecanico_web_login.sql" -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] supabase/migrations/20260727000000_fix_portal_mecanico_web_login.sql"

Write-Host ""
Write-Host "Todos os arquivos foram deletados!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora execute no terminal:" -ForegroundColor Cyan
Write-Host "  git add ." -ForegroundColor White
Write-Host '  git commit -m "feat: remover arquivos fisicos do portal mecanico"' -ForegroundColor White
Write-Host "  git push origin main" -ForegroundColor White