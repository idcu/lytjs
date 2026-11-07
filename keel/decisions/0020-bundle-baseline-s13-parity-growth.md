---
scope: meta
status: active
last-verified: 2026-11-07
keywords: [bundle, 体积预算, A15, S13, compiler, parity, 基线上调, 决策]
type: decision
created: 2026-11-07
superseded-by:
---

# 0020 · S13 对拍补齐带来的体积基线更新（owner 签字）

## 背景

S13 路径 1 要求把 `check-compiler-parity` 修到 100/100。为补齐优化版
signal codegen 的语义缺口，`packages/compiler` 增加了根级文本 / 多插值槽位 /
v-if 分支动态内容 / kebab 组件引用 / v-for 嵌套子元素等生成逻辑。
这些代码进入 `@lytjs/core` 首屏静态闭包（A15 已记录的已知债务：首屏闭包含编译器），
因此体积预算被推高。

对照 `a3f0a21e`（S07 体积回归修复后，bundle 17/17 绿），复测编译器产物：

- `packages/compiler/dist/index.mjs` gzip **+2,907 B**（**60,200 → 63,107 B**）；
- 三个入口的闭包增量分别为 minimal-app +2,575 B、runtime-app +2,689 B、
  first-screen +2,590 B（树摇会削掉一部分未触达代码，故略小于 dist 全量增量）；
- 三者均超旧基线 +2%，但均未突破 A15 阶段硬上限。

## 实测值（2026-11-07，commit 970e3b30）

| 入口 | 旧基线 | 实测 | 旧预算（+2%） | 新基线 | 新预算（+2%） |
| --- | --- | --- | --- | --- | --- |
| minimal-app | 91,382 B | **93,957 B** | 93,209 B | 93,957 B | 95,836 B |
| runtime-app | 89,119 B | **91,808 B** | 90,901 B | 91,808 B | 93,644 B |
| first-screen | 70,977 B | **73,567 B** | 72,396 B | 73,567 B | 75,038 B |

- `minimal-app` 阶段硬上限 **95,948 B**（脚本写死），实测 93,957 B 仍在限内；
- `first-screen-runtime`（运行时闭包，不含编译器）实测 37,884 B，未受影响。

## 判定依据

1. 增长来自 **S13 对拍补齐的必要功能**，不是构建/依赖漂移：
   编译器 dist gzip 增量（+2,907 B）与三入口闭包增量（+2.5~2.7 KB）同源。
2. 未放宽任何断言：`check-compiler-parity` 仍为 100/100、`expectedMismatch` 0；
   两套输出契约与测试未改。
3. 未按实测随意上调：只把三个受影响入口的基线抬到**当前实测值**，其余入口不动；
   `minimal-app` 硬上限保持 95,948 B 不变。

## 后续复查项（必须执行，防止基线一路抬升）

- 日后压体积从**编译器输出形态**入手，不靠继续抬基线：
  - 优先消除两套发射器仍重复的静态/分支 HTML 序列化与分支动态收集代码；
  - 当优化版输出契约可正式废弃时，收敛为单发射器（短别名作为内部选项）；
  - 评估首屏闭包彻底剔除编译器（A15 已知债务，B03/AOT 方向）。
- 下次体积变更若再次触发上调，必须先证明「非必要的形态冗余」，否则应修复而非调基线。

## 验收

- `node scripts/check-bundle-size.ts`：**17/17 绿**（基线更新后）。
- `pnpm run format:check`：绿。
- fast + slow 门禁复跑：绿（见 keel/NOW.md 记录）。
