/**
 * @lytjs/common-constants
 * 全局共享常量定义
 * 
 * 此模块集中定义整个框架使用的魔法数字和常量，
 * 避免分散定义导致的维护困难和重复问题。
 */

// ============================================================
// 编译器常量
// ============================================================

/** 编译器输入长度限制，防止极端输入下的性能问题 */
export const COMPILER_MAX_INPUT_LENGTH = 10000;

/** 正则表达式输入长度限制 */
export const COMPILER_MAX_REGEX_INPUT_LENGTH = 5000;

/** 最大属性数量限制，防止无限循环 */
export const COMPILER_MAX_ATTRIBUTES = 1000;

/** 结束标签正则缓存最大大小 */
export const COMPILER_END_TAG_CACHE_MAX_SIZE = 100;

// ============================================================
// VDOM / 渲染器常量
// ============================================================

/** 列表 diff 算法性能保护阈值，超过此值使用简单策略 */
export const VDOM_MAX_LIST_DIFF_SIZE = 1000;

/** 最大递归深度，防止无限循环 */
export const VDOM_MAX_RECURSION_DEPTH = 100;

// ============================================================
// 响应式系统常量
// ============================================================

/** trigger() 调用最大嵌套深度，防止无限响应式循环 */
export const REACTIVITY_MAX_TRIGGER_DEPTH = 100;

/** 最大 effect 追踪深度 */
export const REACTIVITY_MAX_TRACK_DEPTH = 100;

// ============================================================
// 错误处理常量
// ============================================================

/** 已警告消息集合的最大大小，使用 FIFO 策略避免内存无限增长 */
export const ERROR_MAX_WARNED_MESSAGES = 1000;

// ============================================================
// 调度器常量
// ============================================================

/** 调度器最大迭代次数 */
export const SCHEDULER_MAX_ITERATIONS = 1000;

/** 刷新任务最大重试次数 */
export const SCHEDULER_MAX_FLUSH_RETRIES = 3;

// ============================================================
// 缓存常量
// ============================================================

/** 默认 LRU 缓存大小 */
export const CACHE_DEFAULT_LRU_SIZE = 100;

/** 最大缓存条目数 */
export const CACHE_MAX_ENTRIES = 10000;

// ============================================================
// DOM 操作常量
// ============================================================

/** DOM 操作防抖延迟（毫秒） */
export const DOM_DEBOUNCE_DELAY_MS = 16; // ~1 frame at 60fps

/** 最大 DOM 操作批处理大小 */
export const DOM_MAX_BATCH_SIZE = 100;

// ============================================================
// 性能监控常量
// ============================================================

/** 性能监控采样率（0-1） */
export const PERF_MONITOR_SAMPLE_RATE = 0.1;

/** 最大性能条目数 */
export const PERF_MAX_ENTRIES = 1000;

// ============================================================
// 时间常量（毫秒）
// ============================================================

/** 一秒的毫秒数 */
export const MS_PER_SECOND = 1000;

/** 一分钟的毫秒数 */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** 一小时的毫秒数 */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** 一天的毫秒数 */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** 动画帧间隔（约 60fps） */
export const FRAME_INTERVAL_MS = 16.67;

// ============================================================
// HTTP 常量
// ============================================================

/** 默认请求超时时间（毫秒） */
export const HTTP_DEFAULT_TIMEOUT_MS = 10000;

/** 最大重试次数 */
export const HTTP_MAX_RETRIES = 3;

/** 重试延迟基数（毫秒） */
export const HTTP_RETRY_DELAY_MS = 1000;

// ============================================================
// 存储常量
// ============================================================

/** 本地存储版本键前缀 */
export const STORAGE_VERSION_KEY_PREFIX = '__lyt_storage_version__';

/** 默认存储过期时间（毫秒） */
export const STORAGE_DEFAULT_EXPIRY_MS = 7 * MS_PER_DAY; // 7 days

// ============================================================
// 对象操作常量
// ============================================================

/** 深度克隆默认最大深度 */
export const CLONE_DEFAULT_MAX_DEPTH = 20;

/** 危险键列表，用于防止原型污染 */
export const PROTO_POLLUTION_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);

// ============================================================
// 字符串常量
// ============================================================

/** 默认截断后缀 */
export const STRING_DEFAULT_TRUNCATION_OMISSION = '...';

/** 默认 ID 前缀 */
export const STRING_DEFAULT_ID_PREFIX = 'lyt';

// ============================================================
// 数值常量
// ============================================================

/** 浮点数比较精度 */
export const FLOAT_EPSILON = 1e-10;

/** 最大安全整数 */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** 最小安全整数 */
export const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
