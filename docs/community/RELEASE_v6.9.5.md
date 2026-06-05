# LytJS v6.9.5 发布说明

## 🎉 版本亮点

LytJS v6.9.5 是一个重要的补丁版本，主要修复了 @lytjs/store 和 @lytjs/ui 包的集成问题，确保了完整的生态系统兼容性。

## 🚀 主要修复

### @lytjs/store 集成修复

- **重构 pinia.ts** - 使用 `definePlugin` API 创建标准插件
- **添加依赖** - 将 @lytjs/core 添加为依赖项
- **兼容性保障** - 确保与 `app.use()` 完全兼容
- **问题解决** - 修复 defineStore 集成问题导致页面空白的问题

### @lytjs/ui 包修复

- **更新导出配置** - 在 package.json 中新增多个 CSS 路径别名
  - 支持 `@lytjs/ui/index.css`
  - 支持 `@lytjs/ui/style.css`（向后兼容）
  - 支持 `@lytjs/ui/styles`（向后兼容）
- **构建配置优化** - 修改 tsup.config.ts，添加 onSuccess 钩子自动复制 CSS 到 dist
- **插件化重构** - 重构 index.ts，使用 `definePlugin` API 创建标准 LytJS 插件
- **依赖管理** - 添加 @lytjs/core 作为依赖项

## 📦 完整更新包列表

所有 86 个包版本统一升级至 v6.9.5，确保版本一致性。

## 🔧 修复的问题

- 修复 @lytjs/store 和 @lytjs/ui 集成时导致页面空白的问题
- 修复 @lytjs/ui CSS 文件路径不匹配问题
- 修复 @lytjs/store 与现有代码的兼容性问题

## 📖 升级指南

### 从 v6.9.0 升级到 v6.9.5

```bash
# 更新所有 LytJS 相关包
pnpm update @lytjs/*
```

### 使用 @lytjs/store

```typescript
import { createApp } from '@lytjs/core';
import { createPinia, defineStore } from '@lytjs/store';

const app = createApp({ /* ... */ });
const pinia = createPinia();

app.use(pinia);

// 定义 store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++;
    }
  }
});

app.mount('#app');
```

### 使用 @lytjs/ui

```typescript
import { createApp } from '@lytjs/core';
import LytUI from '@lytjs/ui';
import '@lytjs/ui/index.css';

const app = createApp({ /* ... */ });
app.use(LytUI);
app.mount('#app');
```

## 🎯 下一步计划

v6.9.5 是 v6.x 系列的重要补丁版本。后续将根据社区反馈继续优化和完善框架。

## 📄 许可证

MIT
