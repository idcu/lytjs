# @lytjs/compat

> LytJS Vue 2/3 迁移辅助（migration helpers）。

> ⚠️ **实现状态（2026-10-10 订正，P1-8）**
>
> 本包此前是**纯占位包**（源码只有 `export {}`），但 `description` 与 README 却宣称它是
> 「Vue 2/3 兼容层」，且**已按 6.9.6 发布到 npm** —— 使用者装上后 `import` 到的是空对象。
>
> 现在已补上**唯一一块能零风险做对的真实能力**：**Vue 2 → Vue 3 生命周期钩子名迁移**。
> 其余规划能力（Vuex 兼容层、响应式 API 桥接）**仍未实现**，见下方「未实现（规划中）」。

[![npm version](https://img.shields.io/npm/v/@lytjs/compat.svg)](https://www.npmjs.com/package/@lytjs/compat)
[![license](https://img.shields.io/npm/l/@lytjs/compat.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介·独立声明

`@lytjs/compat` 为从 Vue 2 / Vue 3 迁移到 LytJS 的项目提供迁移辅助工具。

本包是**纯函数库**：**零运行时依赖**，不依赖任何 `@lytjs/*` 核心包或第三方包。
按 v6.12 路线图规划，本库将迁出为独立仓库 `lytjs-compat`。

## 已实现

### 生命周期钩子名映射

Vue 2 → Vue 3 之间只有两个钩子被重命名：

| Vue 2           | Vue 3           |
| --------------- | --------------- |
| `beforeDestroy` | `beforeUnmount` |
| `destroyed`     | `unmounted`     |

其余钩子名（`beforeCreate` / `created` / `beforeMount` / `mounted` / `beforeUpdate` /
`updated` / `activated` / `deactivated` / `errorCaptured`）保持不变；Vue 3 另新增
`renderTracked` / `renderTriggered` / `serverPrefetch`。

## 安装

```bash
npm install @lytjs/compat
```

或使用 pnpm：

```bash
pnpm add @lytjs/compat
```

## 用法

```typescript
import {
  migrateVue2LifecycleHooks,
  normalizeLifecycleHook,
  isDeprecatedLifecycleHook,
  DEPRECATED_LIFECYCLE_HOOKS,
  VUE2_LIFECYCLE_HOOKS,
  VUE3_LIFECYCLE_HOOKS,
} from '@lytjs/compat';

// 1) 单个名字归一化
normalizeLifecycleHook('beforeDestroy'); // → 'beforeUnmount'
normalizeLifecycleHook('created'); // → 'created'（不变）
isDeprecatedLifecycleHook('destroyed'); // → true

// 2) 迁移整个组件选项对象（不修改入参）
const report = migrateVue2LifecycleHooks({
  name: 'MyComp',
  beforeDestroy() {
    /* ... */
  },
  destroyed() {
    /* ... */
  },
});

report.options; // → { name: 'MyComp', beforeUnmount, unmounted }
report.renamed; // → [{ from: 'beforeDestroy', to: 'beforeUnmount' }, ...]
report.conflicts; // → 新旧名同时存在的键（策略：保留新名、丢弃旧名）
report.deprecatedCount; // → 命中的废弃名总数
report.ok; // → 入参是否为普通对象
```

`migrateVue2LifecycleHooks()` 是**确定性**的，且**二次迁移无变化**（迁移到不动点），
适合直接用于 codemod。

## 未实现（规划中）

> ❌ 以下能力**当前不存在**，**请勿在代码中引用**。README 保留此清单仅为记录路线图，
> 不再以「计划提供」的口吻暗示已可用。

- Vuex 兼容层（`mapState` / `mapGetters` / `mapActions` / `mapMutations` /
  `createNamespacedHelpers`）—— 需要先定义 Vuex 3 的 `commit` / `dispatch` 到
  `@lytjs/store`（Pinia 风格）的适配语义
- 响应式 API 桥接（Vue `ref` / `reactive` → LytJS Signal）

## 依赖关系

`@lytjs/compat` **零运行时依赖**（不依赖任何 LytJS 核心包或第三方包）。

## 相关包

- `@lytjs/store` - 状态管理（Vuex 兼容层的规划映射目标）
- `@lytjs/reactivity` - 响应式系统（响应式 API 桥接的规划映射目标）

## 浏览器兼容性

`@lytjs/compat` 支持所有现代浏览器（纯函数，无 DOM / 平台依赖）。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
