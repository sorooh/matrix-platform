param(
  [string]$Owner = 'sorooh',
  [string]$Repo = 'matrix-platform',
  [string]$HeadBranch = 'feat/phase-0-core',
  [string]$Base = 'main',
  [string]$ChangelogPath = 'CHANGELOG.md'
)

if (-not $env:GH_TOKEN) {
  Write-Error 'GH_TOKEN env var is required with repo scope.'
  exit 2
}

$Headers = @{
  'Authorization' = "Bearer $env:GH_TOKEN"
  'Accept'        = 'application/vnd.github+json'
  'User-Agent'    = 'matrix-merge-script'
}

function Get-Json($Url) {
  try { return Invoke-RestMethod -Method GET -Uri $Url -Headers $Headers -ErrorAction Stop } catch { return $null }
}

function Patch-Json($Url, $Body) {
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method PATCH -Uri $Url -Headers $Headers -Body $json -ContentType 'application/json'
}

function Post-Json($Url, $Body) {
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method POST -Uri $Url -Headers $Headers -Body $json -ContentType 'application/json'
}

# 1) find PR by head
$head = "$Owner`:$HeadBranch"
$prs = Get-Json ("https://api.github.com/repos/" + $Owner + "/" + $Repo + "/pulls?state=open&head=" + $head)
if (-not $prs -or $prs.Count -lt 1) {
  Write-Error ("Open PR not found for head " + $head)
  exit 3
}
$pr = $prs | Select-Object -First 1
$prNumber = $pr.number

# 2) update PR body with changelog
$bodyText = ''
if (Test-Path $ChangelogPath) { $bodyText = Get-Content -Raw -Path $ChangelogPath }
if (-not [string]::IsNullOrWhiteSpace($bodyText)) {
  $newBody = "## Phase 0 + Bots v1\n\n" + $bodyText
  Patch-Json "https://api.github.com/repos/$Owner/$Repo/pulls/$prNumber" @{ body = $newBody } | Out-Null
  Write-Output "PR body updated: #$prNumber"
}

# 3) merge PR
$merge = Post-Json "https://api.github.com/repos/$Owner/$Repo/pulls/$prNumber/merge" @{ merge_method = 'squash'; commit_title = 'feat(phase-0): core + bots v1'; commit_message = 'See CHANGELOG.md' }
if ($merge.merged -eq $true) {
  Write-Output ("PR merged: " + $merge.sha)
} else {
  Write-Output ("Merge response: " + ($merge | ConvertTo-Json -Depth 6))
}


