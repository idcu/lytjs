/**
 * @lytjs/adapter-web - Event Invoker Caching with Pooling
 * 事件缓存 Invoker 模式：通过 el._vei 缓存事件处理函数，
 * 更新时仅替换 invoker.value，无需重新 addEventListener。
 *
 * FIX: P1-12 DOM-NEW-01 - 实现事件监听器池化，复用事件监听器对象
 * 通过对象池复用 invoker 对象，减少内存分配和垃圾回收压力
 */

import {
  getEventKey,
  normalizeEventName,
  parseEventModifier,
  isEventModifierIntercepted,
  type ParsedEventModifier,
} from '@lytjs/common-events';

// ============================================================
// Types
// ============================================================

/**
 * 事件修饰符解析结果（2026-11-07 / S08：定义收敛到 `@lytjs/common-events`）。
 */
export type ParsedEvent = ParsedEventModifier;

/** 事件 invoker 函数，持有 value 属性用于更新 */
export interface EventInvoker extends EventListener {
  /** 当前绑定的事件处理函数，更新时直接替换此属性 */
  value: ((...args: unknown[]) => void) | null;
  /** @internal 解析后的事件修饰符 */
  _parsed?: ParsedEvent;
  /**
   * @internal 实际传给 addEventListener 的选项。
   *
   * ⚠️ 2026-11-03：`once` / `capture` / `passive` 有两个来源（prop 名的修饰符 +
   *   值对象 `{ handler, once: true }`），只看 `_parsed` 会漏掉值对象那一半 ——
   *   于是 `{once:true}` 改成 `{handler}` 时以为「没变」，监听却早已被浏览器摘掉。
   */
  _options?: { capture: boolean; once: boolean; passive: boolean };
}

// ============================================================
// 常量
// ============================================================

/** el._vei 缓存类型 */
type InvokerCache = Record<string, EventInvoker | undefined>;

// FIX: P1-24 - 使用 WeakMap 替代 el._vei 属性存储，避免污染 DOM 元素
/** 事件 invoker 缓存 WeakMap，以 Element 为 key */
const veiCache = new WeakMap<Element, InvokerCache>();

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
 * FIX: P2-v11-33 完善重置逻辑，清除所有可变状态确保复用时不会残留旧数据
 */
function releaseInvoker(invoker: EventInvoker): void {
  if (invokerPool.length < INVOKER_POOL_MAX_SIZE) {
    // 重置 invoker 状态：清除 value、_parsed 和闭包捕获的上下文
    invoker.value = null;
    invoker._parsed = undefined;
    invoker._options = undefined;
    // FIX: P2-v11-33 断开 invoker 闭包中可能引用的 DOM 元素，
    // 避免通过池化对象意外访问已卸载的元素
    // 注意：invoker 本身是一个函数（EventListener），其闭包引用了 parsed 和 currentValue，
    // 已通过 value = null 和 _parsed = undefined 清除
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
// 调用器创建
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
    // 2026-11-07（S08）：修饰符语义共用 common-events 的单一判定函数。
    const modifierNames = invoker._parsed?.modifierNames;
    if (modifierNames && modifierNames.length > 0) {
      if (isEventModifierIntercepted(e, modifierNames)) return;
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
  const fromValueOptions = extractEventOptions(nextValue);

  // FIX: P1-24 - 获取或创建 WeakMap 缓存
  let invokers = veiCache.get(el);
  if (!invokers) {
    invokers = {};
    veiCache.set(el, invokers);
  }

  const existingInvoker = invokers[eventKey] as EventInvoker | undefined;
  const nextOptions = {
    capture: parsed.capture || fromValueOptions.capture,
    once: parsed.once || fromValueOptions.once,
    passive: parsed.passive || fromValueOptions.passive,
  };

  /**
   * 是否需要**重新绑定**（而不是只换 value）。
   *
   * ⚠️ 2026-11-03 修（P1）：此前只要 key 相同就只换 `value` —— 于是
   *   ① 修饰符从 `@click` 变成 `@click.stop` / 加 `.capture` 后**不生效**；
   *   ② `.once` 触发后监听已被浏览器摘掉，但缓存里还留着 invoker ⇒
   *      下一次更新只换 value，**再也不会触发**（点击彻底失效）。
   */
  const existingOptions = existingInvoker?._options ?? {
    capture: Boolean(existingInvoker?._parsed?.capture),
    once: Boolean(existingInvoker?._parsed?.once),
    passive: Boolean(existingInvoker?._parsed?.passive),
  };

  const needsRebind =
    existingInvoker !== undefined &&
    (existingInvoker._parsed === undefined ||
      existingInvoker._parsed.name !== parsed.name ||
      existingOptions.capture !== nextOptions.capture ||
      existingOptions.passive !== nextOptions.passive ||
      existingOptions.once !== nextOptions.once ||
      // `.once` 的监听可能已被消费掉：更新 handler 时重新武装
      nextOptions.once);

  if (actualNextValue && existingInvoker && !needsRebind) {
    // 情况 1：有新值 + 旧 invoker 且绑定参数没变 → 直接替换 value
    // （stop / prevent / self 是**调用时**读取的，更新 _parsed 即可生效）
    existingInvoker.value = actualNextValue;
    existingInvoker._parsed = parsed;
  } else if (actualNextValue && existingInvoker) {
    // 情况 1b：绑定参数变了 → 先摘旧的再绑新的
    const removeOptions = existingInvoker._options
      ? buildEventListenerOptions(existingInvoker._parsed ?? parsed, existingInvoker._options)
      : buildEventListenerOptions(existingInvoker._parsed ?? parsed);
    el.removeEventListener(
      existingInvoker._parsed?.name ?? parsed.name,
      existingInvoker,
      removeOptions,
    );
    releaseInvoker(existingInvoker);
    invokers[eventKey] = undefined;

    const invoker = createInvoker(actualNextValue);
    invoker._parsed = parsed;
    invoker._options = nextOptions;
    invokers[eventKey] = invoker;
    el.addEventListener(parsed.name, invoker, buildEventListenerOptions(parsed, fromValueOptions));
  } else if (actualNextValue && !existingInvoker) {
    // 情况 2：有新值 + 无旧 invoker → 创建并绑定
    const invoker = createInvoker(actualNextValue);
    invoker._parsed = parsed;
    invoker._options = nextOptions;
    invokers[eventKey] = invoker;

    el.addEventListener(parsed.name, invoker, buildEventListenerOptions(parsed, fromValueOptions));
  } else if (!actualNextValue && existingInvoker) {
    // 情况 3：无新值 + 有旧 invoker → 移除
    // FIX: P2-v11-34 传递完整的 options 对象给 removeEventListener，
    // 确保与 addEventListener 时使用的 options 一致，否则无法正确移除监听器
    // FIX: P1-3 使用 existingInvoker._parsed 而非重新解析的 parsed，
    // 确保移除时的 options 与绑定时完全一致
    // FIX: DTS build error - existingInvoker._parsed 可能为 undefined
    const removeOptions = buildEventListenerOptions(existingInvoker._parsed!);
    el.removeEventListener(existingInvoker._parsed!.name, existingInvoker, removeOptions);
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
  const invokers = veiCache.get(el);
  if (!invokers) return;

  // FIX: P1-23 - 使用 Object.keys 替代 for...in，避免遍历原型链属性
  for (const eventKey of Object.keys(invokers)) {
    const invoker = invokers[eventKey] as EventInvoker | undefined;
    if (invoker) {
      const parsed = invoker._parsed;
      const eventName = parsed?.name ?? normalizeEventName(eventKey);
      // FIX: P2-v11-34 传递完整的 options，确保与 addEventListener 一致
      const removeOptions = parsed ? buildEventListenerOptions(parsed) : undefined;
      el.removeEventListener(eventName, invoker, removeOptions);
      // FIX: P1-12 - 将 invoker 归还到对象池
      releaseInvoker(invoker);
    }
  }

  // FIX: P1-24 - 使用 WeakMap.delete 替代 delete el._vei
  veiCache.delete(el);
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 从值中提取事件处理函数。
 * 兼容直接函数和 { handler, capture, ... } 对象格式。
 */
function extractHandler(
  value: ((...args: unknown[]) => void) | null,
): ((...args: unknown[]) => void) | null {
  if (typeof value === 'function') return value;
  // FIX: P2-batch2-17 添加类型守卫，确保对象格式的 handler 存在且为函数类型
  if (value != null && typeof value === 'object' && 'handler' in value) {
    const record = value as Record<string, unknown>;
    const handler = record.handler;
    if (typeof handler === 'function') {
      return handler as (...args: unknown[]) => void;
    }
  }
  return null;
}

/**
 * 从值中提取「监听器选项」。
 *
 * 编译器对 `.capture` / `.once` / `.passive` 产出的形态是**值对象**
 * （`{ handler, once: true }`，见 `compiler/src/transforms/transform-element.ts`），
 * 而这三个不是「守卫」（不能放进 `withModifiers`），只能作为 `addEventListener` 的选项。
 *
 * ⚠️ 2026-10-10 修复：此前 `patchEvent` **只从 prop 名**解析选项，
 * 从不读值对象里的 `once/capture/passive` ⇒ 这三个修饰符被**静默丢弃**
 * （`@click.once` 会重复触发，且不报错）。
 */
function extractEventOptions(value: unknown): {
  capture: boolean;
  once: boolean;
  passive: boolean;
} {
  const out = { capture: false, once: false, passive: false };
  if (value != null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.capture === true) out.capture = true;
    if (record.once === true) out.once = true;
    if (record.passive === true) out.passive = true;
  }
  return out;
}

/**
 * 根据 ParsedEvent 构建 AddEventListenerOptions。
 *
 * 选项来源有两处，取**并集**：
 * - `parsed`：从 prop 名解析出的修饰符（历史路径）；
 * - `fromValue`：编译器产出的值对象 `{ handler, once: true }`（VNode 路径主形态）。
 */
function buildEventListenerOptions(
  parsed: ParsedEvent,
  fromValue?: { capture: boolean; once: boolean; passive: boolean },
): AddEventListenerOptions | undefined {
  const capture = parsed.capture || Boolean(fromValue?.capture);
  const once = parsed.once || Boolean(fromValue?.once);
  const passive = parsed.passive || Boolean(fromValue?.passive);

  if (capture || once || passive) {
    const options: AddEventListenerOptions = {};
    if (capture) options.capture = true;
    if (once) options.once = true;
    if (passive) options.passive = true;
    return options;
  }
  return undefined;
}
