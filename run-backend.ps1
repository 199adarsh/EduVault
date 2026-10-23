# run-backend.ps1
# Loads environment variables from the root .env file, then starts the Spring Boot backend.
# Usage (from repo root):  .\run-backend.ps1
# Or from backend folder:  ..\run-backend.ps1

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

# Parse KEY=VALUE lines, skip blanks and comments
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $idx = $line.IndexOf("=")
        if ($idx -gt 0) {
            $key   = $line.Substring(0, $idx).Trim()
            $value = $line.Substring($idx + 1).Trim()
            Set-Item -Path "Env:$key" -Value $value
            Write-Host "  SET $key"
        }
    }
}

# Ensure Gemini Web2API proxy is running on port 8000
$proxyConn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $proxyConn) {
    Write-Host "Starting Gemini Web2API proxy on port 8000..."
    $proxyDir = Join-Path $PSScriptRoot "gemini-web2api"
    Start-Process -FilePath "python" -ArgumentList "gemini_web2api.py --port 8000" -WorkingDirectory $proxyDir -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "Gemini Web2API proxy is already running on port 8000."
}

# Ensure port 8081 is free
$killed = $false
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    $killed = $true
}
if ($killed) { Start-Sleep -Seconds 2 }

Write-Host ""
Write-Host "Starting Spring Boot backend..."
Set-Location (Join-Path $PSScriptRoot "backend")
mvn compile spring-boot:run
