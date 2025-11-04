<#
.SYNOPSIS
  Register a Windows Scheduled Task to run the local CI triage agent periodically.

.DESCRIPTION
  This script registers a Scheduled Task that runs a specified PowerShell script
  (default: C:\workspace\tools\auto_ci_agent.ps1) on a schedule. It uses
  schtasks.exe for compatibility and runs under the current user account.

.PARAMETER ScriptPath
  Absolute path to the PowerShell agent script to schedule.

.PARAMETER TaskName
  The name of the Scheduled Task. Default: AutoCI-Triage-Agent

.PARAMETER Frequency
  schtasks frequency token (MINUTE, HOURLY, DAILY). Default: HOURLY

.PARAMETER Interval
  Interval modifier for the frequency. Default: 1 (every hour)

Example:
  .\register_agent_task.ps1 -ScriptPath 'C:\workspace\tools\auto_ci_agent.ps1' -Frequency HOURLY -Interval 1

#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)] [string] $ScriptPath = 'C:\workspace\tools\auto_ci_agent.ps1',
  [Parameter(Mandatory=$false)] [string] $TaskName = 'AutoCI-Triage-Agent',
  [Parameter(Mandatory=$false)] [ValidateSet('MINUTE','HOURLY','DAILY')] [string] $Frequency = 'HOURLY',
  [Parameter(Mandatory=$false)] [int] $Interval = 1
)

if ($env:OS -notlike '*Windows*' -and $PSVersionTable.Platform -ne 'Win32NT') {
  Write-Error 'This script must be run on Windows.'; exit 2
}

if (-not (Test-Path $ScriptPath)) {
  Write-Error "Script path not found: $ScriptPath"; exit 2
}

$escaped = "$($PSHOME)\powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

Write-Output "Registering scheduled task '$TaskName' to run: $ScriptPath"

# Build schtasks arguments
$schtasksArgs = @('/Create','/SC',$Frequency,'/MO',$Interval.ToString(),'/TN',$TaskName,'/TR',$escaped,'/F')

try {
  $proc = Start-Process -FilePath schtasks.exe -ArgumentList $schtasksArgs -NoNewWindow -Wait -PassThru -ErrorAction Stop
  if ($proc.ExitCode -eq 0) {
    Write-Output 'Scheduled task created/updated successfully.'
  } else {
    Write-Warning "schtasks.exe exited with code $($proc.ExitCode)"
  }
} catch {
  Write-Error "Failed to create scheduled task: $($_.Exception.Message)"
  exit 3
}

Write-Output "To remove the task later: schtasks /Delete /TN $TaskName /F"
