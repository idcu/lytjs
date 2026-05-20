/**
 * @lytjs/ssr - 入口文件
 *
 * LytJS 服务端渲染支持
 */

// 渲染函数
export { renderToString, renderToHtml } from './render';

// 虚拟列表组件
export { VirtualList } from './virtualList';

// 流式服务端渲染
export { 
  renderToStream, 
  renderToStreamAsync, 
  renderToStreamEnhanced 
} from './stream';
export type { 
  StreamRenderOptions, 
  EnhancedStreamRenderOptions,
  DataPrefetchContext,
  PrefetchResult,
  PrefetchableComponent
} from './stream';

// 静态站点生成
export { 
  generateStaticPages, 
  generateRouteManifest, 
  validatePages,
  writeStaticFiles,
  createISRMiddleware,
  revalidateOnDemand,
  getISRCacheStats,
  clearISRCache
} from './ssg';
export type { SSGPage, SSGOptions } from './ssg';

// 服务端组件
export {
  registerServerComponent,
  unregisterServerComponent,
  collectPrefetchComponents,
  prefetchAllComponents,
  safeSerializeState,
  safeDeserializeState,
  buildDehydratedState,
  ServerComponent,
  stateManager,
} from './server-components';
export type {
  ServerLifecycleHook,
  ServerComponentContext,
  ServerComponentRegistration,
  ComponentDehydratedState,
} from './server-components';

// 水合提示
export {
  createHydrationMarkers,
  getHydrationStrategy,
  serializeHydrationState,
  createDehydratedState,
  resetComponentIdCounter,
} from './hydration';
export type { HydrationStrategy, HydrationHints, HydrationState } from './hydration';

// 默认导出
export { default } from './render';
