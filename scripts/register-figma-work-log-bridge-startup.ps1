[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string] $TaskName = "Neet2Work Figma Work Log Bridge",
  [switch] $StartNow,
  [switch] $Unregister
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$launcherPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "start-figma-work-log-bridge.ps1")).Path
$powershellPath = Join-Path $PSHOME "powershell.exe"
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if ($Unregister) {
  if ($PSCmdlet.ShouldProcess($TaskName, "Unregister scheduled task")) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
  Write-Output "Unregistered scheduled task: $TaskName"
  exit 0
}

$action = New-ScheduledTaskAction `
  -Execute $powershellPath `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`"" `
  -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable

if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled task")) {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Starts the Neet2Work Figma work log bridge at Windows logon." `
    -Force | Out-Null
}

if ($StartNow -and $PSCmdlet.ShouldProcess($TaskName, "Start scheduled task")) {
  Start-ScheduledTask -TaskName $TaskName
}

Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State
