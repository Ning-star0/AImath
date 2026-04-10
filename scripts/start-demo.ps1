$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$pidFile = Join-Path $PSScriptRoot "demo-pids.json"

$backendProcess = Start-Process -FilePath npm.cmd -ArgumentList "run","start" -WorkingDirectory $backendDir -PassThru
Start-Sleep -Seconds 3
$frontendProcess = Start-Process -FilePath npm.cmd -ArgumentList "run","start" -WorkingDirectory $frontendDir -PassThru

$payload = @{
  backendPid = $backendProcess.Id
  frontendPid = $frontendProcess.Id
  startedAt = (Get-Date).ToString("s")
} | ConvertTo-Json

Set-Content -LiteralPath $pidFile -Value $payload -Encoding UTF8

Write-Host ""
Write-Host "Demo mode started."
Write-Host "Backend PID : $($backendProcess.Id)"
Write-Host "Frontend PID: $($frontendProcess.Id)"
Write-Host "Frontend    : http://localhost:3000"
Write-Host "Backend     : http://localhost:3001"
Write-Host ""
Write-Host "Stop command: npm run demo:stop"
