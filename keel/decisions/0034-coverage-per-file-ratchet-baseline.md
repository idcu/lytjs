---
scope: meta
status: active
last-verified: 2026-11-15
keywords: [覆盖率, 门禁, 自比对, 基线, 逐文件, 棘轮, branches, 三次取min]
type: decision
created: 2026-11-15
superseded-by:
---

# ADR 0034 · 覆盖率门禁改为逐文件棘轮 + 版本控制静态基线

- 状态：**已批准**（owner 2026-11-15 以设计约束下达，不是建议）。
- 决策：
  1. **禁止「生成即校验」**：档内不得生成被判对象。基线 `scripts/coverage-baseline.json`
     受版本控制，只能由 `coverage-baseline.mjs --update` 写入（打印逐文件 diff + 人工 yes）。
  2. **逐文件棘轮，不用字节哈希**：逐文件 statements/functions/lines `covered` 与全局
     `covered` 不得低于基线；未插桩集合不得新增（7 条冻结清单保持）。
  3. **基线取三次 `test:coverage` 的逐文件最小值**，不设任何容差。
  4. **`branches` 不参与判据**，只作信息项存进基线。
  5. slow 档删除 `coverage:snapshot`，只留 `test:coverage` → `check-coverage-baseline`。

## 问题：旧门禁在拿产物跟自己比

旧流程三步：`test:coverage` 生成 `coverage-final.json` → `coverage:snapshot` 把**刚生成的**
产物的 sha256 + HEAD 写进 `coverage/snapshot.json` → `check-coverage-snapshot` 校验二者。
三个输入同源，判据恒真：删测试、把源文件挤出插桩范围都仍绿。sha256 / HEAD / 冻结清单的
「严格感」只约束流程顺序。

## 为什么字节哈希不成立

同码树 A/B（2026-11-15，HEAD `ce2f9967`）：

| 运行 | `coverage-final.json` sha256（截断） |
| --- | --- |
| 并行 1 | `b92674f8…` |
| 并行 2 | `a4b9ec19…` |
| 串行 1 | `983c8237…` |
| 串行 2 | `31be9a78…` |

四次全不同。根因是 v8→istanbul 的分支映射非确定：`branchMap` 行号移位、`branches` 分母
逐次变化（+5/+5）、部分文件命中 ±1~3。字节哈希会把这层噪声当回归（假红），同时因自比对
又抓不到真回归。

## 为什么用下界（三次取 min）

容差会掩盖真实下降：设 1 就永远看不到一条语句的下降。改为 `--update` 连跑三次，逐文件取
`covered` 最小值：单次向上抖动不假红，真实下降必然低于下界 ⇒ 红。

| 运行 | statements | functions | lines | branches（信息项） |
| --- | --- | --- | --- | --- |
| run1 | 54932/61988 | 3886/4336 | 54932/61988 | 16600/18851 |
| run2 | 54932/61988 | 3886/4336 | 54932/61988 | 16598/18849 |
| run3 | 54932/61988 | 3886/4336 | 54932/61988 | 16603/18854 |
| 基线 | **54932/61988** | **3886/4336** | **54932/61988** | 16598/18854（不参与） |

逐文件抖动（存 `jitter`）：statements / functions / lines 均 **0 个文件**；branches **29 个
文件**（如 `compiler/src/transform.ts` 135→134→136）。故参与判据的三项下界即真实值，一条
语句的真实下降必被抓住 —— **不触发停止条件**。

边界：历史串行 A/B 曾见 `ui/Drawer.ts` 语句 ±1；若未来别的 worker 配置再现同类抖动，
1 点下降可能被掩盖，届时按 owner 约束停下报告，**禁止加容差**。本次三跑该文件未抖动。

代价（有意）：基线是下界，覆盖率提升不会自动入账，必须显式 `--update`；否则数字自然上涨
会让棘轮失效。

## 判据实现

- `coverage-count.mjs`：计数单一实现（生成 / 校验共用）。statements=`s`、functions=`f`、
  lines=`statementMap` 起始行去重、branches=`b` 逐元素累加。
- `coverage-baseline.mjs --update`：三跑取逐文件 min（total 取 max），打印全局 / 逐文件下降 /
  新增覆盖 / 文件增删 / 未插桩变化 / 三跑总数 / 抖动，`yes` 后才落盘；`packages/` 有未提交
  改动即拒绝。
- `check-coverage-baseline.mjs`：只读现场产物与静态基线，判三条；产物早于最新源码即红。
- slow：`test:coverage` → `check-coverage-baseline`，档内无生成项。

## 负控（三态原文见就绪单 §3.2）

1. 删 `packages/shared-types/tests/type-utils.test.ts` 的 `createObjectTypeGuard` 用例
   ⇒ 该文件 48→41（functions 12→11）⇒ 逐文件棘轮红；恢复回绿。
2. 把 `packages/shared-types/src/type-utils.ts` 加进 `coverage.exclude`
   ⇒ 未插桩 7→8 ⇒ 红；恢复回绿。

不做：档内自动重生基线、回退字节哈希、为抖动设容差、把 branches 纳入判据。
