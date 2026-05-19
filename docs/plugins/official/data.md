# @lytjs/plugin-data

LytJS 官方增强版数据获取插件，提供乐观更新、缓存策略、请求去重等功能。

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
