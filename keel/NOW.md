---
scope: now
status: active
last-verified: 2026-10-05
updated: 2026-10-05
keywords: [焦点, 交接, keel试点, 记忆迁移]
---

# NOW · main

## 当前焦点

keel 试点接入收尾。Phase 1–4 完成：入口 / 记忆蒸馏 / husky 链式闭环 / 基座自身进 CI。
下一步 = 演练一次完整 keel 循环，并把「扩展检查接 CI」立为独立评审项。

## 本轮完成

- [x] keel v3.4.6 装入；锚点 / INDEX / CONSTITUTION / NOW 填毕（lint 归零）
- [x] 记忆蒸馏：`.workbuddy/MEMORY.md` → 16 条坑（core/build/verify/process）+ 4 决策 + 4 技能
- [x] husky 链式闭环（ADR 0017）：`.husky/{pre-commit,commit-msg}` 调用 keel 本体；verify-hooks 判"链式成立"
- [x] 上游回植 3 修复 + 2 ADR（0016 判据收窄 / 0017 链式挂载）；keel 全量自测 42/42
- [x] `.prettierignore` 排除 `keel/`（排版与预算由 lint 管，禁止 prettier 重排）
- [x] `.github/workflows/keel.yml`：基座自身 lint + 钩子本体（零依赖，bash 直跑）
- [x] keel 工具副本与上游逐字同步（install.sh / test-lint.py；含 ADR 0016 用例）

## 下一步

1. **演练**：新会话按 INDEX → NOW → 按需检索跑一轮，验证 ≤15,000B 预算与写回闭环
2. **扩展检查接 CI**（独立评审）：需先验证 2/3/6 在"无 dist"环境的判定，再决定 job 形态
3. `.workbuddy` 归档说明补全；确认无任何路径再写它

## 阻塞

| 卡在 | 解锁条件 | 绕行 |
|---|---|---|
| 扩展检查未进 CI | 先验证缺构建判定（评审项） | 发布前 + 定时 `gate --tier slow` |
| 钩子本地生效依赖各人挂载 | 各 clone 跑一次 install-hooks | `.husky` 已版本化；链式判定不依赖本地配置 |

## 例外表（临时补丁）

| 例外 | 位置 | 原因 | 移除条件 |
|---|---|---|---|
| macOS awk 兼容 ×2 | `keel/checks/keel-lint.sh` | 上游已修复、尚未发版 | keel 发版后覆盖为上游文件 |