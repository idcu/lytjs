/**
 * @module component
 * 组件系统 - 聚合导出入口
 *
 * 此文件已拆分为多个子模块以降低复杂度：
 * - component-setup.ts: 组件实例创建和设置
 * - component-init.ts: 组件完成初始化
 * - component-proxy.ts: 公共实例代理
 * - component-options.ts: 选项合并和组件定义
 * - component-inject.ts: 依赖注入
 */

// component-setup.ts: 组件实例创建和设置
export {
  createComponentInstance,
  setupComponent,
  initProps,
  createSetupContext,
} from './component-setup';

// component-init.ts: 组件完成初始化
export {
  finishComponentSetup,
} from './component-init';

// component-proxy.ts: 公共实例代理
export {
  PublicInstanceProxyAccessCache,
  PUBLIC_PROPERTIES_MAP,
  createComponentPublicInstance,
} from './component-proxy';

// component-options.ts: 选项合并和组件定义
export {
  defineComponent,
  defineFunctionalComponent,
  mergeOptions,
  createAppContext,
} from './component-options';

// component-inject.ts: 依赖注入
export type {
  InjectionKey,
  ProvideOptions,
  InjectOptions,
} from './component-inject';
export {
  provide,
  inject,
} from './component-inject';
