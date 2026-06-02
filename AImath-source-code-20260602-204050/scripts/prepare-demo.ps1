$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$rootEnv = Join-Path $root ".env"
$backendEnv = Join-Path $backendDir ".env"
$frontendEnv = Join-Path $frontendDir ".env.local"

if (-not (Test-Path $rootEnv)) {
  throw "Missing root .env file: $rootEnv"
}

Copy-Item -LiteralPath $rootEnv -Destination $backendEnv -Force

$envLines = Get-Content -LiteralPath $rootEnv
$frontendLines = $envLines | Where-Object {
  $_ -match "^(NEXT_PUBLIC_|FRONTEND_PORT=|BACKEND_PORT=|API_PREFIX=|FRONTEND_URL=)"
}
Set-Content -LiteralPath $frontendEnv -Value $frontendLines -Encoding UTF8

Write-Host "Synced env files to backend/.env and frontend/.env.local"

Push-Location $backendDir
try {
  & npx.cmd prisma generate
  if ($LASTEXITCODE -ne 0) { throw "backend prisma generate failed" }

  & npx.cmd prisma db push
  if ($LASTEXITCODE -ne 0) { throw "backend prisma db push failed" }

  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "backend build failed" }
}
finally {
  Pop-Location
}

Push-Location $frontendDir
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "Demo build is ready."
Write-Host "Next command: npm run demo:start"
