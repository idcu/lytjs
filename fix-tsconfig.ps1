# 批量修复 tsconfig.json - 添加 paths 配置

$pathsMapping = @{
    '@lytjs/common-is' = '../common/packages/is/dist/index.d.ts'
    '@lytjs/common-error' = '../common/packages/error/dist/index.d.ts'
    '@lytjs/common-scheduler' = '../common/packages/scheduler/dist/index.d.ts'
    '@lytjs/common-env' = '../common/packages/env/dist/index.d.ts'
    '@lytjs/common-constants' = '../common/packages/constants/dist/index.d.ts'
    '@lytjs/common-string' = '../common/packages/string/dist/index.d.ts'
    '@lytjs/common-object' = '../common/packages/object/dist/index.d.ts'
    '@lytjs/common-events' = '../common/packages/events/dist/index.d.ts'
    '@lytjs/common-security' = '../common/packages/security/dist/index.d.ts'
    '@lytjs/common-algorithm' = '../common/packages/algorithm/dist/index.d.ts'
    '@lytjs/common-timing' = '../common/packages/timing/dist/index.d.ts'
    '@lytjs/common-cache' = '../common/packages/cache/dist/index.d.ts'
    '@lytjs/common-vnode' = '../common/packages/vnode/dist/index.d.ts'
    '@lytjs/common-dom' = '../common/packages/dom/dist/index.d.ts'
    '@lytjs/common-http' = '../common/packages/http/dist/index.d.ts'
    '@lytjs/common-path' = '../common/packages/path/dist/index.d.ts'
    '@lytjs/common-storage' = '../common/packages/storage/dist/index.d.ts'
    '@lytjs/common-raf' = '../common/packages/raf/dist/index.d.ts'
    '@lytjs/common-query' = '../common/packages/query/dist/index.d.ts'
    '@lytjs/common-validate' = '../common/packages/validate/dist/index.d.ts'
    '@lytjs/common-a11y' = '../common/packages/a11y/dist/index.d.ts'
    '@lytjs/common-transition-engine' = '../common/packages/transition-engine/dist/index.d.ts'
    '@lytjs/common-render-queue' = '../common/packages/render-queue/dist/index.d.ts'
    '@lytjs/common-node-cache' = '../common/packages/node-cache/dist/index.d.ts'
    '@lytjs/common-keyboard' = '../common/packages/keyboard/dist/index.d.ts'
    '@lytjs/common-event-normalizer' = '../common/packages/event-normalizer/dist/index.d.ts'
    '@lytjs/common-dom-helpers' = '../common/packages/dom-helpers/dist/index.d.ts'
    '@lytjs/common-async-scheduler' = '../common/packages/async-scheduler/dist/index.d.ts'
    '@lytjs/common-performance' = '../common/packages/performance/dist/index.d.ts'
    '@lytjs/shared-types' = '../shared-types/dist/index.d.ts'
    '@lytjs/host-contract' = '../host-contract/dist/index.d.ts'
    '@lytjs/reactivity' = '../reactivity/dist/index.d.ts'
    '@lytjs/vdom' = '../vdom/dist/index.d.ts'
    '@lytjs/compiler' = '../compiler/dist/index.d.ts'
    '@lytjs/component' = '../component/dist/index.d.ts'
    '@lytjs/renderer' = '../renderer/dist/index.d.ts'
    '@lytjs/dom-runtime' = '../dom-runtime/dist/index.d.ts'
    '@lytjs/core' = '../core/dist/index.d.ts'
    '@lytjs/core-vnode' = '../core-vnode/dist/index.d.ts'
    '@lytjs/core-signal' = '../core-signal/dist/index.d.ts'
    '@lytjs/adapter-web' = '../adapter-web/dist/index.d.ts'
    '@lytjs/web' = '../web/dist/index.d.ts'
    '@lytjs/dom' = '../dom/dist/index.d.ts'
}

Get-ChildItem -Path "packages" -Recurse -Filter "tsconfig.json" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    
    # 检查是否已有 paths 配置
    if ($content -match '"paths"\s*:') {
        Write-Host "Skipping $file (already has paths)" -ForegroundColor Yellow
        return
    }
    
    # 确定该包需要哪些 paths
    $dir = $_.DirectoryName
    $packageJson = Join-Path $dir "package.json"
    
    if (Test-Path $packageJson) {
        $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json
        $neededPaths = @{}
        
        # 检查 dependencies
        if ($pkg.dependencies) {
            $pkg.dependencies.PSObject.Properties | ForEach-Object {
                $depName = $_.Name
                if ($pathsMapping.ContainsKey($depName)) {
                    $neededPaths[$depName] = $pathsMapping[$depName]
                }
            }
        }
        
        # 检查 peerDependencies
        if ($pkg.peerDependencies) {
            $pkg.peerDependencies.PSObject.Properties | ForEach-Object {
                $depName = $_.Name
                if ($pathsMapping.ContainsKey($depName)) {
                    $neededPaths[$depName] = $pathsMapping[$depName]
                }
            }
        }
        
        if ($neededPaths.Count -gt 0) {
            $pathsEntries = $neededPaths.GetEnumerator() | ForEach-Object {
                "      `"$($_.Key)`": [`"$($_.Value)`"]"
            }
            $pathsConfig = ($pathsEntries -join ",`n") 
            
            $pathsBlock = @"
    "baseUrl": ".",
    "paths": {
$pathsConfig
    }
"@
            
            # 插入 paths 配置到 compilerOptions 中
            $newContent = $content -replace '("compilerOptions":\s*\{)', "`$1`n$pathsBlock"
            
            Set-Content $file $newContent -NoNewline
            Write-Host "Fixed $file" -ForegroundColor Green
        } else {
            Write-Host "Skipping $file (no workspace deps)" -ForegroundColor Gray
        }
    }
}

Write-Host "Done!" -ForegroundColor Green