/**
 * @lytjs/platform-adapter
 * 跨平台渲染适配器 - 公共 API 入口
 *
 * @description
 * 提供跨平台渲染的抽象层，支持多平台适配器注册、
 * 插件扩展和统一渲染器创建。
 */

// 类型导出
export type {
  PlatformAdapter,
  PlatformConfig,
  PlatformPlugin,
} from './types';

// 适配器注册表
export { adapterRegistry } from './adapter-registry';

// 渲染器工厂
export { createPlatformRenderer } from './create-renderer';
export type { PlatformRenderer } from './create-renderer';
