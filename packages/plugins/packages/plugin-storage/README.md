# @lytjs/plugin-storage

LytJS 官方存储插件，提供 `localStorage` 与 `sessionStorage` 支持及 JSON 序列化能力的键值存储。

## 安装

```bash
pnpm add @lytjs/plugin-storage
```

## 使用示例

### 作为插件使用

插件按 LytJS 惯例在应用实例中注册。注册后可通过 `app.config.globalProperties.$storage` 或依赖注入 `lyt-storage` 访问存储实例。

```typescript
import { createApp } from '@lytjs/core';
import pluginStorage from '@lytjs/plugin-storage';

const app = createApp();

app.use(pluginStorage, {
  defaultType: 'local',
  prefix: 'lyt_',
});
```

### 独立使用

```typescript
import { createStorage } from '@lytjs/plugin-storage';

const storage = createStorage({ defaultType: 'local', prefix: 'lyt_' });

// 写入，可指定过期时间（毫秒）
storage.set('user', { name: 'lytjs' }, 1000 * 60 * 60);

// 读取，可提供默认值
const user = storage.get('user', { name: 'anonymous' });

// 检查是否存在
if (storage.has('user')) {
  // ...
}

// 删除
storage.remove('user');

// 列出所有 key
const keys = storage.keys();

// 只清理已过期的项
storage.clearExpired();

// 清空当前前缀下全部数据
storage.clear();
```

## API 说明

### 导出

- 默认导出：`pluginStorage`（插件，通过 `app.use` 注册）
- `createStorage(options?: StorageOptions): StorageInstance` 独立创建存储实例

### StorageOptions

| 选项          | 类型          | 默认值    | 说明             |
| ------------- | ------------- | --------- | ---------------- |
| `defaultType` | `StorageType` | `'local'` | 默认存储类型     |
| `prefix`      | `string`      | `'lyt_'`  | key 命名空间前缀 |

`StorageType` = `'local' | 'session'`。

### StorageInstance

| 成员           | 签名                                           | 说明                 |
| -------------- | ---------------------------------------------- | -------------------- |
| `set`          | `<T>(key, value: T, expires?: number) => void` | 写入（可带过期毫秒） |
| `get`          | `<T>(key, defaultValue?: T) => T \| null`      | 读取（可带默认值）   |
| `remove`       | `(key: string) => void`                        | 删除指定 key         |
| `clear`        | `() => void`                                   | 清空前缀下全部数据   |
| `has`          | `(key: string) => boolean`                     | 判断 key 是否存在    |
| `keys`         | `() => string[]`                               | 列出当前前缀的 key   |
| `clearExpired` | `() => void`                                   | 仅移除已过期项       |

存储值会被序列化为 JSON，并记录可选的时间戳字段用于过期判断；`get` 在遇到过期项时自动删除该 key。

## 相关包

- [@lytjs/core](../../../core) 插件定义与运行时核心
- [@lytjs/reactivity](../../../reactivity) 响应式能力

## 许可证

[MIT](../../../../LICENSE)
