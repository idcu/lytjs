/**
 * @lytjs/micro-frontend — 统一入口
 *
 * 导出所有微前端相关的公共 API。
 */

// 沙箱隔离
export {
  createSandbox,
  createStyleSandbox,
} from './sandbox'

export type {
  Sandbox,
  StyleSandbox,
  SandboxStatus,
  SandboxOptions,
  StyleSandboxOptions,
} from './sandbox'

// 通信机制
export {
  EventBus,
  SharedState,
} from './communication'

export type {
  EventCallback,
  StateChangeCallback,
} from './communication'

// 生命周期管理
export {
  MicroApp,
} from './lifecycle'

export type {
  MicroAppStatus,
  MicroAppLifecycle,
  MicroAppOptions,
  MicroAppInfo,
} from './lifecycle'

// 框架适配器
export {
  createQiankunLifeCycle,
  createMicroAppEntry,
  createMicroFrontendConfig,
} from './adapters'

export type {
  QiankunLifeCycle,
  QiankunProps,
  MicroAppEntryConfig,
  QiankunAdapterOptions,
  MicroAppAdapterOptions,
} from './adapters'
