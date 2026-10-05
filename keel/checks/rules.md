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
| 1 | 快档门禁（构建顺序 + UI slot + props 接线 + alias） | `corepack pnpm@11.3.0 check:fast` | ❌ fail | 本地日常 + 定时 |
| 2 | 契约漂移（产物 import 的绑定名须在导出面） | `corepack pnpm@11.3.0 check-runtime-contract` | ❌ fail | 发布前 + 定时（需 dist） |
| 3 | 文档 import 欠账（棘轮） | `corepack pnpm@11.3.0 check-doc-imports` | ❌ fail | 发布前 + 定时（需 dist） |
| 4 | UI slot 单节点（红门禁） | `corepack pnpm@11.3.0 check-ui-slot-single-node` | ❌ fail | 本地快档已含 |
| 5 | UI props 接线（报告型棘轮） | `corepack pnpm@11.3.0 check-ui-props-wiring` | ⚠️ warn | 本地快档已含 |
| 6 | 运行时循环依赖（棘轮） | `corepack pnpm@11.3.0 check-circular:src` | ❌ fail | 发布前 + 定时 |
| 7 | 构建顺序一致性 | `corepack pnpm@11.3.0 check-build-order` | ❌ fail | CI（`ci.yml` build-order job）+ 本地 |
| 8 | vitest alias 目标存在 | `corepack pnpm@11.3.0 check-vitest-alias-dist` | ❌ fail | 本地快档已含 |
| 9 | 慢档全量（发布前） | `corepack pnpm@11.3.0 gate --tier slow` | ❌ fail | 发布前 / 定时任务 |

## CI 接入状态（诚实说明）

- 已接入：`ci.yml`（build-order / lint / type-check / test / size-check 等）+ `keel.yml`（本基座自身）；
- **未接入**：上表 2 / 3 / 6 需要 dist 或全量构建，直接在 CI 跑成本高且「缺构建」判定未验证 ⇒
  先走**发布前 + 定时任务**（`scripts/nightly-gates.sh`），接入 CI 属独立评审项（见 NOW 下一步）。

## 一条规则的准入标准

1. 能被脚本判死——靠人记的不算；
2. 误报可接受，且有显式豁免方式（棘轮白名单必须登记原因）；
3. 级别定了别轻易改——告警降级比告警漏报更容易让人无视全部告警。