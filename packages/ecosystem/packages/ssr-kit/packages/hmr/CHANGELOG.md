# @lytjs/hmr 更新日志

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