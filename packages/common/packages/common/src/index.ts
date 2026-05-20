/**
 * @lytjs/common
 * 聚合包 - re-export 所有子包
 */

// constants
export {
  // 编译器常量
  COMPILER_MAX_INPUT_LENGTH,
  COMPILER_MAX_REGEX_INPUT_LENGTH,
  COMPILER_MAX_ATTRIBUTES,
  COMPILER_END_TAG_CACHE_MAX_SIZE,
  // VDOM 常量
  VDOM_MAX_LIST_DIFF_SIZE,
  VDOM_MAX_RECURSION_DEPTH,
  // 响应式常量
  REACTIVITY_MAX_TRIGGER_DEPTH,
  REACTIVITY_MAX_TRACK_DEPTH,
  // 错误处理常量
  ERROR_MAX_WARNED_MESSAGES,
  // 调度器常量
  SCHEDULER_MAX_ITERATIONS,
  SCHEDULER_MAX_FLUSH_RETRIES,
  // 缓存常量
  CACHE_DEFAULT_LRU_SIZE,
  CACHE_MAX_ENTRIES,
  // DOM 常量
  DOM_DEBOUNCE_DELAY_MS,
  DOM_MAX_BATCH_SIZE,
  // 性能监控常量
  PERF_MONITOR_SAMPLE_RATE,
  PERF_MAX_ENTRIES,
  // 时间常量
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  FRAME_INTERVAL_MS,
  // HTTP 常量
  HTTP_DEFAULT_TIMEOUT_MS,
  HTTP_MAX_RETRIES,
  HTTP_RETRY_DELAY_MS,
  // 存储常量
  STORAGE_VERSION_KEY_PREFIX,
  STORAGE_DEFAULT_EXPIRY_MS,
  // 对象操作常量
  CLONE_DEFAULT_MAX_DEPTH,
  PROTO_POLLUTION_KEYS,
  // 字符串常量
  STRING_DEFAULT_TRUNCATION_OMISSION,
  STRING_DEFAULT_ID_PREFIX,
  // 数值常量
  FLOAT_EPSILON,
  MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER,
} from '@lytjs/common-constants';

// env
export { isBrowser, isNode, isSSR, getEnvInfo, type EnvInfo } from '@lytjs/common-env';

// is
export {
  NOOP,
  EMPTY_OBJ,
  EMPTY_ARR,
  EMPTY_FN,
  isString,
  isNumber,
  isBoolean,
  isSymbol,
  isBigInt,
  isObject,
  isPlainObject,
  isArray,
  isFunction,
  isPromise,
  isNullish,
  isEmpty,
  isStringOrNumber,
  hasOwn,
  hasChanged,
  toTypeString,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isDate,
  isRegExp,
} from '@lytjs/common-is';

// string
export {
  capitalize,
  kebabCase,
  camelCase,
  pascalCase,
  camelToKebab,
  kebabToCamel,
  escapeRegExp,
  escapeHTML,
  escapeHtml,
  unescapeHTML,
  trim,
  trimChars,
  repeat,
  padStart,
  padEnd,
  startsWith,
  endsWith,
  includes,
  split,
  words,
  substring,
  truncate,
  template,
  normalizeClass,
  normalizeStyle,
  normalizeStyleObject,
  sanitizeHTML,
  isSafeAttribute,
  escapeAttrValue,
  isBooleanAttr,
  VOID_ELEMENTS,
  BOOLEAN_ATTRS,
  DANGEROUS_EVENT_ATTRS,
  generateId,
  parseDuration,
} from '@lytjs/common-string';

// path
export {
  normalizePath,
  joinPath,
  dirname,
  basename,
  extname,
  pathToRegex,
  matchPath,
  isAbsolute,
  isRelative,
  parsePath,
  resolvePath,
  type PathMatchResult,
  type ParsedPath,
} from '@lytjs/common-path';

// events
export {
  isOn,
  DOM_EVENT_NAME_MAP,
  getDOMEventName,
  extractDOMEventHandler,
  extractDOMEventOptions,
  EventEmitter,
  SubscriptionManager,
  TopicSubscriptionManager,
  type EventHandler,
} from '@lytjs/common-events';

// cache
export {
  LRUCache,
  memoize,
  ExpiringCache,
  type LRUNode,
  type CacheEntry,
  type MemoizedFn,
} from '@lytjs/common-cache';

// timing
export {
  debounce,
  debounceImmediate,
  throttle,
  throttleWithTrailing,
  delay,
  retry,
  timeout,
  poll,
  TaskQueue,
  identity,
  constant,
  once,
  type DebouncedFn,
  type ThrottledFn,
} from '@lytjs/common-timing';

// algorithm
export { getSequence } from '@lytjs/common-algorithm';

// vnode
export {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  isVNode,
  isFragment,
  isTextVNode,
  isCommentVNode,
  isSameVNodeType,
  hasPatchFlag,
  describePatchFlag,
  type VNode,
  type VNodeTypes,
  type VNodeChildren,
  type VNodeData,
  type VNodeSourceLocation,
  type ComponentPublicInstance,
  type ComponentInternalInstance,
  type BaseComponentOptions,
} from '@lytjs/common-vnode';

// error
export {
  LytErrorCodes,
  ErrorCategory,
  type ErrorCategoryType,
  getErrorMessage,
  getCategory,
  type SourceLocation,
  LytError,
  createCompilerError,
  createRendererError,
  createComponentError,
  setDevMode,
  getDevMode,
  warn,
  warnOnce,
  error,
  resetWarnedMessages,
  safeExec,
  safeJsonParse,
} from '@lytjs/common-error';

// object
export {
  mergeObjects,
  deepMerge,
  createSnapshot,
  diffObjects,
  pick,
  omit,
  deepClone,
  shallowEqual,
  deepEqual,
  get,
  set,
  shallowClone,
  merge,
  unique,
  chunk,
  flatten,
  groupBy,
  type ObjectDiff,
} from '@lytjs/common-object';

// scheduler
export {
  queueJob,
  queuePreFlushCb,
  queuePostFlushCb,
  nextTick,
  flushJobs,
  flushSync,
  hasPendingJobs,
  getPendingJobCount,
  resetSchedulerState,
  setMaxIterations,
  setErrorHandler,
} from '@lytjs/common-scheduler';

// dom
export {
  SVG_TAGS,
  SVG_NS,
  isSVGTag,
  patchClass,
  patchStyle,
  patchAttr,
  patchProp,
} from '@lytjs/common-dom';

// query
export {
  parseQueryString,
  stringifyQueryString,
  parseURL,
  buildURL,
  type ParsedURL,
} from '@lytjs/common-query';

// dom-helpers
export {
  createElement,
  insertBefore,
  removeChild,
  nextSibling,
  createTextNode,
  createComment,
  setStyle,
  hasClass,
  addClass,
  removeClass,
} from '@lytjs/common-dom-helpers';

// a11y
export {
  focusTrap,
  manageFocus,
  getAriaProps,
  setAriaProps,
  isFocusable,
  getFocusableElements,
  assertActiveElement,
  ARIA_ROLES,
  type FocusTrapOptions,
} from '@lytjs/common-a11y';

// keyboard
export {
  matchShortcut,
  createKeySequence,
  parseShortcut,
  MODIFIER_KEYS,
  SPECIAL_KEYS,
  type ParsedShortcut,
} from '@lytjs/common-keyboard';

// storage
export {
  createStorage,
  createSessionStorage,
  isStorageAvailable,
  parseJSON,
  type StorageOptions,
  type StorageAdapter,
} from '@lytjs/common-storage';

// validate
export {
  validate,
  createValidator,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  number,
  min,
  max,
  oneOf,
  custom,
  builtInRules,
  type ValidationResult,
  type ValidationRule,
} from '@lytjs/common-validate';

// http
export {
  HttpClient,
  HttpError,
  CancellationToken,
  createHttpClient,
  http,
  type HttpClientOptions,
  type RequestOptions,
  type HttpResponse,
  type InternalRequestConfig,
  type Interceptor,
} from '@lytjs/common-http';

// raf
export { raf, caf, nextFrame, rafThrottle, rafDebounce } from '@lytjs/common-raf';

// render-queue
export {
  RenderQueue,
  RENDER_PRIORITY_WEIGHT,
  type RenderOperation,
  type RenderQueueOptions,
  type RenderPriority,
} from '@lytjs/common-render-queue';

// event-normalizer
export {
  EventNormalizer,
  type ParsedModifiers,
  type ParsedEventInfo,
  type EventInvoker,
  type EventListenerEntry,
} from '@lytjs/common-event-normalizer';

// node-cache
export {
  NodeCache,
  type VNode as NC_VNode,
  type ComponentInstance as NC_ComponentInstance,
  type EventListenerEntry as NC_EventListenerEntry,
  type ResourceEntry,
  type NodeCacheOptions,
} from '@lytjs/common-node-cache';

// async-scheduler
export {
  AsyncScheduler,
  type SchedulerJob,
  type SchedulerPriority,
  type AsyncSchedulerOptions,
} from '@lytjs/common-async-scheduler';

// transition-engine
export {
  TransitionEngine,
  type RuntimeTransitionState,
  type FLIPRecord,
  type ResolvedTransitionClasses,
  type TransitionEngineOptions,
  type TransitionProps,
} from '@lytjs/common-transition-engine';

// performance
export {
  PerformanceMonitor,
  getPerformanceMonitor,
  setPerformanceMonitor,
  initPerformanceMonitor,
  startRenderTiming,
  recordRenderEntry,
  getComponentStats,
  generatePerformanceReport,
  isPerformanceMonitoringEnabled,
  setPerformanceMonitoringEnabled,
  withPerformanceTracking,
  connectToDevTools,
  type RenderPerformanceEntry,
  type ComponentPerformanceStats,
  type PerformanceMonitorOptions,
  type PerformanceReport,
} from '@lytjs/common-performance';
