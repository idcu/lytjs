---
scope: now
status: active
last-verified: 2026-10-05
updated: 2026-10-05
keywords: [焦点, 交接, keel试点, 记忆迁移]
---

# NOW · main

## 当前焦点

keel 试点接入收尾。Phase 1–4 完成 + 跟进项清空（husky v9 迁移、扩展检查进 CI、例外解除）。
下一步 = 演练一轮完整 keel 循环 + 等 keel v3.4.7 发布后核对 `--ref` 可取。

## 本轮完成

- [x] keel v3.4.6 装入；锚点 / INDEX / CONSTITUTION / NOW 填毕（lint 归零）
- [x] 记忆蒸馏：`.workbuddy/MEMORY.md` → 16 条坑（core/build/verify/process）+ 4 决策 + 4 技能
- [x] husky 链式闭环（ADR 0017）：`.husky/{pre-commit,commit-msg}` 调用 keel 本体；verify-hooks 判"链式成立"
- [x] 上游回植 5 修复 + 2 ADR（0016 判据收窄 / 0017 链式挂载）；keel 全量自测 43/43
- [x] `.prettierignore` 排除 `keel/`（排版与预算由 lint 管，禁止 prettier 重排）
- [x] `.github/workflows/keel.yml`：基座自身 lint + 钩子本体（零依赖，bash 直跑）
- [x] keel 工具副本与上游逐字同步（install.sh / test-lint.py；含 ADR 0016 用例）
- [x] husky v9 迁移：去掉弃用两行（`.husky/pre-commit` 的 shebang + `_/husky.sh`）
- [x] 扩展检查接入 CI：源码级 3 项 → `ci.yml` 的 `keel-gates` job；需 dist 的 3 项 → `build` job 后置
- [x] **macOS awk 补丁例外解除**（工具已与上游逐字一致）

## 下一步

1. **演练**：新会话按 INDEX → NOW → 按需检索跑一轮（本轮抽测：「循环依赖」12.3KB ✅、
   「提交」10.3KB ✅；宽泛词「门禁」22.9KB 超限 ⇒ 检索先收窄关键词再开读）
2. keel **v3.4.7** 发布后核对 `install.sh --ref v3.4.7` 可取（本仓工具已一致）
3. `.workbuddy` 归档说明补全；确认无任何路径再写它

## 阻塞

| 卡在 | 解锁条件 | 绕行 |
|---|---|---|
| 钩子本地生效依赖各人挂载 | 各 clone 跑一次 install-hooks | `.husky` 已版本化；链式判定不依赖本地配置 |

## 例外表（临时补丁）

| 例外 | 位置 | 原因 | 移除条件 |
|---|---|---|---|
| （无） | —— | 2026-10-05 macOS awk 补丁已与上游逐字一致，例外解除 | —— |