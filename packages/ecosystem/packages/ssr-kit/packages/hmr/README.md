# @lytjs/hmr

LytJS 热模块替换（Hot Module Replacement）支持。

## 安装

```bash
pnpm add -D @lytjs/hmr
```

## 快速开始

```typescript
import { createHMRClient, getHMRClient, accept } from '@lytjs/hmr';

// 创建 HMR 客户端
const client = createHMRClient({
  url: 'ws://localhost:5173',
  autoConnect: true,
  reconnectDelay: 2000, // 首次重连间隔，之后指数退避
  maxReconnectDelay: 30000, // 退避上限
});

// 或者使用全局单例
const globalClient = getHMRClient();

// 接受模块更新
accept('/path/to/module.ts', (update) => {
  console.log('模块已更新：', update);
});
```

## 特性

- WebSocket 连接管理（`connect()` 幂等，`disconnect()` **真的断开**）
- 模块更新处理：更新前先执行 `dispose()` 再 `accept()`（不会积累旧副作用）
- 自动重连：指数退避（`reconnectDelay` × 2ⁿ，上限 `maxReconnectDelay`），同一时刻只有一个待执行定时器
- 模块路径归一化：`./`、`?t=123`、Windows `\` 都能匹配到同一个 handler（否则每次热更新都会退化成整页刷新）

## API

### createHMRClient(options)

创建 HMR 客户端实例。

```typescript
import { createHMRClient } from '@lytjs/hmr';

const client = createHMRClient({
  url: 'ws://localhost:5173',
  autoConnect: true,
});
```

### getHMRClient(options)

获取全局 HMR 客户端单例。

### accept(path, handler)

注册模块更新处理函数。

### dispose(path, handler)

注册模块清理函数：**每次**更新在 `accept` 之前执行，用来拆掉旧模块的定时器 / 监听 / 订阅。

```typescript
import { accept, dispose } from '@lytjs/hmr';

accept('/src/App.vue', (update) => mount(update));
dispose('/src/App.vue', () => unmount()); // 先 accept 后 dispose 也可以，两者会合并
```

### dispose(path, handler)

注册模块清理函数。

### client.connect()

连接到 HMR 服务器。

### client.disconnect()

断开连接。

### client.send(message)

发送消息。

## 许可证

MIT
