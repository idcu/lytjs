---
scope: meta
status: active
last-verified: 2026-11-09
keywords: [bundle, 体积预算, S30, first-screen, 基线上调, 决策]
type: decision
created: 2026-11-09
superseded-by:
---

# ADR 0027 · first-screen 预算因 S30 缺陷修复上调

- 状态：已批准（owner，2026-11-09）
- 决策：仅 `first-screen` baseline 73567 → 75448 B；其余五入口不动，`minimal-app` 硬上限 95948 B 不变。

## 背景

S25b 登记的编译缺陷在本轮修复，其中三处改动 codegen：`c7a768e5`（v-show 三元加括号）、`68bf132b`（优化版 v-if 保留 v-for）、`f9268d1e`（动态参数计算键）。first-screen 静态闭包含编译器，增长进入首屏预算。

## 归因（可复现）

隔离 worktree `/tmp/bundle-attr`（node_modules 与 76 个包 dist 均为副本，避免 symlink realpath 指回主仓），逐提交执行：

```bash
git checkout <commit>
(cd packages/compiler && tsup)
tsx scripts/check-bundle-size.ts --verbose
```

| 提交 | vdom-only | barrel-only | minimal-app | runtime-app | first-screen | first-screen-runtime |
| --- | --- | --- | --- | --- | --- | --- |
| `6362ee1a`（修复前） | 1349 | 9446 | 95152 | 93037 | 75022 | 38157 |
| `c7a768e5` | 1349 | 9446 | 95155 (+3) | 93039 (+2) | 75026 (+4) | 38157 |
| `68bf132b` | 1349 | 9446 | 95437 (+282) | 93318 (+279) | 75329 (+303) | 38157 |
| `f9268d1e` | 1349 | 9446 | 95569 (+132) | 93444 (+126) | 75463 (+134) | 38157 |
| `c99a2478`（冗余清理） | 1349 | 9446 | 95547 (−22) | 93428 (−16) | 75448 (−15) | 38157 |

净增：minimal-app +395、runtime-app +391、first-screen +426 B（三处均含编译器静态闭包）。
`vdom-only` / `barrel-only` / `first-screen-runtime` 不受影响（闭包不含编译器）。
first-screen 旧预算 73567×1.02=75038 B，超 410 B；minimal-app（95547 < 95836）与 runtime-app（93428 < 93644）仍在原预算内。

## 冗余核查

- 分支壳 `textContent=''` 与 `mountVNode` 内部 `clearHost` 重复 → 已删（−8 B）。
- RENDER_LIST 子树曾另建 `serializeListVNodeShared` 回调闭包 → 复用 `serializeListVNodeOptimized`（−7 B）。
- 未发现重复 helper 注册或重复 `createVNode`；`containsListCall` 为嵌套 v-for 判定所必需，保留。
- 压缩注释只减 dist 原始字节，esbuild 打包即剥离，对首屏 0 B，不采用。

## 结论

+426 B 是修复必要代价：不修则优化版 v-if 内的 v-for 渲染为空。按 A15 流程由 owner 批准后仅上调实际红项（first-screen）；minimal-app（95547 B）与 runtime-app（93428 B）虽各增约 0.4 KB，仍在原预算内，不上调。`--record` 拒绝上调，故手工更新并由本记录背书。
