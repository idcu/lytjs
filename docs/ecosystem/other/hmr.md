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
});

// 或者使用全局单例
const globalClient = getHMRClient();

// 接受模块更新
accept('/path/to/module.ts', (update) => {
  console.log('模块已更新：', update);
});
```

## 特性

- WebSocket 连接管理
- 模块更新处理
- 自动重连
- 状态保持

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

注册模块清理函数。

### client.connect()

连接到 HMR 服务器。

### client.disconnect()

断开连接。

### client.send(message)

发送消息。

## 许可证

MIT
