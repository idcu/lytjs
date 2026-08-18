# @lytjs/cache 更新日志

## [6.9.6] - 2026-06-06

### 新增

- 统一缓存抽象，支持 **Memory → Redis → HTTP** 多层缓存架构
- `createCache(options)` 便捷入口，默认创建内存缓存
- 完整 `Cache` 接口：`get` / `set` / `delete` / `has` / `clear`
- 缓存标签（tag）支持：`invalidateTag` / `invalidateTags` 按标签批量失效
- TTL 过期控制与多层缓存配置（`type: 'multi'`）
- 缓存统计信息：`getStats()`（命中率 `hitRate` 等）
- 基于 `@lytjs/common-cache` 与 `@lytjs/common-is` 零外部依赖实现
- 完整 ESM + CJS + 类型声明产物（`dist`）
- 中文文档 + 使用示例

## 许可证

MIT