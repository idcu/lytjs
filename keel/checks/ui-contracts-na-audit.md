---
scope: meta
status: active
last-verified: 2026-11-09
keywords: [ui-contracts, N/A, V5, V6, changeset, Golden-20]
---

# UI 契约 34 格 N/A 复核（S30 · V5/V6）

**位置理由**：本仓无 `evaluation/` 目录；该清单审的是门禁
`scripts/check-ui-contracts.mjs` 的登记真源 `scripts/ui-contracts.json`，
其规则与验收位在 `keel/checks/rules.md` ⇒ 放 `keel/checks/` 与门禁同域，便于后续复核。

## V5 分类统计（34 格）

| 结论 | 数量 | 处置 |
|---|---|---|
| 真 N/A | 33 | 保留 n/a 及原 reason |
| 漏测 | 1 | Container/a11y：补实现 + 用例 + 登记改 pass |
| 误标 | 0 | — |

漏测补测：新增 `packages/ecosystem/packages/ui/tests/e2e-container.test.ts`
（3 用例；其中「id/ariaLabel/ariaDescribedBy 透传」为判死判据）。
红→绿证据：补测时 `expected null to be '主内容区'`（1 failed / 2 passed）；
修 Container 后 3/3 绿；负控将 `aria-label` 写死空串再跑 ⇒ 同一断言复红，已还原。
门禁复核：`node scripts/check-ui-contracts.mjs` ⇒ 140 格 pass=107 / red=0 / n/a=33。

## 逐格结论

| # | 格 | 结论 | 证据（组件实现 / props 定义 / 既有测试） |
|---|---|---|---|
| 1 | Avatar/vmodel | 真 | props 仅 size/shape/icon/src/srcSet/alt/fit/id/aria/onError（Avatar.ts:16-33） |
| 2 | Badge/vmodel | 真 | props 仅 count/maxCount/dot/showZero/type/offset（Badge.ts:15-27） |
| 3 | Button/vmodel | 真 | props 仅状态与样式，无值类（Button.ts:16-32） |
| 4 | Card/vmodel | 真 | props 仅 header/bodyStyle/shadow（Card.ts:16-28） |
| 5 | Container/vmodel | 真 | props 仅 fluid/class/style/id/aria（Container.ts:20-26） |
| 6 | Divider/vmodel | 真 | props 仅 type/contentPosition（Divider.ts:10-18） |
| 7 | Empty/vmodel | 真 | props 仅 description/image/imageSize（Empty.ts:11-21） |
| 8 | Icon/vmodel | 真 | props 仅 name/size/color/spin（Icon.ts:16-26） |
| 9 | Link/vmodel | 真 | props 仅 href/target/type/disabled/underline（Link.ts:19-31） |
| 10 | Progress/vmodel | 真 | percentage 为只读入参，无 `emit('update:percentage')`（Progress.ts:16-42） |
| 11 | Spin/vmodel | 真 | spinning 单向控制，无 update 事件（Spin.ts:16-26） |
| 12 | Tag/vmodel | 真 | props 无值类；visible 仅内部 reactive（Tag.ts:20-37） |
| 13 | InputNumber/slots | 真 | `InputNumberSlots = Record<string, never>`，源码无 slots 读取（types.ts:1185-1187） |
| 14 | Pagination/slots | 真 | 无 Slots 接口；setup 只取 emit，自含 UI（Pagination.ts:51-54） |
| 15 | Progress/slots | 真 | `ProgressSlots = Record<string, never>`，setup 不取 slots（types.ts:1891-1892） |
| 16 | Badge/events | 真 | props 无 onX，setup 不 emit（Badge.ts:15-27） |
| 17 | Card/events | 真 | props 无 onX，setup 不 emit（Card.ts:16-28） |
| 18 | Container/events | 真 | props 无 onX，setup 不 emit（Container.ts:20-26） |
| 19 | Divider/events | 真 | props 无 onX，setup 不 emit（Divider.ts:10-18） |
| 20 | Empty/events | 真 | props 无 onX，setup 不 emit（Empty.ts:11-21） |
| 21 | Icon/events | 真 | props 无 onX，setup 不 emit（Icon.ts:16-26） |
| 22 | Progress/events | 真 | props 无 onX，setup 不 emit（Progress.ts:16-42） |
| 23 | Spin/events | 真 | props 无 onX，setup 不 emit（Spin.ts:16-26） |
| 24 | Tag/controlled | 真 | 关闭态是内部 reactive visible，无受控 prop（Tag.ts:35-44） |
| 25 | Avatar/keyboard | 真 | 仅 img onError，无 onClick/onKeyDown（Avatar.ts:100-116） |
| 26 | Badge/keyboard | 真 | 渲染树无交互节点（Badge.ts:53-93） |
| 27 | Card/keyboard | 真 | 渲染树无交互节点（Card.ts:53-114） |
| 28 | Container/keyboard | 真 | 渲染树无交互节点（Container.ts:52-74） |
| 29 | Divider/keyboard | 真 | 渲染树无交互节点（Divider.ts:48-71） |
| 30 | Empty/keyboard | 真 | 渲染树无交互节点（Empty.ts:43-145） |
| 31 | Icon/keyboard | 真 | 无 onClick prop/节点（Icon.ts:54-76） |
| 32 | Progress/keyboard | 真 | 只读进度展示，无交互节点（Progress.ts:42-249） |
| 33 | Spin/keyboard | 真 | 只读加载展示，无交互节点（Spin.ts:76-137） |
| 34 | Container/a11y | **漏** | types 声明 id/ariaLabel/ariaDescribedBy，运行时却未声明/未透传 ⇒ 补测 + 修实现 |

## V6 changeset 验证

- 命令：`pnpm exec changeset status`（本地 dry-run，无需网络/凭据）。
- 退出码：**0**（非 BLOCKED）。
- 实际输出：patch 2 个（`lytjs-npm`、`@lytjs/playground`）；minor 0；major 76 个
  （`@lytjs/ui`、`@lytjs/core` 等 `.changeset/v7-core-hardening.md` 所列包）；
  合计 78 个待 bump 包，末尾无 error。
