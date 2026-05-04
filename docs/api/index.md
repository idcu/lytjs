# API 参考

LytJS 框架的 API 参考文档，按包分类组织。

## 核心包

| 包名 | 说明 |
|------|------|
| [@lytjs/core](./core) | 核心入口包，提供应用创建、组件定义、生命周期、组合式 API 等 |
| [@lytjs/reactivity](./reactivity) | 响应式系统，提供 Ref、Reactive、Computed、Watch、Effect、Signal 等 |
| [@lytjs/compiler](./compiler) | 模板编译器，支持 VNode/Signal/SSR 三种代码生成模式 |
| [@lytjs/renderer](./renderer) | 渲染后端，提供 DOM/SSR/Signal 渲染和 Island Architecture |
| [@lytjs/component](./component) | 组件系统，提供组件实例管理、内置组件和生命周期 |

## 构建变体

| 包名 | 说明 |
|------|------|
| [独立构建变体](./core-variants) | `@lytjs/core-vnode` 和 `@lytjs/core-signal` 的 API 参考和迁移指南 |
