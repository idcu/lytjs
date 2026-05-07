# 批量修复 tsup.config.ts - 添加 external 配置

$commonPackages = @(
    '@lytjs/common-is',
    '@lytjs/common-error', 
    '@lytjs/common-scheduler',
    '@lytjs/common-env',
    '@lytjs/common-constants',
    '@lytjs/common-string',
    '@lytjs/common-object',
    '@lytjs/common-events',
    '@lytjs/common-security',
    '@lytjs/common-algorithm',
    '@lytjs/common-timing',
    '@lytjs/common-cache',
    '@lytjs/common-vnode',
    '@lytjs/common-dom',
    '@lytjs/common-http',
    '@lytjs/common-path',
    '@lytjs/common-storage',
    '@lytjs/common-raf',
    '@lytjs/common-query',
    '@lytjs/common-validate',
    '@lytjs/common-a11y',
    '@lytjs/common-transition-engine',
    '@lytjs/common-render-queue',
    '@lytjs/common-node-cache',
    '@lytjs/common-keyboard',
    '@lytjs/common-event-normalizer',
    '@lytjs/common-dom-helpers',
    '@lytjs/common-async-scheduler',
    '@lytjs/common-performance',
    '@lytjs/common-vnode',
    '@lytjs/common-validate',
    '@lytjs/common'
)

$corePackages = @(
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/dom-runtime',
    '@lytjs/core',
    '@lytjs/core-vnode',
    '@lytjs/core-signal',
    '@lytjs/adapter-web',
    '@lytjs/web',
    '@lytjs/dom'
)

$allPackages = $commonPackages + $corePackages

Get-ChildItem -Path "packages" -Recurse -Filter "tsup.config.ts" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    
    # 检查是否已有 external 配置
    if ($content -match "external\s*:") {
        Write-Host "Skipping $file (already has external)" -ForegroundColor Yellow
        return
    }
    
    # 确定该包需要哪些 external
    $dir = $_.DirectoryName
    $packageJson = Join-Path $dir "package.json"
    
    if (Test-Path $packageJson) {
        $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json
        $deps = @()
        
        # 检查 dependencies
        if ($pkg.dependencies) {
            $pkg.dependencies.PSObject.Properties | ForEach-Object {
                if ($allPackages -contains $_.Name) {
                    $deps += $_.Name
                }
            }
        }
        
        # 检查 peerDependencies
        if ($pkg.peerDependencies) {
            $pkg.peerDependencies.PSObject.Properties | ForEach-Object {
                if ($allPackages -contains $_.Name) {
                    $deps += $_.Name
                }
            }
        }
        
        if ($deps.Count -gt 0) {
            $externalList = ($deps | ForEach-Object { "    '$_'" }) -join ",`n"
            $externalConfig = @"
  external: [
$externalList
  ],
"@
            
            # 插入 external 配置到 defineConfig 中
            $newContent = $content -replace "(defineConfig\(\{)", "`$1`n$externalConfig"
            
            Set-Content $file $newContent -NoNewline
            Write-Host "Fixed $file" -ForegroundColor Green
        } else {
            Write-Host "Skipping $file (no workspace deps)" -ForegroundColor Gray
        }
    }
}

Write-Host "Done!" -ForegroundColor Green