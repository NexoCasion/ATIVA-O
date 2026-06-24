$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $root ".venv"
$pythonExe = Join-Path $venvPath "Scripts\\python.exe"
$requirementsPath = Join-Path $root "requirements.txt"
$installMarker = Join-Path $venvPath ".requirements-installed"
$serverHost = "0.0.0.0"
$serverPort = 1234
$publicUrl = "http://localhost:1234"

if (-not (Test-Path $pythonExe)) {
    Write-Host "Criando ambiente virtual..."
    py -3.10 -m venv $venvPath
}

$shouldInstallDependencies = -not (Test-Path $installMarker)
if (-not $shouldInstallDependencies) {
    $requirementsChanged = (Get-Item $requirementsPath).LastWriteTimeUtc -gt (Get-Item $installMarker).LastWriteTimeUtc
    $shouldInstallDependencies = $requirementsChanged
}

if ($shouldInstallDependencies) {
    Write-Host "Instalando dependencias..."
    & $pythonExe -m pip install -r $requirementsPath
    Set-Content -Path $installMarker -Value (Get-Date).ToString("s")
}
else {
    Write-Host "Dependencias ja instaladas. Pulando pip install."
}

Write-Host "Inicializando banco..."
& $pythonExe (Join-Path $root "scripts\\init_db.py")

Write-Host "Subindo servidor em $publicUrl ..."
& $pythonExe -m uvicorn backend.app.main:app --host $serverHost --port $serverPort
