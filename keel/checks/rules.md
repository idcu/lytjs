---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [校验, 规则, 扩展检查, CI, 门禁]
---

# 扩展检查（项目自定）

> Keel 内核只做通用检查（`keel-lint.sh`）。本文件登记**本仓真实可执行**的门禁命令。
> 每条规则必须写得出一个可执行命令；写不出命令的，不是检查项，是愿望。

## 已声明的扩展检查

| # | 检查 | 命令 | 级别 | 触发时机 |
|---|---|---|---|---|
| 1 | 快档门禁（构建顺序 + UI slot + props + alias） | `corepack pnpm@11.3.0 check:fast` | ❌ fail | 本地（含需 dist 的 alias 检查） |
| 2 | 契约漂移（产物 import 的绑定名须在导出面） | `corepack pnpm@11.3.0 check-runtime-contract` | ❌ fail | CI（build job 后置）+ 发布前 |
| 3 | 文档 import 欠账（棘轮） | `corepack pnpm@11.3.0 check-doc-imports` | ❌ fail | CI（build job 后置）+ 发布前 |
| 4 | UI slot 单节点（红门禁） | `corepack pnpm@11.3.0 check-ui-slot-single-node` | ❌ fail | CI（keel-gates job） |
| 5 | UI props 接线（报告型棘轮） | `corepack pnpm@11.3.0 check-ui-props-wiring` | ⚠️ warn | CI（keel-gates job） |
| 6 | 运行时循环依赖（棘轮） | `corepack pnpm@11.3.0 check-circular:src` | ❌ fail | CI（keel-gates job）+ 定时 |
| 7 | 构建顺序一致性 | `corepack pnpm@11.3.0 check-build-order` | ❌ fail | CI（build-order job） |
| 8 | vitest alias 目标存在（防用例静默少跑） | `corepack pnpm@11.3.0 check-vitest-alias-dist` | ❌ fail | CI（build job 后置） |
| 9 | 慢档全量（发布前） | `corepack pnpm@11.3.0 gate --tier slow` | ❌ fail | 发布前 / 定时任务 |

## CI 接入状态（诚实说明）

- `keel-gates` job（`ci.yml`）：源码级检查，**无需 dist**，每次 push/PR 跑；
- `build` job 后置 3 项：需要 dist ⇒ 必须排在 `pnpm run build` 之后（不在无构建环境跑）；
- `keel.yml`：基座自身（`keel-lint` + 钩子本体），零依赖 bash 直跑；
- 定时兜底：`scripts/nightly-gates.sh`（慢档全量；发布前手动 `gate --tier slow`）。

## 一条规则的准入标准

1. 能被脚本判死——靠人记的不算；
2. 误报可接受，且有显式豁免方式（棘轮白名单必须登记原因）；
3. 级别定了别轻易改——告警降级比告警漏报更容易让人无视全部告警。