# @lytjs/hmr

热模块替换（HMR）支持

## 目录

- [HMRClient](#hmrclient)
- [createHMRClient](#createhmrclient)
- [globalClient](#globalclient)
- [getHMRClient](#gethmrclient)
- [accept](#accept)
- [dispose](#dispose)
- [HMRClientOptions](#hmrclientoptions)
- [HMRMessage](#hmrmessage)
- [HMRUpdate](#hmrupdate)
- [HMRHandler](#hmrhandler)

## HMRClient

**Class**

HMR 客户端类

### 成员

| 名称             | 类型                         | 描述              | 可选 |
| ---------------- | ---------------------------- | ----------------- | ---- |
| options          | `Required<HMRClientOptions>` |                   | 否   |
| ws               | `WebSocket \| null`          |                   | 否   |
| handlers         | `Map<string, HMRHandler>`    |                   | 否   |
| isConnected      | `boolean`                    |                   | 否   |
| connect          | -                            | 连接到 HMR 服务器 | 否   |
| handleMessage    | -                            | 处理消息          | 否   |
| handleUpdate     | -                            | 处理模块更新      | 否   |
| handleFullReload | -                            | 处理完全重新加载  | 否   |
| register         | -                            | 注册模块处理程序  | 否   |
| unregister       | -                            | 注销模块处理程序  | 否   |
| send             | -                            | 发送消息到服务器  | 否   |
| dispatch         | -                            | 分发事件          | 否   |
| disconnect       | -                            | 断开连接          | 否   |

## createHMRClient

**Function**

创建 HMR 客户端

### 签名

```typescript
createHMRClient: HMRClient;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `HMRClientOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `HMRClient`

HMR 客户端实例

## globalClient

**Variable**

全局 HMR 客户端实例（单例）

## getHMRClient

**Function**

获取全局 HMR 客户端

### 签名

```typescript
getHMRClient: HMRClient;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `HMRClientOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `HMRClient`

HMR 客户端实例

## accept

**Function**

HMR 模块接受函数

### 签名

```typescript
accept: void
```

### 参数

| 参数    | 类型                          | 描述 | 可选 | 默认值 |
| ------- | ----------------------------- | ---- | ---- | ------ |
| path    | `string`                      |      | 否   | -      |
| handler | `(update: HMRUpdate) => void` |      | 否   | -      |

### 返回值

**类型:** `void`

## dispose

**Function**

HMR 模块清理函数

### 签名

```typescript
dispose: void
```

### 参数

| 参数    | 类型         | 描述 | 可选 | 默认值 |
| ------- | ------------ | ---- | ---- | ------ |
| path    | `string`     |      | 否   | -      |
| handler | `() => void` |      | 否   | -      |

### 返回值

**类型:** `void`

## HMRClientOptions

**Interface**

### 成员

| 名称        | 类型      | 描述          | 可选 |
| ----------- | --------- | ------------- | ---- |
| url         | `string`  | WebSocket URL | 是   |
| autoConnect | `boolean` | 是否自动连接  | 是   |

## HMRMessage

**Interface**

### 成员

| 名称 | 类型                                                   | 描述     | 可选 |
| ---- | ------------------------------------------------------ | -------- | ---- |
| type | `'connected' \| 'update' \| 'full-reload' \| 'custom'` | 消息类型 | 否   |
| data | `unknown`                                              | 数据     | 是   |

## HMRUpdate

**Interface**

### 成员

| 名称          | 类型      | 描述             | 可选 |
| ------------- | --------- | ---------------- | ---- |
| path          | `string`  | 模块路径         | 否   |
| timestamp     | `number`  | 更新时间戳       | 否   |
| preserveState | `boolean` | 是否需要保留状态 | 是   |

## HMRHandler

**Interface**

### 成员

| 名称    | 类型                          | 描述       | 可选 |
| ------- | ----------------------------- | ---------- | ---- |
| accept  | `(update: HMRUpdate) => void` | 接受更新   | 是   |
| error   | `(error: Error) => void`      | 处理错误   | 是   |
| dispose | `() => void`                  | 清理旧模块 | 是   |
