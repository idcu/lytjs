---
scope: build
status: active
severity: P2
last-verified: 2026-10-05
triggers: 2
keywords: [沙箱, bundle-require, safe-delete, build, coverage, 逐包 tsup]
---

## 症状

根 `build` 与 `test:coverage` 在宿主沙箱跑不了（55/603 文件触发 safe-delete 守卫 >50 阈值）。

## 根因

`tsx` 的依赖 bundle-require 清缓存撞上宿主守卫；**非仓库代码问题**（单包 tsup 构建成功，
栈顶是 shim）。

## 正解

- 替代路径：**逐包 `tsup` + 分包跑测试**（memory 与 `packages/<pkg>` 里都有现成命令）；
- 跑测要**前台 + 显式路径**（后台跑丢 broker socket）；renderer 与 core 分开跑；
- 不要为了"跑通"去改仓库代码或绕过守卫。
