$ErrorActionPreference = "Stop"

$pidFile = Join-Path $PSScriptRoot "demo-pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "No demo process record found."
  exit 0
}

$pids = Get-Content -LiteralPath $pidFile | ConvertFrom-Json

foreach ($pid in @($pids.backendPid, $pids.frontendPid)) {
  if (-not $pid) { continue }
  $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $pid -Force
    Write-Host "Stopped process $pid"
  }
}

Remove-Item -LiteralPath $pidFile -Force
Write-Host "Demo mode stopped."
