# PowerShell Script to Fix 404 Error Remotely
# This script connects to the server and runs the fix script

$serverIP = "46.224.42.221"
$serverUser = "root"
$serverPassword = "aiadsham"
$serverPath = "/opt/matrix-platform/server-deployment"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Matrix Platform - Fix 404 Error Remotely" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Connecting to server: $serverIP" -ForegroundColor Yellow
Write-Host ""

# Check if plink is available (PuTTY)
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue

if ($plinkPath) {
    Write-Host "Using plink (PuTTY) for connection..." -ForegroundColor Green
    
    # Create a temporary script file with commands
    $commands = @"
cd $serverPath
chmod +x fix-404.sh
./fix-404.sh
"@
    
    $tempScript = [System.IO.Path]::GetTempFileName()
    $commands | Out-File -FilePath $tempScript -Encoding ASCII
    
    # Run commands via plink
    $plinkCommand = "plink -ssh $serverUser@$serverIP -pw $serverPassword -m `"$tempScript`""
    
    Write-Host "Running fix script on server..." -ForegroundColor Yellow
    Invoke-Expression $plinkCommand
    
    # Clean up
    Remove-Item $tempScript -ErrorAction SilentlyContinue
} else {
    Write-Host "plink not found. Using SSH (interactive password)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run these commands manually:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ssh root@$serverIP" -ForegroundColor White
    Write-Host "Password: $serverPassword" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Then run:" -ForegroundColor Cyan
    Write-Host "cd $serverPath" -ForegroundColor White
    Write-Host "chmod +x fix-404.sh" -ForegroundColor White
    Write-Host "./fix-404.sh" -ForegroundColor White
    Write-Host ""
    
    # Try to use SSH with expect-like functionality
    Write-Host "Attempting SSH connection..." -ForegroundColor Yellow
    Write-Host "You will be prompted for password. Enter: $serverPassword" -ForegroundColor Yellow
    Write-Host ""
    
    # Create SSH command
    $sshCommands = @"
cd $serverPath && chmod +x fix-404.sh && ./fix-404.sh
"@
    
    Write-Host "Run this command:" -ForegroundColor Cyan
    Write-Host "ssh root@$serverIP `"$sshCommands`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Or connect interactively:" -ForegroundColor Cyan
    Write-Host "ssh root@$serverIP" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After running the fix, verify with:" -ForegroundColor Green
Write-Host "curl https://senorbit.ai/health" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

