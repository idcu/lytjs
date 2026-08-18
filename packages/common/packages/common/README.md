# @lytjs/common

LytJS 通用工具聚合包。它本身不实现任何逻辑，而是将众多的 `@lytjs/common-*` 子包统一导入并 **re-export**，让使用者只需从一个入口即可获取所有通用工具，无需逐个安装与导入各个子包。

## 安装

```bash
pnpm add @lytjs/common
```

## 使用示例

从一个入口统一导入多个子包的能力：

```ts
import {
  // 判断工具（@lytjs/common-is）
  isString,
  isPlainObject,
  // 字符串工具（@lytjs/common-string）
  kebabCase,
  normalizeClass,
  // 类型判断 / 补丁（@lytjs/common-vnode）
  isVNode,
  Text,
  // DOM 补丁（@lytjs/common-dom）
  patchProp,
  isSVGTag,
  // 错误处理（@lytjs/common-error）
  LytError,
  safeExec,
  // 调度器（@lytjs/common-scheduler）
  nextTick,
  queueJob,
  // 对象工具（@lytjs/common-object）
  deepClone,
  merge,
} from '@lytjs/common';
```

## 涵盖的命名空间

聚合包 re-export 了以下子包的全部导出（分组与对应包名）：

- **环境** `@lytjs/common-env`：`isBrowser` / `isNode` / `isSSR` / `getEnvInfo` 等
- **判断** `@lytjs/common-is`：`isString` / `isObject` / `isArray` / `hasChanged` 等
- **字符串** `@lytjs/common-string`：`kebabCase` / `normalizeClass` / `sanitizeHTML` / `generateId` 等
- **路径** `@lytjs/common-path`：`normalizePath` / `joinPath` / `matchPath` 等
- **事件** `@lytjs/common-events`：`EventEmitter` / `getDOMEventName` / `isOn` 等
- **缓存** `@lytjs/common-cache`：`LRUCache` / `memoize` / `ExpiringCache` 等
- **定时** `@lytjs/common-timing`：`debounce` / `throttle` / `delay` / `retry` / `TaskQueue` 等
- **算法** `@lytjs/common-algorithm`：`getSequence`
- **VNode** `@lytjs/common-vnode`：`Fragment` / `Text` / `ShapeFlags` / `PatchFlags` 及各类判断工具
- **错误** `@lytjs/common-error`：`LytError` / `LytErrorCodes` / `createCompilerError` / `safeExec` 等
- **对象** `@lytjs/common-object`：`deepMerge` / `deepClone` / `pick` / `omit` 等
- **调度器** `@lytjs/common-scheduler`：`nextTick` / `queueJob` / `flushJobs` / `flushSync` 等
- **DOM 补丁** `@lytjs/common-dom`：`SVG_TAGS` / `patchClass` / `patchStyle` / `patchAttr` / `patchProp`
- **查询** `@lytjs/common-query`：`parseQueryString` / `buildURL` 等
- **DOM 辅助** `@lytjs/common-dom-helpers`：`createElement` / `removeChild` 等
- **无障碍** `@lytjs/common-a11y`：`focusTrap` / `manageFocus` / `getAriaProps` 等
- **键盘** `@lytjs/common-keyboard`：`matchShortcut` / `parseShortcut` 等
- **存储** `@lytjs/common-storage`：`createStorage` / `isStorageAvailable` 等
- **校验** `@lytjs/common-validate`：`validate` / `createValidator` / `email` / `number` 等
- **HTTP** `@lytjs/common-http`：`HttpClient` / `HttpError` / `createHttpClient` / `http` 等
- **帧回调** `@lytjs/common-raf`：`raf` / `rafThrottle` / `rafDebounce` 等
- **渲染队列** `@lytjs/common-render-queue`：`RenderQueue` / `RENDER_PRIORITY_WEIGHT`
- **事件规范化** `@lytjs/common-event-normalizer`：`EventNormalizer` 及修饰符解析
- **节点缓存** `@lytjs/common-node-cache`：`NodeCache`
- **异步调度器** `@lytjs/common-async-scheduler`：`AsyncScheduler`
- **过渡引擎** `@lytjs/common-transition-engine`：`TransitionEngine`
- **性能** `@lytjs/common-performance`：`PerformanceMonitor` / `getPerformanceMonitor` 等
- **常量** `@lytjs/common-constants`：全局共享的魔法数字与配置常量

## 相关包

如果只需要某个方向的工具，也可以只安装对应的子包（如 `@lytjs/common-is`、`@lytjs/common-string` 等）以减少依赖体积。聚合包适合希望统一入口、按需 tree-shaking 的场景。

## 许可证

[MIT](../../../../LICENSE)
