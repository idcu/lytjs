---
scope: build
status: active
severity: P1
last-verified: 2026-11-13
triggers: 1
keywords: [namespace, 动态导入, tree-shaking, runtime, compiler, tsup, esbuild]
---

## 症状

「不含编译器」的入口（`@lytjs/core/runtime`）体积突然接近主入口：
`runtime-app` 从 ~33 KB 跳到 ~94 KB gzip，测试仍全绿。

## 根因

1. `await import('@lytjs/renderer')` 取 **namespace**：barrel 全部导出保持 live，
   `signal` / `vapor` 又顶层 `import '@lytjs/compiler'` ⇒ 编译器整包进闭包。
2. 解构后再取用同样保留 heavy 导出：动态导入不参与静态 tree-shaking。
3. tsup `splitting:false` 会内联**相对路径**的内部动态 import；只有包 specifier
   子路径才能保持懒加载。

## 正解

- 按能力拆子路径（`@lytjs/renderer/dom` / `signal` / `app`），每个入口只 import 需要的。
- 需要多个渲染器时建**一个**合并子路径作为单一 entry point，避免首屏静态闭包多切 chunk
  （实测 +807~1,229 B gzip）。
- 门禁加产物级断言：metafile `outputs[*].inputs` 中 `compiler/dist` 的
  `bytesInOutput` 须为 0，并做反证（把 barrel 接回去必须变红）。
