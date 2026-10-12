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
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  SET $key"
        }
    }
}

Write-Host ""
Write-Host "Starting Spring Boot backend..."
Set-Location (Join-Path $PSScriptRoot "backend")
mvn spring-boot:run
