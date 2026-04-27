# @lytjs/plugin-storage

> Lyt.js 本地存储持久化插件 - 自动保存响应式状态到 localStorage/sessionStorage

**版本：** 4.2.0

## 安装

```bash
npm install @lytjs/plugin-storage
```

## 使用

### 注册插件

```typescript
import { createApp } from '@lytjs/core'
import { createStorage } from '@lytjs/plugin-storage'

const storage = createStorage({
  prefix: 'lyt_',
  expire: 24 * 60 * 60 * 1000, // 24 小时过期
})

const app = createApp({})
app.use(storage)
```

### 基本读写

```typescript
// 设置值
storage.set('user', { name: 'lyt', age: 18 })

// 获取值
const user = storage.get('user') // { name: 'lyt', age: 18 }

// 获取值（带默认值）
const theme = storage.get('theme', 'light') // 'light'

// 检查 key 是否存在
storage.has('user') // true

// 删除值
storage.remove('user')

// 获取所有 key
storage.keys() // ['theme']

// 获取存储项数量
storage.size() // 1

// 清空所有（仅当前前缀的）
storage.clear()
```

### 过期时间

```typescript
// 全局过期时间（创建时设置）
const storage = createStorage({ expire: 3600000 }) // 1 小时

// 单个 key 设置过期时间（覆盖全局设置）
storage.set('token', 'abc123', 30 * 60 * 1000) // 30 分钟过期

// 过期后自动返回 null
storage.get('token') // null（已过期）
```

### 响应式状态自动保存

```typescript
// 监听响应式对象变化，自动保存
const state = reactive({ count: 0, name: 'lyt' })

const unwatch = storage.watch(state, 'count', {
  immediate: true, // 立即保存一次
  deep: true,      // 深度监听
  debounce: 100,   // 防抖 100ms
})

// 停止监听
unwatch()
```

### 从存储恢复状态

```typescript
const state = reactive({ count: 0, name: 'lyt' })

// 从存储恢复值到响应式对象
storage.restore(state, 'count', 0)
```

### 自定义序列化

```typescript
const storage = createStorage({
  serialize: (value) => btoa(JSON.stringify(value)),
  deserialize: (value) => JSON.parse(atob(value)),
})
```

## API

### Options

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `prefix` | `string` | `'lyt_'` | key 前缀，避免与其他应用冲突 |
| `storage` | `Storage` | `localStorage` | 使用的存储对象，可替换为 `sessionStorage` |
| `expire` | `number` | - | 全局过期时间（毫秒），默认无过期 |
| `debug` | `boolean` | `false` | 是否开启调试模式 |
| `serialize` | `(value: any) => string` | `JSON.stringify` | 数据序列化函数 |
| `deserialize` | `(value: string) => any` | `JSON.parse` | 数据反序列化函数 |

### 方法

| 方法 | 签名 | 描述 |
|------|------|------|
| `set` | `<T>(key: string, value: T, expire?: number) => void` | 设置值，支持单独设置过期时间 |
| `get` | `<T>(key: string, defaultValue?: T) => T \| null` | 获取值，过期自动返回 null |
| `remove` | `(key: string) => void` | 删除值 |
| `clear` | `() => void` | 清空所有当前前缀的存储项 |
| `has` | `(key: string) => boolean` | 检查 key 是否存在且未过期 |
| `keys` | `() => string[]` | 获取所有当前前缀的 key |
| `size` | `() => number` | 获取当前前缀的存储项数量 |
| `watch` | `(target: any, key: string, options?: WatchOptions) => () => void` | 监听响应式对象变化，自动保存 |
| `restore` | `<T>(target: any, key: string, defaultValue?: T) => T` | 从存储恢复响应式对象 |

### WatchOptions

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `immediate` | `boolean` | `true` | 是否立即执行一次保存 |
| `deep` | `boolean` | `true` | 是否深度监听 |
| `debounce` | `number` | `100` | 防抖延迟（毫秒） |

### 特性

- **前缀隔离**：通过 `prefix` 选项隔离不同应用的存储
- **自动过期**：支持全局和单 key 的过期时间设置
- **SSR 兼容**：localStorage 不可用时自动降级为内存存储
- **响应式集成**：支持监听响应式对象自动保存

## License

MIT
