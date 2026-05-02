/**
 * @lytjs/common
 * 聚合包 - re-export 所有子包
 */

// env
export { isBrowser, isNode, isSSR, getEnvInfo, type EnvInfo } from '@lytjs/common-env';

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
  type SchedulerJob,
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
