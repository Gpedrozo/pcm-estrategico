param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [string]$OutDir = "reports/snapshots",

  [switch]$IncludeDataDump,

  [switch]$SkipCodeSnapshot
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Supabase {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase @Args
    return
  }

  & npx supabase @Args
}

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$snapshotDir = Join-Path $OutDir $ts
New-Item -ItemType Directory -Path $snapshotDir -Force | Out-Null

Write-Host "[1/5] Linkando projeto Supabase: $ProjectRef"
Invoke-Supabase -Args @('link', '--project-ref', $ProjectRef)

Write-Host "[2/5] Exportando schema public/auth"
Invoke-Supabase -Args @('db', 'dump', '--linked', '--schema', 'public,auth', '--file', (Join-Path $snapshotDir 'schema_public_auth.sql'))

if ($IncludeDataDump) {
  Write-Host "[3/5] Exportando dump completo de dados"
  Invoke-Supabase -Args @('db', 'dump', '--linked', '--data-only', '--file', (Join-Path $snapshotDir 'data_only.sql'))
} else {
  Write-Host "[3/5] Dump de dados completo ignorado (use -IncludeDataDump para habilitar)"
}

Write-Host "[4/5] Salvando inventario local de migracoes"
Get-ChildItem -Path 'supabase/migrations' -File |
  Sort-Object Name |
  Select-Object Name, Length, LastWriteTime |
  ConvertTo-Json -Depth 4 |
  Set-Content -Path (Join-Path $snapshotDir 'local_migrations_inventory.json') -Encoding UTF8

if (-not $SkipCodeSnapshot) {
  Write-Host "[5/5] Gerando snapshot de codigo"
  if (Test-Path '.git') {
    & git rev-parse HEAD | Set-Content -Path (Join-Path $snapshotDir 'git_head.txt') -Encoding UTF8
    & git status --short | Set-Content -Path (Join-Path $snapshotDir 'git_status.txt') -Encoding UTF8
    & git diff | Set-Content -Path (Join-Path $snapshotDir 'git_diff.patch') -Encoding UTF8
  } else {
    $zipPath = Join-Path $snapshotDir 'workspace_snapshot.zip'
    $tmp = Join-Path $env:TEMP ("pcm-snapshot-" + $ts)
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null

    Copy-Item -Path * -Destination $tmp -Recurse -Force -Exclude @('node_modules', '.next', 'dist', '.git', 'reports/snapshots')
    Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $zipPath -Force
    Remove-Item -Path $tmp -Recurse -Force
  }
} else {
  Write-Host "[5/5] Snapshot de codigo ignorado (flag -SkipCodeSnapshot)"
}

@{
  project_ref = $ProjectRef
  generated_at = (Get-Date).ToString('o')
  snapshot_dir = $snapshotDir
  include_data_dump = [bool]$IncludeDataDump
  code_snapshot_skipped = [bool]$SkipCodeSnapshot
} | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $snapshotDir 'snapshot_manifest.json') -Encoding UTF8

Write-Host "Snapshot concluido em: $snapshotDir"
