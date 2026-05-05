/**
 * @lytjs/adapter-web - Event Invoker Caching with Pooling
 * 事件缓存 Invoker 模式：通过 el._vei 缓存事件处理函数，
 * 更新时仅替换 invoker.value，无需重新 addEventListener。
 *
 * FIX: P1-12 DOM-NEW-01 - 实现事件监听器池化，复用事件监听器对象
 * 通过对象池复用 invoker 对象，减少内存分配和垃圾回收压力
 */

import {
  VEI_KEY,
  normalizeEventName,
  getEventKey,
  parseEventModifier,
} from '@lytjs/common-events';

// ============================================================
// Types
// ============================================================

/** 事件修饰符解析结果 */
export interface ParsedEvent {
  /** 规范化后的事件名，如 'click' */
  name: string;
  /** 是否调用 e.stopPropagation() */
  stop: boolean;
  /** 是否调用 e.preventDefault() */
  prevent: boolean;
  /** 是否使用 capture 模式 */
  capture: boolean;
  /** 是否使用 once 模式 */
  once: boolean;
  /** 是否仅在 e.target === el 时触发 */
  self: boolean;
  /** 是否使用 passive 模式 */
  passive: boolean;
}

/** 事件 invoker 函数，持有 value 属性用于更新 */
export interface EventInvoker extends EventListener {
  /** 当前绑定的事件处理函数，更新时直接替换此属性 */
  value: ((...args: unknown[]) => void) | null;
  /** @internal 解析后的事件修饰符 */
  _parsed?: ParsedEvent;
}

// ============================================================
// Constants
// ============================================================

/** el._vei 缓存类型 */
type InvokerCache = Record<string, EventInvoker | undefined>;

// FIX: P1-12 DOM-NEW-01 - 事件监听器池化配置
/** 对象池最大容量 */
const INVOKER_POOL_MAX_SIZE = 100;
/** 对象池 */
const invokerPool: EventInvoker[] = [];
/** 池化对象使用计数（用于调试） */
let poolHitCount = 0;
let poolMissCount = 0;

// ============================================================
// Invoker Pool Management
// ============================================================

/**
 * 从对象池获取一个 invoker 对象
 * FIX: P1-12 DOM-NEW-01 - 事件监听器池化
 */
function acquireInvoker(): EventInvoker | null {
  if (invokerPool.length > 0) {
    poolHitCount++;
    return invokerPool.pop()!;
  }
  poolMissCount++;
  return null;
}

/**
 * 将 invoker 对象归还到对象池
 * FIX: P1-12 DOM-NEW-01 - 事件监听器池化
 */
function releaseInvoker(invoker: EventInvoker): void {
  if (invokerPool.length < INVOKER_POOL_MAX_SIZE) {
    // 重置 invoker 状态
    invoker.value = null;
    invoker._parsed = undefined;
    invokerPool.push(invoker);
  }
}

/**
 * 获取池化统计信息（用于调试）
 * FIX: P1-12 DOM-NEW-01
 */
export function getInvokerPoolStats(): { hit: number; miss: number; size: number } {
  return {
    hit: poolHitCount,
    miss: poolMissCount,
    size: invokerPool.length,
  };
}

/**
 * 重置池化统计信息
 * FIX: P1-12 DOM-NEW-01
 */
export function resetInvokerPoolStats(): void {
  poolHitCount = 0;
  poolMissCount = 0;
}

// ============================================================
// Invoker Creation
// ============================================================

/**
 * 创建事件 invoker 函数。
 * invoker 是一个持有 value 属性的闭包，调用时执行 invoker.value(event)。
 * FIX: P1-12 DOM-NEW-01 - 优先从对象池获取 invoker 对象
 */
export function createInvoker(initialValue: (...args: unknown[]) => void): EventInvoker {
  // 尝试从对象池获取
  const pooled = acquireInvoker();
  if (pooled) {
    pooled.value = initialValue;
    return pooled;
  }

  // 创建新的 invoker
  const invoker = ((e: Event) => {
    // 处理修饰符
    const parsed = invoker._parsed;
    if (parsed) {
      if (parsed.stop) e.stopPropagation();
      if (parsed.prevent) e.preventDefault();
      if (parsed.self && e.target !== e.currentTarget) return;
    }
    if (invoker.value) {
      invoker.value(e);
    }
  }) as EventInvoker;
  invoker.value = initialValue;
  return invoker;
}

// ============================================================
// patchEvent — 核心事件更新函数
// ============================================================

/**
 * 更新元素上的事件监听。
 *
 * 四种情况：
 * 1. nextValue && existingInvoker → 直接替换 invoker.value（O(1) 赋值）
 * 2. nextValue && !existingInvoker → 创建 invoker，addEventListener
 * 3. !nextValue && existingInvoker → removeEventListener，清除缓存
 * 4. !nextValue && !existingInvoker → 无操作
 */
export function patchEvent(
  el: Element,
  rawName: string,
  nextValue: ((...args: unknown[]) => void) | null,
  _prevValue?: ((...args: unknown[]) => void) | null,
): void {
  // 兼容现有 common-events 的对象格式 { handler, capture, ... }
  const actualNextValue = extractHandler(nextValue);

  const eventKey = getEventKey(normalizeEventName(rawName));
  const parsed = parseEventModifier(rawName);

  // 获取或创建 el._vei 缓存
  let invokers = (el as unknown as Record<string, InvokerCache>)[VEI_KEY];
  if (!invokers) {
    invokers = (el as unknown as Record<string, InvokerCache>)[VEI_KEY] = {};
  }

  const existingInvoker = invokers[eventKey] as EventInvoker | undefined;

  if (actualNextValue && existingInvoker) {
    // 情况 1：有新值 + 有旧 invoker → 直接替换 value
    existingInvoker.value = actualNextValue;
  } else if (actualNextValue && !existingInvoker) {
    // 情况 2：有新值 + 无旧 invoker → 创建并绑定
    const invoker = createInvoker(actualNextValue);
    invoker._parsed = parsed;
    invokers[eventKey] = invoker;

    // 构建 AddEventListenerOptions
    const options: AddEventListenerOptions | boolean | undefined =
      buildEventListenerOptions(parsed);
    el.addEventListener(parsed.name, invoker, options);
  } else if (!actualNextValue && existingInvoker) {
    // 情况 3：无新值 + 有旧 invoker → 移除
    el.removeEventListener(
      parsed.name,
      existingInvoker,
      parsed.capture ? { capture: true } : undefined,
    );
    // FIX: P1-12 DOM-NEW-01 - 将 invoker 归还到对象池
    releaseInvoker(existingInvoker);
    invokers[eventKey] = undefined;
  }
  // 情况 4：无新值 + 无旧 invoker → 无操作
}

// ============================================================
// removeAllEventListeners
// ============================================================

/**
 * 移除元素上所有通过 invoker 缓存的事件监听。
 * 用于组件卸载时的清理。
 * FIX: P1-12 DOM-NEW-01 - 将 invoker 对象归还到对象池以复用
 */
export function removeAllEventListeners(el: Element): void {
  const invokers = (el as unknown as Record<string, InvokerCache>)[VEI_KEY];
  if (!invokers) return;

  for (const eventKey in invokers) {
    const invoker = invokers[eventKey] as EventInvoker | undefined;
    if (invoker) {
      const parsed = invoker._parsed;
      const eventName = parsed?.name ?? normalizeEventName(eventKey);
      el.removeEventListener(eventName, invoker, parsed?.capture ? { capture: true } : undefined);
      // FIX: P1-12 - 将 invoker 归还到对象池
      releaseInvoker(invoker);
    }
  }

  delete (el as unknown as Record<string, InvokerCache>)[VEI_KEY];
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * 从值中提取事件处理函数。
 * 兼容直接函数和 { handler, capture, ... } 对象格式。
 */
function extractHandler(
  value: ((...args: unknown[]) => void) | null,
): ((...args: unknown[]) => void) | null {
  if (typeof value === 'function') return value;
  if (value != null && typeof value === 'object' && 'handler' in value) {
    const handler = (value as unknown as Record<string, unknown>).handler;
    return typeof handler === 'function' ? (handler as (...args: unknown[]) => void) : null;
  }
  return null;
}

/**
 * 根据 ParsedEvent 构建 AddEventListenerOptions。
 */
function buildEventListenerOptions(parsed: ParsedEvent): AddEventListenerOptions | undefined {
  if (parsed.capture || parsed.once || parsed.passive) {
    const options: AddEventListenerOptions = {};
    if (parsed.capture) options.capture = true;
    if (parsed.once) options.once = true;
    if (parsed.passive) options.passive = true;
    return options;
  }
  return undefined;
}
