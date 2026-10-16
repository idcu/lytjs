---
scope: meta
status: active
last-verified: 2026-10-17
keywords: [平行实现, 同名 API, 转发, defineAsyncComponent, core-vnode 陈旧分支, 收敛]
type: decision
created: 2026-10-17
superseded-by:
---

# 0011 同名公开 API 只允许一份权威实现（其余入口只转发）

## 背景

`defineAsyncComponent` 在仓里有 **3 份平行实现**（`grep` 实测，非测试/dist）：

| 文件 | 规模 | 独有能力 |
|---|---|---|
| `component/src/async-component.ts` | 442 行 | preload 系列（`preloadComponent(s)` / `isComponentPreloaded` / `clearPreloadCache`） |
| `core/src/define-component.ts` | 205 行 | retry / `onError(err, retry, fail, attempts)` |
| `core-vnode/src/define-component.ts` | 194 行 | 同上（**core 的陈旧分支**） |

「修复只落一份」已**实测发生两次**：
① 2026-10-16 修 `delay` 语义只落在 component 版（core 版本无此 bug，但 `showLoading` 另有缺陷）；
② 同日修 core 版的 `showLoading`（普通变量 ⇒ loading 永不出现），**core-vnode 版至今未修** ——
`diff` 实测 core-vnode 版仍是 `let showLoading`，且缺 core 版后来的 loader 返回值校验、
`Promise.resolve(loader())` 与 retry 耗尽的 `Promise.reject`。即 core-vnode 是 core 的**陈旧 fork**。

同时 `@lytjs/core` **漏转** preload 系列（`core/src/index.ts` 无此导出）⇒ 主入口用户拿不到。

## 决定

1. **一个公开名字只有一份权威实现**。`defineAsyncComponent` 的权威实现在 **`@lytjs/component`**
   （`src/async-component.ts`）；`@lytjs/core` 与 `@lytjs/core-vnode` **只转发**
   （`export { … } from '@lytjs/component'`），**不得保留副本**；类型同样只转发。
2. 为不丢能力，把 core 版独有者**下沉到权威实现**：`onError(error, retry, fail, attempts)` +
   `attempts` 计数 + `retry()` 重试（上限 3）+ loader 返回值校验。
3. 各入口**转发同一套 surface**（`defineAsyncComponent` + 4 个 preload 工具）⇒ 顺带修 core 漏转。
4. 守卫必须**结构化**：断言 `core.defineAsyncComponent === component.defineAsyncComponent`
   （**函数同一性**）——副本一旦重现即变红，不再依赖人肉 diff。

## 被否掉的选项

- **保留副本、只加「记得两边都改」的纪律**：已被证伪两次（见背景）；
- **以 `core` 版为权威**：它没有 preload 生态，且其「等 `onError` 决定、30s 兜底」会让
  「传了 `onError` 却忘了调 `fail()`」的调用方白等 30s 才看到错误组件；
- **三份都留、只统一错误消息前缀**：治不了根。

## 语义口径（合一时必须保住的行为）

失败路径统一为「`onError` 拥有**决定权**，但**未决定即同步兜底**」：

- `onError(error, retry, fail, attempts)`：`attempts` = 已失败次数（首次为 1）；
- 调 `retry()`：`attempts < MAX_ATTEMPTS(3)` 时清错误态、重新加载；否则维持错误态；
- 调 `fail()`：明确放弃重试（维持错误态）；
- **两者都未调** ⇒ **回调返回后立即按 `fail()` 处理**。这样 `fail()` 不是装饰性参数，且
  「只声明 `(error)` 的旧用法」（component 版原有语义）**零回归**；
- **不保留** core 的「30s 等决策定时器」：它会让漏调 `fail()` 的调用方白等 30s 才看到错误组件。
  代价：**不支持异步决定**（文档示例本就是同步的）。

## 代价 / 风险

- `@lytjs/core` 的 `onError` 由「决定权在回调」改为「通知 + 重试入口」⇒ 仅影响
  **传了 `onError` 且依赖 30s 兜底**的用法（文档未承诺该兜底）；`retry()` / `fail()` / `attempts`
  形参**保持可用**，故文档示例 `if (attempts <= 3) retry(); else fail();` 仍成立。
- `suspensible` 选项三份实现**都从未读取**（装饰性选项）⇒ 本次保留类型、不实现，另行登记。
