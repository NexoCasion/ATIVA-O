$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root "data"

Write-Host "Limpando arquivos temporarios do sistema ATIVACAO..."
Write-Host "Importante: execute com o servidor parado."

$patterns = @(
    (Join-Path $dataPath "*.db-wal"),
    (Join-Path $dataPath "*.db-shm"),
    (Join-Path $dataPath "*.db-journal"),
    (Join-Path $root "server.out.log"),
    (Join-Path $root "server.err.log")
)

foreach ($pattern in $patterns) {
    Get-ChildItem -Path $pattern -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $fullPath = $_.FullName
        if ($fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $fullPath -Force
            Write-Host "Removido: $fullPath"
        }
    }
}

Write-Host "Limpeza concluida."
