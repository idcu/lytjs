# 批量构建所有包

$nodePath = "D:\os\run\node\node-v24.14.0-win-x64\node.exe"
$tsupPath = "F:\trae\lytjs\node_modules\tsup\dist\cli-default.js"

# L0: common 包（无依赖或依赖少）
$commonPackages = @(
    "packages\common\packages\constants",
    "packages\common\packages\is",
    "packages\common\packages\error",
    "packages\common\packages\env",
    "packages\common\packages\string",
    "packages\common\packages\object",
    "packages\common\packages\events",
    "packages\common\packages\security",
    "packages\common\packages\algorithm",
    "packages\common\packages\timing",
    "packages\common\packages\cache",
    "packages\common\packages\vnode",
    "packages\common\packages\dom",
    "packages\common\packages\http",
    "packages\common\packages\path",
    "packages\common\packages\storage",
    "packages\common\packages\raf",
    "packages\common\packages\query",
    "packages\common\packages\validate",
    "packages\common\packages\a11y",
    "packages\common\packages\transition-engine",
    "packages\common\packages\render-queue",
    "packages\common\packages\node-cache",
    "packages\common\packages\keyboard",
    "packages\common\packages\event-normalizer",
    "packages\common\packages\dom-helpers",
    "packages\common\packages\async-scheduler",
    "packages\common\packages\performance",
    "packages\common\packages\scheduler",
    "packages\common\packages\common"
)

# L0: 其他基础包
$basePackages = @(
    "packages\shared-types",
    "packages\host-contract"
)

# L1 核心包
$corePackages = @(
    "packages\reactivity",
    "packages\vdom",
    "packages\compiler"
)

# L2 平台包
$platformPackages = @(
    "packages\component",
    "packages\renderer",
    "packages\dom-runtime"
)

# L3 应用包
$appPackages = @(
    "packages\core",
    "packages\core-vnode",
    "packages\core-signal"
)

# L4 适配包
$adapterPackages = @(
    "packages\adapter-web",
    "packages\web",
    "packages\dom"
)

$allPackages = $commonPackages + $basePackages + $corePackages + $platformPackages + $appPackages + $adapterPackages

$success = @()
$failed = @()

foreach ($pkg in $allPackages) {
    $pkgPath = Join-Path "F:\trae\lytjs" $pkg
    if (Test-Path $pkgPath) {
        Write-Host "Building $pkg..." -ForegroundColor Cyan
        Set-Location $pkgPath
        
        # 运行构建
        & $nodePath $tsupPath 2>&1 | Tee-Object -Variable output | Select-Object -Last 10
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Success" -ForegroundColor Green
            $success += $pkg
        } else {
            Write-Host "  ✗ Failed" -ForegroundColor Red
            $failed += $pkg
        }
    } else {
        Write-Host "Skipping $pkg (not found)" -ForegroundColor Yellow
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

# 保存结果到文件
$result = @{
    success = $success
    failed = $failed
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
} | ConvertTo-Json

$result | Set-Content "F:\trae\lytjs\build-result.json"

Write-Host ""
Write-Host "Result saved to build-result.json" -ForegroundColor Cyan