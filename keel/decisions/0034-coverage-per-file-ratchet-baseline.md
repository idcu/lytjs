---
scope: meta
status: active
last-verified: 2026-11-15
keywords: [覆盖率, 门禁, 基线, 逐文件, 棘轮, branches, 三次取min]
type: decision
created: 2026-11-15
superseded-by:
---

# ADR 0034 · 覆盖率门禁改为逐文件棘轮 + 版本控制静态基线

- 状态：**已批准**（owner 2026-11-15 以设计约束下达，不是建议）。
- 决策：
  1. **禁止「生成即校验」**：档内不得生成被判对象。基线 `scripts/coverage-baseline.json`
     受版本控制，只能由 `coverage-baseline.mjs --update` 写入（打印逐文件 diff + 人工 yes）。
  2. **逐文件棘轮，不用字节哈希**：逐文件与全局 statements/functions/lines 的
     `covered` ≥ 基线 `covered` − max(0, 基线 total − 现场 total)；未插桩集合不得新增。
  3. **基线取三次 `test:coverage` 的逐文件最小值**，不设任何容差。
  4. **`branches` 不参与判据**，只作信息项存进基线。
  5. slow 档删除 `coverage:snapshot`，只留 `test:coverage` → `check-coverage-baseline`。
  6. **门禁不得依赖 out-of-band 产物**：被判对象必须能由版本控制 + `pnpm install` 复现；
     gitignored 手工链接、写死绝对路径一律不认（坑 `gate-depends-on-manual-env`）。

## 问题：旧门禁在拿产物跟自己比

旧流程：`test:coverage` 生成 `coverage-final.json` → `coverage:snapshot` 把**刚生成的**产物的
sha256 + HEAD 写进快照 → `check-coverage-snapshot` 校验二者。
三个输入同源，判据恒真：删测试、把源文件挤出范围都仍绿；「严格感」只约束流程顺序。

## 判据修正（2026-11-15）：允许删码，不允许削弱覆盖

下限 = 基线 covered − max(0, 基线 total − 现场 total)。语义是防「覆盖被削弱」，
**不是**「绝对数只能涨」：删死代码 ⇒ total 与 covered 同步降 ⇒ 通过（正例 `cli/run.ts`
104/104 → 91/91，基线已更新）；删测试 / 已覆盖语句失去覆盖 ⇒ total 不变、covered 降 ⇒ 红；
新增未覆盖代码 ⇒ allowance 0、covered 持平 ⇒ 通过，但比例下降必须在输出里显式打印。
**禁止**比例判据：那会让新增未覆盖代码永远合法。

## 为什么字节哈希不成立

同码树四次跑 `coverage-final.json` 的 sha256 全不同（`b92674f8…`/`a4b9ec19…`/`983c8237…`/`31be9a78…`）。
根因是 v8→istanbul 分支映射非确定：`branchMap` 行号移位、`branches` 分母逐次 +5/+5、部分文件命中 ±1~3。
字节哈希把噪声当回归（假红），又因自比对抓不到真回归。

## 为什么用下界（三次取 min）

容差会掩盖真实下降：设 1 就看不到一条语句的下降。改为 `--update` 连跑三次，逐文件取
`covered` 最小值：单次向上抖动不假红，真实下降必然低于下界 ⇒ 红。

三跑逐文件取 min：statements 54919/61975、functions 3885/4335、lines 54919/61975 三次一致；
branches 只在 16596~16600/18847~18851 间抖（不参与判据）。

逐文件抖动（存 `jitter`）：statements/lines 各 **1 个**（`Drawer.ts` 202→203→202，
min 不低于旧基线）、branches **26 个**。故三项下界即真实值，真实下降必被抓住。

边界：`Drawer.ts` 本轮再现 ±1 抖动（已如实报告）；再抖就停下报告，**禁止加容差**。

代价：基线是下界，提升不自动入账，须显式 `--update`，否则棘轮失效。

## 判据实现

- `coverage-count.mjs`：计数单一实现，生成与校验共用。statements=`s`、functions=`f`、
  lines=`statementMap` 起始行去重、branches=`b` 逐元素累加。
- `coverage-baseline.mjs --update`：三跑取逐文件 min（total 取 max），打印全局/逐文件下降/新增覆盖/文件增删/未插桩变化/三跑总数/抖动，`yes` 才落盘；`packages/` 有未提交改动即拒绝。
- `check-coverage-baseline.mjs`：只读现场产物与静态基线；产物早于最新源码即红。
- slow：`test:coverage` → `check-coverage-baseline`，档内无生成项。

## 负控

1. 删 `type-utils.test.ts` 的 `createObjectTypeGuard` 用例 ⇒ 48→41 ⇒ 红；恢复回绿。
2. 加进 `coverage.exclude` ⇒ 未插桩 7→8 ⇒ 红；恢复回绿。
3. 删已覆盖死代码（`cli/run.ts` 104→91）⇒ 绿（allowance=13）；2026-11-15 按 owner 裁决 `--update`，
   地板移至 91/175 —— 不是放宽门槛，是挪到真实位置；此后新增未覆盖函数仍绿并打印比例下降。
4. 套件崩掉：缺产物 ⇒ 红；强制出产物则 44 个 ui 文件 covered 降（`Alert` 96→18）⇒ 红。

不做：档内重生基线、回退字节哈希、设容差、branches 入判据。
