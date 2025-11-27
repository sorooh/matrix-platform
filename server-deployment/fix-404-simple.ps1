# Simple PowerShell Script to Fix 404 - Matrix Platform
# Run this script to get SSH commands

$serverIP = "46.224.42.221"
$serverPassword = "aiadsham"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Matrix Platform - Fix 404 Error" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Connect to server" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "ssh root@$serverIP" -ForegroundColor Green
Write-Host ""
Write-Host "Password: $serverPassword" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Run fix script" -ForegroundColor Yellow
Write-Host "After connecting, run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "cd /opt/matrix-platform/server-deployment" -ForegroundColor Green
Write-Host "chmod +x fix-404.sh" -ForegroundColor Green
Write-Host "./fix-404.sh" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Verify fix" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "curl https://senorbit.ai/health" -ForegroundColor Green
Write-Host ""

Write-Host "Expected result: HTTP 200" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Option to run SSH command directly
$runNow = Read-Host "Do you want to connect now? (y/n)"

if ($runNow -eq "y" -or $runNow -eq "Y") {
    Write-Host ""
    Write-Host "Connecting to server..." -ForegroundColor Yellow
    Write-Host "You will be prompted for password. Enter: $serverPassword" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to run SSH with commands
    $sshCommand = "ssh root@$serverIP 'cd /opt/matrix-platform/server-deployment && chmod +x fix-404.sh && ./fix-404.sh'"
    
    Write-Host "Running command..." -ForegroundColor Yellow
    Write-Host $sshCommand -ForegroundColor Gray
    Write-Host ""
    
    # Note: This will prompt for password interactively
    Invoke-Expression $sshCommand
} else {
    Write-Host "You can run the commands manually when ready." -ForegroundColor Cyan
}

