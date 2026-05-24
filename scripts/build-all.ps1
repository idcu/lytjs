# LytJS 按步骤构建系统
Write-Host "`n🚀 LytJS 按步骤构建系统`n" -ForegroundColor Cyan

# 构建结果
$successPackages = @()
$failedPackages = @()

function Build-Package {
    param(
        [string]$pkgPath
    )
    
    $fullPath = Join-Path $PSScriptRoot ".." $pkgPath
    
    if (-not (Test-Path (Join-Path $fullPath "package.json"))) {
        Write-Host "ℹ️  跳过: $pkgPath (无 package.json)" -ForegroundColor Yellow
        return
    }
    
    $pkgJson = Get-Content (Join-Path $fullPath "package.json") | ConvertFrom-Json
    $packageName = $pkgJson.name
    if (-not $packageName) { $packageName = $pkgPath }
    
    if (-not $pkgJson.scripts.build) {
        Write-Host "ℹ️  跳过: $packageName (无 build 脚本)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "ℹ️  正在构建: $packageName" -ForegroundColor Cyan
    Write-Host "ℹ️  路径: $pkgPath" -ForegroundColor Cyan
    
    Push-Location $fullPath
    try {
        pnpm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 构建成功: $packageName" -ForegroundColor Green
            $script:successPackages += $packageName
        } else {
            Write-Host "❌ 构建失败: $packageName" -ForegroundColor Red
            $script:failedPackages += $packageName
        }
    } catch {
        Write-Host "❌ 构建失败: $packageName" -ForegroundColor Red
        $script:failedPackages += $packageName
    } finally {
        Pop-Location
    }
}

# 步骤 1: 构建 Common 包
Write-Host "`n============================================================" -ForegroundColor Blue
Write-Host "步骤 1: 构建 Common 包" -ForegroundColor Blue
Write-Host "============================================================`n" -ForegroundColor Blue

$commonPackages = @(
    "packages/common/packages/a11y",
    "packages/common/packages/algorithm",
    "packages/common/packages/assertions",
    "packages/common/packages/async-scheduler",
    "packages/common/packages/cache",
    "packages/common/packages/common",
    "packages/common/packages/constants",
    "packages/common/packages/dom",
    "packages/common/packages/dom-helpers",
    "packages/common/packages/env",
    "packages/common/packages/error",
    "packages/common/packages/event-normalizer",
    "packages/common/packages/events",
    "packages/common/packages/http",
    "packages/common/packages/is",
    "packages/common/packages/keyboard",
    "packages/common/packages/memory",
    "packages/common/packages/node-cache",
    "packages/common/packages/object",
    "packages/common/packages/path",
    "packages/common/packages/performance",
    "packages/common/packages/query",
    "packages/common/packages/raf",
    "packages/common/packages/render-queue",
    "packages/common/packages/rate-limit",
    "packages/common/packages/scheduler",
    "packages/common/packages/security",
    "packages/common/packages/storage",
    "packages/common/packages/string",
    "packages/common/packages/timing",
    "packages/common/packages/transition-engine",
    "packages/common/packages/validate",
    "packages/common/packages/vnode",
    "packages/common/packages/warn"
)

foreach ($pkg in $commonPackages) {
    Build-Package $pkg
}

# 步骤 2: 构建核心包
Write-Host "`n============================================================" -ForegroundColor Blue
Write-Host "步骤 2: 构建核心包" -ForegroundColor Blue
Write-Host "============================================================`n" -ForegroundColor Blue

$corePackages = @(
    "packages/shared-types",
    "packages/host-contract",
    "packages/reactivity",
    "packages/vdom",
    "packages/dom-runtime",
    "packages/compiler",
    "packages/renderer",
    "packages/adapter-web",
    "packages/dom",
    "packages/web",
    "packages/component",
    "packages/core",
    "packages/core-signal",
    "packages/core-vnode"
)

foreach ($pkg in $corePackages) {
    Build-Package $pkg
}

# 步骤 3: 构建 Ecosystem 包
Write-Host "`n============================================================" -ForegroundColor Blue
Write-Host "步骤 3: 构建 Ecosystem 包" -ForegroundColor Blue
Write-Host "============================================================`n" -ForegroundColor Blue

$ecosystemPackages = @(
    "packages/ecosystem/packages/router",
    "packages/ecosystem/packages/store",
    "packages/ecosystem/packages/ssr",
    "packages/ecosystem/packages/ui",
    "packages/ecosystem/packages/devtools",
    "packages/ecosystem/packages/compat",
    "packages/ecosystem/packages/api",
    "packages/ecosystem/packages/bundler",
    "packages/ecosystem/packages/hmr",
    "packages/ecosystem/packages/runtime-edge",
    "packages/ecosystem/packages/router-fs"
)

foreach ($pkg in $ecosystemPackages) {
    Build-Package $pkg
}

# 步骤 4: 构建 Tools 包
Write-Host "`n============================================================" -ForegroundColor Blue
Write-Host "步骤 4: 构建 Tools 包" -ForegroundColor Blue
Write-Host "============================================================`n" -ForegroundColor Blue

$toolsPackages = @(
    "packages/tools/packages/cli",
    "packages/tools/packages/devtools",
    "packages/tools/packages/test-utils"
)

foreach ($pkg in $toolsPackages) {
    Build-Package $pkg
}

# 步骤 5: 构建 Plugins 包
Write-Host "`n============================================================" -ForegroundColor Blue
Write-Host "步骤 5: 构建 Plugins 包" -ForegroundColor Blue
Write-Host "============================================================`n" -ForegroundColor Blue

$pluginsPackages = @(
    "packages/plugins/packages/plugin-vite",
    "packages/plugins/packages/plugin-auth",
    "packages/plugins/packages/plugin-data",
    "packages/plugins/packages/plugin-form",
    "packages/plugins/packages/plugin-i18n"
)

foreach ($pkg in $pluginsPackages) {
    Build-Package $pkg
}

# 构建总结
Write-Host "`n============================================================" -ForegroundColor Blue
Write-Host "构建总结" -ForegroundColor Blue
Write-Host "============================================================`n" -ForegroundColor Blue

Write-Host "📊 统计:"
Write-Host "  ✅ 成功: $($successPackages.Count) 个包" -ForegroundColor Green
Write-Host "  ❌ 失败: $($failedPackages.Count) 个包" -ForegroundColor Red

if ($successPackages.Count -gt 0) {
    Write-Host "`n✅ 成功构建:" -ForegroundColor Green
    foreach ($name in $successPackages) {
        Write-Host "  - $name"
    }
}

if ($failedPackages.Count -gt 0) {
    Write-Host "`n❌ 构建失败:" -ForegroundColor Red
    foreach ($name in $failedPackages) {
        Write-Host "  - $name"
    }
}

Write-Host "`n============================================================"
if ($failedPackages.Count -eq 0 -and $successPackages.Count -gt 0) {
    Write-Host "🎉 所有包构建成功！" -ForegroundColor Green
} elseif ($failedPackages.Count -gt 0) {
    Write-Host "⚠️  构建完成，但有 $($failedPackages.Count) 个包失败" -ForegroundColor Yellow
} else {
    Write-Host "构建完成"
}
Write-Host "============================================================`n"

# 保存结果
$result = @{
    success = $successPackages
    failed = $failedPackages
}

$result | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $PSScriptRoot ".." "build-results.json")
