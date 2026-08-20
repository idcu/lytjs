# @lytjs/plugin-data

LytJS 官方增强版数据获取插件，提供乐观更新、缓存策略、请求去重等功能。

## 简介·独立声明

LytJS 官方增强版数据获取插件，提供乐观更新、缓存策略、请求去重等功能。

> **框架无关性说明**：本插件为框架生态包，零第三方依赖，仅构建于 LytJS 核心之上（仅依赖 `@lytjs/core`、`@lytjs/reactivity` 与 `@lytjs/plugin-data-fetch`，均实际使用）。按 v6.12 路线图规划，所有 @lytjs/plugin-\* 插件将统一迁出为独立仓库 lytjs-plugins，保持 API 兼容并提供迁移指南。

## 安装

```bash
pnpm add @lytjs/plugin-data
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginData from '@lytjs/plugin-data';

const app = createApp();
app.use(pluginData);
```

### 独立使用

```typescript
import { createData } from '@lytjs/plugin-data';

// 创建数据实例
const data = createData('/api/users');

// 监听数据变化
data.on('data', (users) => {
  console.log('数据已更新：', users);
});

// 手动刷新
await data.refresh();
```

## 特性

- 乐观更新
- 请求去重
- 多种缓存策略（TTL、LRU）
- 自动重试
- 与 @lytjs/plugin-data-fetch 深度集成
- 零外部依赖

## API

### createData(url, options, globalOptions)

创建数据获取实例。

```typescript
import { createData } from '@lytjs/plugin-data';

const data = createData('/api/users', {
  method: 'GET',
  cache: 'ttl',
  ttl: 60000,
});
```

### createDataManager(globalOptions)

创建全局数据管理器。

```typescript
import { createDataManager } from '@lytjs/plugin-data';

const manager = createDataManager({
  defaultCache: 'ttl',
  defaultTTL: 60000,
});

const data = manager.create('/api/users');
```

## 许可证

MIT
