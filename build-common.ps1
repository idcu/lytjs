# 批量构建所有 common 包

$nodePath = "D:\os\run\node\node-v24.14.0-win-x64\node.exe"
$tsupPath = "F:\trae\lytjs\node_modules\tsup\dist\cli-default.js"

$commonPackages = @(
    "constants",
    "is",
    "error",
    "env",
    "string",
    "object",
    "events",
    "security",
    "algorithm",
    "timing",
    "cache",
    "vnode",
    "dom",
    "http",
    "path",
    "storage",
    "raf",
    "query",
    "validate",
    "a11y",
    "transition-engine",
    "render-queue",
    "node-cache",
    "keyboard",
    "event-normalizer",
    "dom-helpers",
    "async-scheduler",
    "performance",
    "scheduler"
)

$success = @()
$failed = @()

foreach ($pkg in $commonPackages) {
    $pkgPath = "F:\trae\lytjs\packages\common\packages\$pkg"
    if (Test-Path $pkgPath) {
        Write-Host "Building common/$pkg..." -ForegroundColor Cyan
        Set-Location $pkgPath
        
        & $nodePath $tsupPath 2>&1 | Select-Object -Last 5
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Success" -ForegroundColor Green
            $success += $pkg
        } else {
            Write-Host "  ✗ Failed" -ForegroundColor Red
            $failed += $pkg
        }
    }
}

Set-Location "F:\trae\lytjs"

Write-Host ""
Write-Host "========== Build Summary ==========" -ForegroundColor Cyan
Write-Host "Success: $($success.Count)" -ForegroundColor Green
Write-Host "Failed: $($failed.Count)" -ForegroundColor Red

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed packages:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}