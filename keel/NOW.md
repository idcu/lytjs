---
scope: now
status: active
last-verified: 2026-10-09
updated: 2026-10-09
keywords: [焦点, 覆盖率, 分批, 缺陷登记, ADR0005落地]
---

# NOW · main

## 当前焦点

覆盖率分批深挖（第一批完成 +1.00pp）+ ADR 0005 落地。权威基线 15 项全绿在案。

## 本轮完成

- [x] **主战场修正**：量化证明此前「compiler codegen 主战场」判断**错误**——缺口极分散
      （Top10 文件仅占 15.4%），真实大头是 devtools/UI/tools **整模块零覆盖**
      （performance.ts 429 / signalsInspector 421 / Select 380 / transition 374…）
- [x] 覆盖率电池第一批：batch.ts 0→279/294 · data-fetching.ts 0→286/296
      ⇒ stmts 56.77→**57.77%** · branches 85.09% · 6032/6032 绿
- [x] ADR 0005 落地（lytx）：90 处声明 ^6.9.6 + 文档口径 + 补 workspace `packages:`
      + 全新安装实测 + `pnpm -r build` 11 包全绿（`4a7e268`/`2ce9734` 已推送）
- [x] 缺陷登记 ×2（按真实行为断言，修复走单独决策）：
      ① VaporListRenderer.updateItem 死代码（diffLists 未传 compareFn）
      ② serializeData Date 分支死代码（toJSON 先于 replacer）
- [x] 上游缺陷上报材料：`@lytjs/middleware@6.9.6` npm 产物缺 `dist/index.mjs`
      （声明入口与产物不符 ⇒ vite 运行时解析失败，tsc 正常）

## 下一步（覆盖率分批计划，85% 需 +15.9k 语句）

1. 第二批：整模块零覆盖的纯逻辑件——`staticAnalysis.ts`(277) / `incremental-compile.ts`(264)
2. 第三批：devtools 面板（time-travel 373 / performance 351 / state-editor 275）
3. 第四批起：UI 组件按交互断言逐个补（Select 380 / ColorPicker 371 / DatePicker 360…60+）
4. 每批 ≥1pp 并实测；发现「已导出、无行为」类缺陷一律登记不顺手修

## 阻塞

| 卡在 | 解锁条件 | 绕行 |
|---|---|---|
| 85% 是数周工程（缺口分散、24.4k 语句） | 按批推进 | 棘轮只上调，每批留实测数字 |
| lytx 上游 middleware 产物缺 .mjs | 上游修复发版 | lytx-api 测试暂被阻塞（构建/DTS 正常） |
| 遵守率无长期基线 | 提交累积数周 | 先看趋势不看单点 |
