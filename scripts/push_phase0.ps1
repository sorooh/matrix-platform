param(
  [string]$Owner = 'sorooh',
  [string]$Repo = 'matrix-platform',
  [string]$Branch = 'feat/phase-0-core'
)

if (-not $env:GH_TOKEN) {
  Write-Error 'GH_TOKEN env var is required with repo scope.'
  exit 2
}

$Headers = @{
  'Authorization' = "Bearer $env:GH_TOKEN"
  'Accept'        = 'application/vnd.github+json'
  'User-Agent'    = 'matrix-phase0-pusher'
}

function Get-Json($Url) {
  try { return Invoke-RestMethod -Method GET -Uri $Url -Headers $Headers -ErrorAction Stop } catch { return $null }
}

function Put-Content($Path, $LocalPath, $Message, $Branch) {
  $contentBytes = [System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw -Path $LocalPath))
  $contentB64 = [Convert]::ToBase64String($contentBytes)
  $url = "https://api.github.com/repos/$Owner/$Repo/contents/$Path"
  $sha = $null
  $existing = Get-Json "$url?ref=$Branch"
  if ($existing -and $existing.sha) { $sha = $existing.sha }
  $body = @{ message = $Message; content = $contentB64; branch = $Branch; committer = @{ name = 'Matrix Assistant'; email = 'assistant@users.noreply.github.com' } }
  if ($sha) { $body.sha = $sha }
  $json = $body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method PUT -Uri $url -Headers $Headers -Body $json -ContentType 'application/json'
}

# 1) ensure base ref
$baseRef = Get-Json "https://api.github.com/repos/$Owner/$Repo/git/refs/heads/main"
if (-not $baseRef) {
  Write-Error 'Failed to fetch base ref heads/main'
  exit 3
}
$baseSha = $baseRef.object.sha

# 2) create branch
$newRefBody = @{ ref = "refs/heads/$Branch"; sha = $baseSha } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri "https://api.github.com/repos/$Owner/$Repo/git/refs" -Headers $Headers -Body $newRefBody -ContentType 'application/json' | Out-Null
} catch {
  # ignore if already exists (HTTP 422)
}

# 3) files to push
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$files = @(
  @{ path = '.gitignore'; local = Join-Path $Root '.gitignore' },
  @{ path = 'matrix-scaffold/backend/src/core/schema.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/schema.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/storage.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/storage.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/eventBus.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/eventBus.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/memory.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/memory.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/runtime.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/runtime.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/nicholas.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/nicholas.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/logs.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/logs.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/hooks.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/hooks.ts' },
  @{ path = 'matrix-scaffold/backend/src/core/tasks.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/core/tasks.ts' },
  @{ path = 'matrix-scaffold/backend/src/bots/index.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/bots/index.ts' },
  @{ path = 'matrix-scaffold/backend/src/integrations/slack.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/integrations/slack.ts' },
  @{ path = 'matrix-scaffold/backend/src/integrations/github.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/integrations/github.ts' },
  @{ path = 'matrix-scaffold/backend/src/integrations/s3.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/integrations/s3.ts' },
  @{ path = 'matrix-scaffold/backend/package.json'; local = Join-Path $Root 'matrix-scaffold/backend/package.json' },
  @{ path = 'matrix-scaffold/backend/src/main.ts'; local = Join-Path $Root 'matrix-scaffold/backend/src/main.ts' },
  @{ path = 'matrix-scaffold/frontend/src/App.tsx'; local = Join-Path $Root 'matrix-scaffold/frontend/src/App.tsx' },
  @{ path = 'matrix-scaffold/README.md'; local = Join-Path $Root 'matrix-scaffold/README.md' }
)

$commitMessage = 'feat(phase-0): Nicholas core, event bus, runtime, vector memory, APIs, SSE, logs'

foreach ($f in $files) {
  if (-not (Test-Path $f.local)) { Write-Error "Missing local file: $($f.local)"; exit 4 }
  Put-Content -Path $f.path -LocalPath $f.local -Message $commitMessage -Branch $Branch | Out-Null
}

# 4) open PR
$prBody = @{
  title = 'Phase 0: Nicholas core, runtime engine, event bus, memory, SSE'
  head  = $Branch
  base  = 'main'
  body  = 'Implements phase 0 core: Nicholas orchestrator, event bus + SSE, runtime engine with Docker fallback, vector memory + APIs, frontend live logs. See README for usage.'
} | ConvertTo-Json
$pr = Invoke-RestMethod -Method POST -Uri "https://api.github.com/repos/$Owner/$Repo/pulls" -Headers $Headers -Body $prBody -ContentType 'application/json'
Write-Output ("PR created: " + $pr.html_url)


