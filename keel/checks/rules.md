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
| 1 | 快档门禁（单一入口：构建顺序 + 依赖 + UI slot + props + alias + 源码卫生 + 覆盖率） | `node scripts/gate.mjs --tier fast` | ❌ fail | 本地 + CI（build job 后置） |
| 2 | 契约漂移（产物 import 的绑定名须在导出面） | `node scripts/gate.mjs check-runtime-contract` | ❌ fail | CI（build job 后置）+ 发布前 |
| 3 | 文档 import 欠账（棘轮） | `node scripts/gate.mjs check-doc-imports` | ❌ fail | CI（build job 后置）+ 发布前 |
| 4 | UI slot 单节点（红门禁） | `node scripts/gate.mjs check-ui-slot-single-node` | ❌ fail | CI（keel-gates job） |
| 5 | UI props 接线（棘轮，基线 `scripts/ui-props-wiring-baseline.txt`） | `node scripts/gate.mjs check-ui-props-wiring` | ❌ fail | CI（keel-gates job） |
| 6 | 运行时循环依赖（棘轮） | `node scripts/gate.mjs check-circular:src` | ❌ fail | CI（keel-gates job）+ 定时 |
| 7 | 构建顺序一致性 | `corepack pnpm@11.3.0 check-build-order` | ❌ fail | CI（build-order job） |
| 8 | vitest alias 目标存在（防用例静默少跑） | `node scripts/gate.mjs check-vitest-alias-dist` | ❌ fail | CI（build job 后置） |
| 9 | 慢档全量（发布前） | `node scripts/gate.mjs --tier slow` | ❌ fail | 发布前 / 定时任务 |
| 10 | 源码卫生（`eval(` / `new Function(` / `console.log(` 三条规则 + 显式清单） | `node scripts/gate.mjs check-src-hygiene` | ❌ fail | 本地 fast gate 已含 + CI |
| 11 | 治理接线（keel CI 三关卡齐全） | `node scripts/gate.mjs check-keel-wiring` | ❌ fail | 本地 fast gate 已含 + CI |
| 12 | Golden 20 × 七类行为契约（B04 六类 + B05 a11y；报告模式允许红） | `node scripts/check-ui-contracts.mjs` | ❌ fail（登记/源码漂移；`--strict` 时红项也 fail） | 本地（fast）+ 逐组件修复验收 |
| 13 | UI 全量 i18n（双语键一致 + 全量扫描硬编码棘轮） | `node scripts/check-ui-i18n.ts` | ❌ fail（新增硬编码 / 键或占位不一致） | 本地（fast）+ CI |

## 级别变更记录

- **2026-10-10｜新增 #10 源码卫生（`check-src-hygiene.ts`）**
  `compiler/src/optimizations/index.ts` 曾用 `eval()` 做伪优化（P2-3）。现扫描 `src/**/*.ts`，
  三条规则各配显式清单（须写理由），未清单化即 exit 1。

- **2026-10-10｜#5 UI props 接线：⚠️ warn → ❌ fail（收紧）**
  升级前该脚本**恒 exit 0**（只是打印报告），既不拦新增也无豁免。现按棘轮改造：
  既有欠账进 `scripts/ui-props-wiring-baseline.txt`，门禁**只拦新增**；升级当口欠账为 0。
  本次是**收紧**（告警降级才会让人无视全部告警）。

- **2026-10-11｜新增 #11 治理接线（`check-keel-wiring.ts`）**
  此前 `test-lint.sh` 只在 `install.sh` 跑、CI 无 ⇒ 改 `keel-lint.sh` 可静默腐烂。
  修法：接进 `keel.yml` 并断言接线在；实测移除 test-lint ⇒ exit 1。

- **2026-11-06｜新增 #12 Golden 20 六类契约（B04），#13 i18n（B05）**
  `check-ui-contracts.mjs` 对 20 组件 × 6 类逐格从源码推导，再与 `scripts/ui-contracts.json` 比对；
  初始 15 红全部登记原因（无 skip），`--strict` 用于逐组件验收。
  **B05 扩到七类 140 格**（新增 a11y：alt/role/aria-*/焦点管理/tab 顺序/aria-expanded 动态）；
  初始 a11y 18 pass / 1 红（Avatar）/ 1 N/A，修复后 19/0/1。
  `check-ui-i18n.ts` 扫描 CJK 字面量与 `aria-label`/`alt` 行内字面量，棘轮
  `scripts/ui-i18n-baseline.txt`（27 → 0）；两套 locale 键与 `{param}` 占位必须一致。

## CI 接入状态（诚实说明）

- `keel-gates` job（`ci.yml`）：源码级检查，**无需 dist**，每次 push/PR 跑；
- `build` job 后置 3 项：需要 dist ⇒ 必须排在 `pnpm run build` 之后（不在无构建环境跑）；
- `keel.yml`：基座自身（`keel-lint` + 钩子本体），零依赖 bash 直跑；
- 定时兜底：`scripts/nightly-gates.sh`（慢档全量；发布前手动 `gate --tier slow`）。

## 一条规则的准入标准

1. 能被脚本判死——靠人记的不算；
2. 误报可接受，且有显式豁免方式（棘轮白名单必须登记原因）；
3. 级别定了别轻易改——告警降级比告警漏报更容易让人无视全部告警。