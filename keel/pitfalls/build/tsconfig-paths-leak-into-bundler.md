---
scope: build
status: active
severity: P1
last-verified: 2026-11-09
triggers: 0
keywords: [tsconfig paths, esbuild, src 泄漏, 体积, bundle]
---

## 症状

`check-bundle-size` 全入口超预算（minimal-app +4.5 KB gzip），但 `dist` 体积没变；
metafile 里闭包出现 160 个 `packages/*/src/*.ts`，正常只有 29 个 `dist` 模块。

## 根因

冷仓 type-check 需要，各包 tsconfig 的 `paths` 指向 `../X/src/index.ts`。
esbuild 打包 `dist/index.mjs` 时会读取该包最近的 tsconfig，并把 `paths` 用于
dist 的 import 解析 ⇒ 依赖被解析回源码、再内联一遍。tsc 要 src、消费者要 dist
共用一个 tsconfig 时，paths 必然泄漏到 bundler。

## 正解

- 消费者口径的构建显式切断继承：esbuild 传 `tsconfigRaw: '{}'`，强制 node
  resolution 走 `node_modules` → dist。
- 断言「闭包内不得有 `/src/` 输入」：复发即红，而不是只表现为数字变胖。
- 先确认基线是 dist 口径记录的，再改测量；不得按新实测上调预算。
