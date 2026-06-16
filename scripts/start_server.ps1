$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $root ".venv"
$pythonExe = Join-Path $venvPath "Scripts\\python.exe"
$serverHost = "0.0.0.0"
$serverPort = 1234
$publicUrl = "http://localhost:1234"

if (-not (Test-Path $pythonExe)) {
    Write-Host "Criando ambiente virtual..."
    py -3.10 -m venv $venvPath
}

Write-Host "Instalando dependencias..."
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r (Join-Path $root "requirements.txt")

Write-Host "Inicializando banco..."
& $pythonExe (Join-Path $root "scripts\\init_db.py")

Write-Host "Subindo servidor em $publicUrl ..."
& $pythonExe -m uvicorn backend.app.main:app --host $serverHost --port $serverPort
