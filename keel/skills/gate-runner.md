---
scope: build
status: active
last-verified: 2026-10-05
trigger: 跑门禁 / 分档 / 挂定时任务
keywords: [门禁, gate.mjs, 快档, 慢档, nightly]
---

# 门禁运行器：一张清单，两种档位

## 用法（单一真相源 `scripts/gate.mjs`）

```sh
corepack pnpm@11.3.0 gate:list          # 有哪些门禁、哪一档、实测耗时
corepack pnpm@11.3.0 gate --tier fast   # 快档：秒级，日常
corepack pnpm@11.3.0 gate --tier slow   # 慢档：分钟级，发布前 / 定时
corepack pnpm@11.3.0 gate build format:check   # 按名字跑
corepack pnpm@11.3.0 gate --tier slow --dry    # 只打印命令
```

## 要点

- 快档 = 只读源码（结论随改动变化）；慢档 = 全仓级 / 需要 dist（发布前与定时任务）；
- `scripts/verify-baseline.sh` 委托它 ⇒ **只有一份清单**；
- 沙箱里 `build` / `test:coverage` 跑不了时用逐包替代（坑 `sandbox-safe-delete-block`）；
- 抽出的慢门禁不能消失：必须有独立入口可挂定时任务（`scripts/nightly-gates.sh`）。
