# Simple smoke checks for the simulated backend
param()

Write-Host "Running smoke checks against http://localhost:3000"

# GET /api/apps
$apps = Invoke-RestMethod -Uri http://localhost:3000/api/apps -Method GET
if ($null -eq $apps) { Write-Error "GET /api/apps failed"; exit 1 }
Write-Host "GET /api/apps OK (count: $($apps.Count))"

# POST /api/run
$body = @{ app = $apps[0].slug } | ConvertTo-Json
$run = Invoke-RestMethod -Uri http://localhost:3000/api/run -Method POST -Body $body -ContentType 'application/json'
if ($null -eq $run.id) { Write-Error "POST /api/run failed"; exit 1 }
Write-Host "POST /api/run OK (job id: $($run.id))"

# Poll job until completed (max 10 seconds)
$jobId = $run.id
$start = [DateTime]::UtcNow
while (([DateTime]::UtcNow - $start).TotalSeconds -lt 10) {
  Start-Sleep -Milliseconds 400
  $j = Invoke-RestMethod -Uri "http://localhost:3000/api/jobs/$jobId" -Method GET
  Write-Host "job status: $($j.status)"
  if ($j.status -eq 'completed') { Write-Host "Job completed OK"; exit 0 }
}
Write-Error "Job did not complete in time"
exit 1
