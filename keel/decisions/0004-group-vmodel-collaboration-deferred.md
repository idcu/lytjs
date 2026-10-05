---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [group, v-model, CheckboxGroup, RadioGroup, 暂缓]
type: decision
created: 2026-10-05
superseded-by:
---

# 0004 group v-model 剩余项暂缓（协作机制类）

## 背景

`RadioGroup`/`CheckboxGroup` 的 v-model 主体已可用（给子节点注入 props + 判据 4 例）。
剩余 `CheckboxGroup.min/max` 不是"接线"：需要子组件**上报选中状态**，属新增协作机制。

## 决定

暂缓。方向已定：provide/inject 注册表 + 子组件上报；实现前先补注入类判据（先红后绿）。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 在 Group 里遍历子 vnode 读状态 | 组件实例不可见，脆弱且绕过响应式 |
| 把 min/max 删掉（按"功能不存在"处置） | 该能力语义清晰、有真实需求，属未实现而非伪配置 |

## 影响

- 不新增假修复；props 清单保持现状（剩余项已登记在组件 JSDoc）。
