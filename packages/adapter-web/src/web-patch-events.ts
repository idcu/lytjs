/**
 * @lytjs/adapter-web - Event Invoker Caching
 * 事件缓存 Invoker 模式：通过 el._vei 缓存事件处理函数，
 * 更新时仅替换 invoker.value，无需重新 addEventListener。
 *
 * 从 @lytjs/renderer/src/dom/patch-events.ts 迁移，纯翻译，不做额外归一化。
 *
 * TODO (P2-12): 未来优化方向 - 事件委托（Event Delegation）
 * 当前每个元素独立绑定事件监听器。对于大量同类元素（如列表项），
 * 可以在根容器上使用事件委托，通过 event.target 冒泡机制统一处理，
 * 减少事件监听器数量，降低内存占用并提升初始化性能。
 * 实现时需注意：
 * 1. 事件修饰符（.stop, .prevent, .capture, .self, .once）的委托语义
 * 2. 动态添加/移除元素时委托的自动生效与清理
 * 3. 与现有 invoker 缓存机制的兼容
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

// ============================================================
// Invoker Creation
// ============================================================

/**
 * 创建事件 invoker 函数。
 * invoker 是一个持有 value 属性的闭包，调用时执行 invoker.value(event)。
 */
export function createInvoker(initialValue: (...args: unknown[]) => void): EventInvoker {
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
