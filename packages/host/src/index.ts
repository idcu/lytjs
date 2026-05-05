/**
 * @lytjs/host - 宿主接口扩展
 *
 * 扩展 RendererHost 接口，添加更多宿主能力支持
 *
 * @module @lytjs/host
 * @version 6.0.0
 */

// 类型导出
export type {
  // 基础类型
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
  TransitionDurationInfo,

  // 扩展类型
  ExtendedRendererHost,
  HostCapabilities,
  CreateExtendedHostOptions,
} from './host';

// 函数导出
export {
  // 能力检测
  detectHostCapabilities,
  supportsHostCapability,
  waitForHostReady,

  // 适配器工厂
  createExtendedWebHost,
} from './host';
