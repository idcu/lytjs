/**
 * @lytjs/devtools - 入口文件
 *
 * LytJS 开发者工具
 */

// 主入口
export {
  // DevTools 安装
  installDevTools,
  getDevTools,
  uninstallDevTools,
  
  // 组件树
  getComponentTree,
  serializeComponentTree,
  registerRootComponent,
  unregisterRootComponent,
  
  // Store 检查器
  getStoreStates,
  getStoreState,
  setStoreState,
  dispatchStoreAction,
  serializeStoreStates,
  registerStore,
  unregisterStore,
  getRegisteredStoreIds,
  clearStoreRegistry,
  subscribeStore,
  unsubscribeStore,
  onStoreChange,
  
  // 路由检查器
  getCurrentRoute,
  navigateTo,
  navigateToName,
  goBack,
  serializeRouteInfo,
  getRoutes,
  registerRouter,
  unregisterRouter,
  isRouterRegistered,
  watchRouteChanges,
  unwatchRouteChanges,
  getRouteHistory,
  clearRouteHistory,
} from './devtools';

// 类型导出
export type {
  DevToolsOptions,
  DevToolsAPI,
  ComponentTreeNode,
  StoreStateInfo,
  RouteInfo,
} from './types';

// 默认导出
export { installDevTools as default } from './devtools';
