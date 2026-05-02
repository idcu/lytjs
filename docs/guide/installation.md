# 安装

## 系统要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0（推荐）

## 包管理器

推荐使用 pnpm：

```bash
pnpm add @lytjs/core
```

也支持 npm 和 yarn：

```bash
# npm
npm install @lytjs/core

# yarn
yarn add @lytjs/core
```

## 按需引入

Lyt.js 采用模块化架构，你可以只安装需要的包：

```bash
# 只需要响应式系统
pnpm add @lytjs/reactivity

# 只需要工具函数
pnpm add @lytjs/common-is
pnpm add @lytjs/common-object

# 需要路由
pnpm add @lytjs/router（规划中）

# 需要状态管理
pnpm add @lytjs/store（规划中）
```

## TypeScript

Lyt.js 使用 TypeScript 编写，类型定义已内置，无需额外安装 `@types` 包。

## 浏览器兼容性

| 浏览器  | 版本  |
| :------ | :---- |
| Chrome  | >= 80 |
| Firefox | >= 78 |
| Safari  | >= 14 |
| Edge    | >= 80 |
