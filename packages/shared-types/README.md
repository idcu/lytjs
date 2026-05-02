# @lytjs/shared-types

> Lyt.js 跨包共享类型定义

## 概述

`@lytjs/shared-types` 是 Lyt.js 框架的核心类型定义包，提供所有子包之间共享的 TypeScript 类型和接口。本包**零运行时依赖**，仅包含类型导出。

## 导出类型

### 响应式 (`ref.ts`)

| 类型         | 说明             |
| ------------ | ---------------- |
| `RefLike<T>` | Ref 值的通用接口 |

### 应用上下文 (`app-context.ts`)

| 类型             | 说明           |
| ---------------- | -------------- |
| `BaseAppConfig`  | 应用配置基类   |
| `BaseAppContext` | 应用上下文基类 |

### VNode (`vnode.ts`)

| 类型    | 说明            |
| ------- | --------------- |
| `Props` | 组件 Props 类型 |

### 调试 (`debug.ts`)

| 类型                | 说明                      |
| ------------------- | ------------------------- |
| `ReactiveEffectRef` | ReactiveEffect 的脱敏引用 |
| `DebuggerEvent`     | 调试事件（track/trigger） |

### 渲染器 (`renderer.ts`)

| 类型                  | 说明         |
| --------------------- | ------------ |
| `Renderer<VNode>`     | 渲染器接口   |
| `Directive<T, VNode>` | 指令接口     |
| `DirectiveBinding`    | 指令绑定信息 |
| `DirectiveArguments`  | 指令参数类型 |

### 组件 (`component.ts`)

| 类型                      | 说明             |
| ------------------------- | ---------------- |
| `SlotFunction`            | 插槽函数类型     |
| `InternalSlots`           | 内部插槽类型     |
| `ComponentPublicInstance` | 组件公共实例接口 |

### 全局声明 (`global.d.ts`)

| 声明      | 说明                         |
| --------- | ---------------------------- |
| `__DEV__` | 开发模式标志，由构建工具注入 |

## 设计原则

1. **零运行时**：本包仅导出类型，不包含任何运行时代码
2. **单一职责**：仅作为类型共享的中介层，避免包之间的循环依赖
3. **集中声明**：全局类型（如 `__DEV__`）在此包中统一声明，各子包通过 `/// <reference>` 引用

## 依赖关系

```
@lytjs/shared-types
  └── (无运行时依赖)
```

所有其他 `@lytjs/*` 包均可依赖本包的类型定义。
