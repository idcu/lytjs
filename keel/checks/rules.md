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
| 1 | 快档门禁（构建顺序 + UI slot + props + alias + 源码卫生） | `corepack pnpm@11.3.0 check:fast` | ❌ fail | 本地（含需 dist 的 alias 检查） |
| 2 | 契约漂移（产物 import 的绑定名须在导出面） | `corepack pnpm@11.3.0 check-runtime-contract` | ❌ fail | CI（build job 后置）+ 发布前 |
| 3 | 文档 import 欠账（棘轮） | `corepack pnpm@11.3.0 check-doc-imports` | ❌ fail | CI（build job 后置）+ 发布前 |
| 4 | UI slot 单节点（红门禁） | `corepack pnpm@11.3.0 check-ui-slot-single-node` | ❌ fail | CI（keel-gates job） |
| 5 | UI props 接线（棘轮，基线 `scripts/ui-props-wiring-baseline.txt`） | `corepack pnpm@11.3.0 check-ui-props-wiring` | ❌ fail | CI（keel-gates job） |
| 6 | 运行时循环依赖（棘轮） | `corepack pnpm@11.3.0 check-circular:src` | ❌ fail | CI（keel-gates job）+ 定时 |
| 7 | 构建顺序一致性 | `corepack pnpm@11.3.0 check-build-order` | ❌ fail | CI（build-order job） |
| 8 | vitest alias 目标存在（防用例静默少跑） | `corepack pnpm@11.3.0 check-vitest-alias-dist` | ❌ fail | CI（build job 后置） |
| 9 | 慢档全量（发布前） | `corepack pnpm@11.3.0 gate --tier slow` | ❌ fail | 发布前 / 定时任务 |
| 10 | 源码卫生（`eval(` / `new Function(` / `console.log(` 三条规则 + 显式清单） | `corepack pnpm@11.3.0 check-src-hygiene` | ❌ fail | 本地（`check:fast` 已含）+ CI |
| 11 | 治理接线（keel CI 三关卡齐全） | `corepack pnpm@11.3.0 check-keel-wiring` | ❌ fail | 本地（`check:fast` 已含）+ CI |

## 级别变更记录

- **2026-10-10｜新增 #10 源码卫生（`check-src-hygiene.ts`）**
  背景：`compiler/src/optimizations/index.ts` 用 `eval()` 做**伪优化**（P2-3）—— 四个"优化开关"无一成立，
  且 `stats.reduction` 的唯一非 0 来源是**误伤用户代码**（`x1 + 2` → `x3`、`"1+2"` → `"3"`）。
  修完缺陷后把判据**机械化**：扫描全部 `src/**/*.ts`（实测 825 个文件），三条规则各配**显式清单**
  （每条必须写明理由），未清单化即 exit 1。
  实测：`eval(` 清单 1 项、`new Function(` 3 项、`console.log(` 8 项；注入缺陷后报 3 处（A/B/C 各一）。
  说明：清单是**故意保留**的豁免面（CLI 生成模板、`__DEV__` 门控、HMR/DevTools 输出等），
  属「误报可接受 + 显式豁免」的第 2 条准入标准。

- **2026-10-10｜#5 UI props 接线：⚠️ warn → ❌ fail（收紧）**
  升级前该脚本**恒 exit 0** —— 它只是一份打印报告，既拦不住新增欠账、也没有任何豁免方式，
  连下面「准入标准」第 2 条都不满足。现按与 `check-circular.ts` 相同的**棘轮**模式改造：
  既有欠账进 `scripts/ui-props-wiring-baseline.txt`，门禁**只拦新增**。
  升级当口实测欠账为 **0**，故基线初始为空、门禁从一开始就是严格的。
  注：本文件「级别定了别轻易改」针对的是**降级**（告警降级会让人无视全部告警）；
  本次是**收紧**，且先决条件是欠账已归零。

- **2026-10-11｜新增 #11 治理接线（`check-keel-wiring.ts`）**
  背景：`test-lint.sh`（判据自测）此前只在 `install.sh` 跑一次、CI 里没有 ⇒ 改 `keel-lint.sh` 判据可静默腐烂。
  修法：① 接进 `keel.yml`；② 本守卫断言该接线在（防被静默删）。实测：移除 test-lint 步骤 ⇒ exit 1。

## CI 接入状态（诚实说明）

- `keel-gates` job（`ci.yml`）：源码级检查，**无需 dist**，每次 push/PR 跑；
- `build` job 后置 3 项：需要 dist ⇒ 必须排在 `pnpm run build` 之后（不在无构建环境跑）；
- `keel.yml`：基座自身（`keel-lint` + 钩子本体），零依赖 bash 直跑；
- 定时兜底：`scripts/nightly-gates.sh`（慢档全量；发布前手动 `gate --tier slow`）。

## 一条规则的准入标准

1. 能被脚本判死——靠人记的不算；
2. 误报可接受，且有显式豁免方式（棘轮白名单必须登记原因）；
3. 级别定了别轻易改——告警降级比告警漏报更容易让人无视全部告警。