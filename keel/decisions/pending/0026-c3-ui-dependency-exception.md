---
scope: architecture
status: active
resolution: decided
last-verified: 2026-11-09
keywords: [C3, ui, L0, common-a11y, common-is, common-string, 依赖例外, check-deps]
type: decision
created: 2026-11-09
superseded-by:
---

# 0026 · C3 收口：UI 对 L0 叶子的两类依赖例外

## 背景

0021 记录了 `@lytjs/ui` 与 `ARCHITECTURE`「上层只依赖 core 与 component」的冲突。
C1/C2 已收口可收敛部分：vdom 57 处、reactivity 38 处改指 `@lytjs/core/runtime`，
`Component` 类型导入删除。实测剩余直连只有三个 L0 包：`common-a11y`（40 处 /
14 符号）、`common-is`（31 处 / 3 符号）、`common-string`（1 处 / 1 符号）。
原 27 个去重符号中，core/runtime 覆盖 8（vdom 3 + reactivity 5），19 未覆盖；
其中唯一非 L0 的 `Component` 已随 C1 删除，实际待裁为 18 个 L0 符号。

## 决定

两类依赖**分开立项**，不合成一条：

1. `@lytjs/common-a11y`：**UI-only 语义型 L0 叶子例外**。仅对 `@lytjs/ui` 生效，
   不外溢到 ecosystem 其他包。`@lytjs/common` 的聚合 re-export 不算第二消费方。
2. `@lytjs/common-is` / `@lytjs/common-string`：**通用 L0 纯函数叶子**。
   L6 聚合消费端可向下直连 L0 纯函数（无状态、无 DOM、无业务语义），
   与组件语义无关，不构成架构例外。

`check-deps` 的 `@lytjs/ui` allowlist 收敛为 `@lytjs/common-* / component / core`，
不再包含 vdom / reactivity。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 让 core/component 增补 a11y/工具 re-export | 扩大公开 API，把 UI 专属语义塞进核心 |
| UI 自实现 a11y / is / string | 第三套实现，行为和可访问性易漂移 |
| 把例外放宽为「上层可依赖任意 L0~L2」 | 掩盖反向依赖，等于取消分层判据 |

## 后果

- 好处：UI 直连面从 7 包降到 5 包；vdom/reactivity 的单例内联风险消除。
- 代价：`common-a11y` 仍是 UI 专属依赖，生态若需 a11y 必须另立来源。
- 破坏点：L0 符号改名/删除会让 UI 编译失败（`check-package-deps` 抓未声明运行时导入）；
  层级写错会被 `check-deps` 判红（负控已实测 `@lytjs/ui → @lytjs/dom` 变红）。

## 受影响范围

- 仅 `@lytjs/ui` 的 package.json 与 `scripts/check-deps.ts` allowlist；ecosystem 不受影响。
- `@lytjs/common-a11y` 跨包引用仅 UI 40 文件 + `@lytjs/common` 聚合 1 处。

## 迁移指引

- 新代码优先 `@lytjs/core/runtime`（VNode / signal / reactive / watch / computed / effect）。
- a11y 工具只允许在 UI 内使用；其他包需要时先提为通用 L0 能力或自建。
- `common-is` / `common-string` 按普通 L0 纯函数使用，不得承载组件语义。

## 复审 / 失效条件

1. `common-a11y` 出现 UI 之外的真实消费方（聚合 re-export 除外）→ UI-only 前提失效，重新裁决。
2. `common-is` / `common-string` 引入状态、DOM 或上层依赖 → 不再算 L0 叶子，重新裁决。
3. UI 迁出为独立仓 `lytjs-ui` → 该例外须在独立仓依赖策略中重新登记。
4. 8.0.0 窗口若收紧「上层仅 core/component」，本条随之复审。
