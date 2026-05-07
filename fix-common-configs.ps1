# 批量修复 common 包配置

$configs = @{
    "object" = @{
        deps = @("@lytjs/common-is")
        paths = @(@"`"@lytjs/common-is`"`: [@"`"../is/dist/index.d.ts`"`]")
    }
    "events" = @{
        deps = @("@lytjs/common-is")
        paths = @(@"`"@lytjs/common-is`"`: [@"`"../is/dist/index.d.ts`"`]")
    }
    "security" = @{
        deps = @("@lytjs/common-is")
        paths = @(@"`"@lytjs/common-is`"`: [@"`"../is/dist/index.d.ts`"`]")
    }
    "dom" = @{
        deps = @("@lytjs/common-is", "@lytjs/common-string", "@lytjs/common-events", "@lytjs/common-error")
        paths = @(
            @"`"@lytjs/common-is`"`: [@"`"../is/dist/index.d.ts`"`]",
            @"`"@lytjs/common-string`"`: [@"`"../string/dist/index.d.ts`"`]",
            @"`"@lytjs/common-events`"`: [@"`"../events/dist/index.d.ts`"`]",
            @"`"@lytjs/common-error`"`: [@"`"../error/dist/index.d.ts`"`]"
        )
    }
    "transition-engine" = @{
        deps = @("@lytjs/host-contract", "@lytjs/vdom")
        paths = @(
            @"`"@lytjs/host-contract`"`: [@"`"../../../host-contract/dist/index.d.ts`"`]",
            @"`"@lytjs/vdom`"`: [@"`"../../../vdom/dist/index.d.ts`"`]"
        )
    }
    "render-queue" = @{
        deps = @("@lytjs/host-contract")
        paths = @(@"`"@lytjs/host-contract`"`: [@"`"../../../host-contract/dist/index.d.ts`"`]")
    }
    "node-cache" = @{
        deps = @("@lytjs/host-contract")
        paths = @(@"`"@lytjs/host-contract`"`: [@"`"../../../host-contract/dist/index.d.ts`"`]")
    }
    "event-normalizer" = @{
        deps = @("@lytjs/host-contract", "@lytjs/common-events")
        paths = @(
            @"`"@lytjs/host-contract`"`: [@"`"../../../host-contract/dist/index.d.ts`"`]",
            @"`"@lytjs/common-events`"`: [@"`"../events/dist/index.d.ts`"`]"
        )
    }
    "async-scheduler" = @{
        deps = @("@lytjs/host-contract")
        paths = @(@"`"@lytjs/host-contract`"`: [@"`"../../../host-contract/dist/index.d.ts`"`]")
    }
    "performance" = @{
        deps = @("@lytjs/common-error")
        paths = @(@"`"@lytjs/common-error`"`: [@"`"../error/dist/index.d.ts`"`]")
    }
}

foreach ($pkg in $configs.Keys) {
    $pkgPath = "F:\trae\lytjs\packages\common\packages\$pkg"
    $tsconfigPath = "$pkgPath\tsconfig.json"
    
    if (Test-Path $tsconfigPath) {
        Write-Host "Updating $pkg/tsconfig.json..." -ForegroundColor Yellow
    } else {
        Write-Host "Creating $pkg/tsconfig.json..." -ForegroundColor Green
    }
    
    $pathsStr = $configs[$pkg].paths -join ",`n      "
    
    $content = @"
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      $pathsStr
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
"@
    
    Set-Content $tsconfigPath $content -NoNewline
    Write-Host "  Done" -ForegroundColor Green
}

Write-Host "`nAll configs updated!" -ForegroundColor Cyan