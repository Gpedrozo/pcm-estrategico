param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectRef,

  [switch]$IncludeCutover
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Supabase {
  param(
    [Parameter(Mandatory=$true)]
    [string[]]$Args
  )

  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase @Args
    return
  }

  & npx supabase @Args
}

function Assert-DbQuerySupport {
  $helpOutput = if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase db --help | Out-String
  } else {
    & npx supabase db --help | Out-String
  }

  if ($helpOutput -notmatch '\bquery\b') {
    throw "Esta versão do Supabase CLI não suporta 'db query'. Use migrações e 'supabase db push --include-all'."
  }
}

$files = @(
  'supabase/rebuild/00_drop_all_project_objects.sql',
  'supabase/rebuild/01_create_backend_v2.sql',
  'supabase/rebuild/02_security_rbac_rls_v2.sql',
  'supabase/rebuild/03_front_compat_views.sql',
  'supabase/rebuild/04_edge_refactor_contract.sql',
  'supabase/rebuild/05_analytics_layer_v2.sql',
  'supabase/rebuild/08_cleanup_legacy_objects.sql',
  'supabase/rebuild/09_seed_owner_master_users.sql'
)

if ($IncludeCutover) {
  $files += 'supabase/rebuild/06_cutover_finalize.sql'
}

Write-Host "Linkando projeto Supabase $ProjectRef..."
Invoke-Supabase -Args @('link', '--project-ref', $ProjectRef)

Assert-DbQuerySupport

foreach ($file in $files) {
  Write-Host "Executando $file ..."
  Invoke-Supabase -Args @('db', 'query', '--file', $file)
}

if ($IncludeCutover) {
  Write-Host "Fases 0-6 + 8-9 executadas com sucesso."
} else {
  Write-Host "Fases 0-5 + 8-9 executadas com sucesso."
  Write-Host "Para Fase 6 (cutover), execute com:"
  Write-Host ".\\scripts\\run-rebuild-phases.ps1 -ProjectRef $ProjectRef -IncludeCutover"
}
