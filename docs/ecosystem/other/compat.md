# @lytjs/compat

> LytJS Vue 2/3 兼容性层（规划中），为从 Vue 项目迁移到 LytJS 提供平滑过渡支持。

[![npm version](https://img.shields.io/npm/v/@lytjs/compat.svg)](https://www.npmjs.com/package/@lytjs/compat)
[![license](https://img.shields.io/npm/l/@lytjs/compat.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介·独立声明

`@lytjs/compat` 是 LytJS 框架的官方兼容性层包，旨在帮助开发团队从 Vue 2 或 Vue 3 项目平滑迁移到 LytJS。它计划提供一系列兼容性适配器、生命周期钩子映射、状态管理兼容层和路由兼容工具，最大程度地减少迁移成本。

> ⚠️ **开发状态：规划中（尚未实现）**
>
> 当前版本为**占位包**：源码仅包含空导出（`export {}`），**未提供任何实际 API**。以下规划能力仅供设计参考，**请勿在代码中引用**：
>
> - 生命周期兼容：自动映射 Vue 2/3 生命周期钩子到 LytJS
> - Vuex 兼容层：`mapState` / `mapGetters` / `mapActions` / `mapMutations` / `createNamespacedHelpers` 等工具函数
> - Vue Router 兼容：路由守卫命名和参数映射
> - 响应式 API 兼容：Vue 响应式 API 到 LytJS Signal 的桥接
>
> 按 v6.12 路线图规划，本库将迁出为独立仓库 `lytjs-compat`，实现上述能力并保持 API 兼容，届时提供迁移指南。

## 安装

```bash
npm install @lytjs/compat
```

或使用 pnpm：

```bash
pnpm add @lytjs/compat
```

## 依赖关系

`@lytjs/compat` 当前为纯占位包，**零运行时依赖**（不依赖任何 LytJS 核心包或第三方包）。

## 相关包

- `@lytjs/store` - 状态管理（Vuex 兼容层规划映射目标）
- `@lytjs/router` - 路由系统（Vue Router 兼容规划映射目标）
- `@lytjs/reactivity` - 响应式系统（Vue 响应式 API 兼容规划映射目标）

## 浏览器兼容性

`@lytjs/compat` 支持所有现代浏览器。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
