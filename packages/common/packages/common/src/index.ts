/**
 * @lytjs/common
 * 聚合包 - re-export 所有子包
 */

// env
export {
  isBrowser,
  isNode,
  isSSR,
  getEnvInfo,
  type EnvInfo,
} from '@lytjs/common-env'

// is
export {
  NOOP,
  EMPTY_OBJ,
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
} from '@lytjs/common-is'

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
} from '@lytjs/common-string'

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
} from '@lytjs/common-path'

// events
export {
  EventEmitter,
  SubscriptionManager,
  TopicSubscriptionManager,
} from '@lytjs/common-events'

// cache
export {
  LRUCache,
  memoize,
  ExpiringCache,
} from '@lytjs/common-cache'

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
} from '@lytjs/common-timing'

// algorithm
export { getSequence } from '@lytjs/common-algorithm'

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
} from '@lytjs/common-vnode'

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
} from '@lytjs/common-error'

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
  type ObjectDiff,
} from '@lytjs/common-object'

// scheduler
export {
  queueJob,
  queuePostFlushCb,
  nextTick,
  flushJobs,
  flushSync,
  hasPendingJobs,
  getPendingJobCount,
  resetSchedulerState,
  type SchedulerJob,
} from '@lytjs/common-scheduler'
