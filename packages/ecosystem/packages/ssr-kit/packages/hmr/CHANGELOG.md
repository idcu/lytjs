# @lytjs/hmr 更新日志

## [未发布] - 2026-11-03

### 🐞 修复（5 个，共同点是「看起来生效了」）

- **`disconnect()` 断不掉**：`ws.onclose` 里无条件 `setTimeout(connect, 2000)`，
  手动断开 2 秒后又连回来；测试环境里永远有幽灵 socket。
- **重复 `connect()` 产生多条重连链**：`connect()` 先 `close()` 旧 socket，旧 socket 的
  `onclose` 又排一个定时器 ⇒ 实测 3 次断开后 socket 数从 17 涨到 40。现在
  `connect()` 幂等 + 所有回调先校验「这个 socket 还是当前 socket」。
- **`dispose` 从不执行**：`handleUpdate` 只调 `accept` ⇒ 每热更新一次就多一份旧模块的
  定时器 / 监听 / 订阅，改 50 次后页面卡成幻灯片。现在顺序固定为 **dispose → accept**。
- **`accept()` 覆盖 `dispose()` 的注册**：`accept` 与 `dispose` 是两次独立调用，
  后一次注册会把前一次覆盖掉。现在 `register` 做**合并**。
- **模块路径按字符串全等匹配**：服务端推 `./src/App.vue?t=1699`、客户端注册 `/src/App.vue`
  ⇒ **每次热更新都退化成整页刷新**（HMR 从未真正生效，但看起来「刷新了所以生效了」）。
  新增 `normalizeModulePath`（去 `./`、去 `?t=`、统一反斜杠）。

### ✨ 新增

- `reconnectDelay` / `maxReconnectDelay` 选项（指数退避，同一时刻只有一个待执行定时器）。
- `connected` 只读属性；`getHandler(path)`；`unregister(path)`。
- `handler.error` 真正接线（此前是死字段）：`dispose` / `accept` 抛错时回调它，且不阻断更新。
- 无 `window` / `CustomEvent` / `WebSocket` 的宿主不再抛错（`full-reload` 退化为事件通知）。
- 消息类型新增 `disconnected`。

## [6.9.6] - 2026-06-06

### 新增

- 热模块替换（HMR）客户端支持
- `createHMRClient(options)` 创建 HMR 客户端实例（WebSocket 连接）
- `getHMRClient()` 全局单例访问
- `accept(path, handler)` 注册模块更新处理回调
- `dispose(path, handler)` 注册模块清理回调
- 客户端方法：`connect` / `disconnect` / `send`
- WebSocket 连接管理、自动重连、状态保持
- `sideEffects: false` 便于 tree-shaking
- 完整 ESM + CJS + 类型声明产物（`dist`）
- 中文文档 + 使用示例

## 许可证

MIT