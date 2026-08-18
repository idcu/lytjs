# @lytjs/common-storage

轻量级类型安全的存储工具。

## 安装

```bash
pnpm add @lytjs/common-storage
```

## 使用示例

```typescript
import {
  createStorage,
  createSessionStorage,
  parseJSON,
  isStorageAvailable,
} from '@lytjs/common-storage';

// 创建类型安全的 localStorage 存储适配器
const settings = createStorage<{ theme: string }>({
  key: 'settings',
  default: { theme: 'light' },
});

settings.get(); // { theme: 'light' }
settings.set({ theme: 'dark' });
settings.get(); // { theme: 'dark' }
settings.has(); // true
settings.remove();

// 监听变化
const off = settings.onChange((value) => console.log(value));

// 使用 sessionStorage 的快捷方式
const sessionData = createSessionStorage<number>({
  key: 'counter',
  default: 0,
});
```

## API

### 类型

| 类型                | 说明                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| `StorageOptions<T>` | 存储配置项：`key`（必填）、`storage`、`serializer`、`deserializer`、`default` |
| `StorageAdapter<T>` | 存储适配器：`get`、`set`、`remove`、`has`、`onChange`                         |

### `createStorage<T>(options: StorageOptions<T>): StorageAdapter<T>`

创建类型安全的存储适配器，内部基于 `window.localStorage`，支持自定义序列化与监听跨标签页的 `storage` 事件变化。

### `createSessionStorage<T>(options: Omit<StorageOptions<T>, 'storage'>): StorageAdapter<T>`

使用 `window.sessionStorage` 的快捷方式，参数不能包含 `storage` 字段。

### `parseJSON<T>(value: string, fallback: T): T`

安全的 JSON 解析，解析失败返回 `fallback`。

### `isStorageAvailable(storage?: Storage): boolean`

检查存储是否可用（处理隐私模式等场景）。未传参时默认检测 `window.localStorage`。

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
