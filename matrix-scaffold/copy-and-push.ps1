param(
  [string]$SourceDir = "$env:USERPROFILE\matrix-scaffold",
  [string]$RepoDir   = "$env:USERPROFILE\matrix-platform",
  [string]$Branch    = "ci/e2e-remote-runner",
  [string]$CommitMsg = "ci: e2e remote-runner, metrics and monitoring; add reconciler and runner load tracking",
  [switch]$DryRun
)

function Abort($msg) { Write-Error $msg; exit 1 }

Write-Host "SourceDir: $SourceDir"
Write-Host "RepoDir:   $RepoDir"

if (-not (Test-Path $SourceDir)) { Abort "SourceDir not found: $SourceDir" }
if (-not (Test-Path $RepoDir))   { Abort "RepoDir not found: $RepoDir" }

$DestDir = Join-Path -Path $RepoDir -ChildPath "matrix-scaffold"
if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }

Write-Host "Copying files from $SourceDir -> $DestDir (mirroring)..."
$robocopyArgs = @("`"$SourceDir`"", "`"$DestDir`"", "/MIR", "/Z", "/R:3", "/W:2", "/NFL", "/NDL")
& robocopy @robocopyArgs
if ($LASTEXITCODE -gt 8) { Write-Warning "robocopy exit code $LASTEXITCODE (>=8 may indicate copy problems)." }

Push-Location $RepoDir
try {
  if (-not (Test-Path ".git")) { Abort "No .git found in $RepoDir; cd into your repo and re-run." }

  git fetch origin
  $branchExists = git rev-parse --verify $Branch 2>$null
  if ($branchExists) { git checkout $Branch } else { git checkout -b $Branch }

  git add --force "matrix-scaffold"
  $status = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit under matrix-scaffold."
    Pop-Location; exit 0
  }

  git commit -m "$CommitMsg"
  git push -u origin $Branch
  if ($LASTEXITCODE -ne 0) { Abort "git push failed. Check authentication or remote 'origin'." }

  Write-Host "✅ Push completed. CI will run for branch $Branch."
}
finally {
  Pop-Location
}
