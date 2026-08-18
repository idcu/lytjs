# @lytjs/plugin-storage

官方存储插件，封装 localStorage/sessionStorage

## 目录

- [createStorage](#createstorage)
- [StorageType](#storagetype)
- [StorageItem](#storageitem)
- [StorageOptions](#storageoptions)
- [StorageInstance](#storageinstance)

## createStorage

**Function**

### 签名

```typescript
createStorage: StorageInstance;
```

### 参数

| 参数    | 类型             | 描述 | 可选 | 默认值 |
| ------- | ---------------- | ---- | ---- | ------ |
| options | `StorageOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `StorageInstance`

## StorageType

**Type**

### 签名

```typescript
StorageType: 'local' | 'session';
```

## StorageItem

**Interface**

### 成员

| 名称    | 类型     | 描述       | 可选 |
| ------- | -------- | ---------- | ---- |
| value   | `T`      | 数据       | 否   |
| expires | `number` | 过期时间戳 | 是   |

## StorageOptions

**Interface**

### 成员

| 名称        | 类型          | 描述         | 可选 |
| ----------- | ------------- | ------------ | ---- |
| defaultType | `StorageType` | 默认存储类型 | 是   |
| prefix      | `string`      | 命名空间前缀 | 是   |

## StorageInstance

**Interface**

### 成员

| 名称         | 类型                                                   | 描述          | 可选 |
| ------------ | ------------------------------------------------------ | ------------- | ---- |
| set          | `<T>(key: string, value: T, expires?: number) => void` | 设置值        | 否   |
| get          | `<T>(key: string, defaultValue?: T) => T \| null`      | 获取值        | 否   |
| remove       | `(key: string) => void`                                | 删除值        | 否   |
| clear        | `() => void`                                           | 清空所有值    | 否   |
| has          | `(key: string) => boolean`                             | 检查是否存在  | 否   |
| keys         | `() => string[]`                                       | 获取所有 keys | 否   |
| clearExpired | `() => void`                                           | 移除过期项    | 否   |
