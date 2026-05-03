/**
 * @lytjs/renderer - Event Invoker Caching
 * 事件缓存 Invoker 模式：通过 el._vei 缓存事件处理函数，
 * 更新时仅替换 invoker.value，无需重新 addEventListener。
 */

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
  value: Function | null;
}

// ============================================================
// Constants
// ============================================================

/** el._vei 缓存 key */
const VEI_KEY = '_vei';

/** 事件修饰符匹配正则（支持多个修饰符） */
const EVENT_MODIFIER_RE = /\.(stop|prevent|capture|once|self|passive)(?=\.|$)/g;

// ============================================================
// Event Name Normalization
// ============================================================

/**
 * 将各种格式的事件名规范化为标准 DOM 事件名。
 * 支持格式：@click / onClick / click → click
 */
export function normalizeEventName(rawName: string): string {
  // 移除 @ 前缀
  let name = rawName.startsWith('@') ? rawName.slice(1) : rawName;
  // 移除 on 前缀（仅当以大写字母开头的 on 前缀时）
  if (name.startsWith('on') && name.length > 2 && name[2]! === name[2]!.toUpperCase()) {
    name = name.slice(2);
  }
  // 移除修饰符后缀（如 .stop.prevent）
  name = name.replace(EVENT_MODIFIER_RE, '');
  // 转为小写
  return name.toLowerCase();
}

/**
 * 将事件名转换为 invoker 缓存的 key。
 * click → onClick，mouseenter → onMouseenter
 */
export function getEventKey(rawName: string): string {
  const name = normalizeEventName(rawName);
  return 'on' + name[0]!.toUpperCase() + name.slice(1);
}

// ============================================================
// Event Modifier Parsing
// ============================================================

/**
 * 解析事件名中的修饰符。
 * 例如：onClick.stop.prevent → { name: 'click', stop: true, prevent: true, ... }
 */
export function parseEventModifier(rawName: string): ParsedEvent {
  const name = normalizeEventName(rawName);
  const parsed: ParsedEvent = {
    name,
    stop: false,
    prevent: false,
    capture: false,
    once: false,
    self: false,
    passive: false,
  };

  // 匹配所有修饰符
  const modifierMatch = rawName.match(/\.(stop|prevent|capture|once|self|passive)/g);
  if (modifierMatch) {
    for (const mod of modifierMatch) {
      switch (mod) {
        case '.stop':
          parsed.stop = true;
          break;
        case '.prevent':
          parsed.prevent = true;
          break;
        case '.capture':
          parsed.capture = true;
          break;
        case '.once':
          parsed.once = true;
          break;
        case '.self':
          parsed.self = true;
          break;
        case '.passive':
          parsed.passive = true;
          break;
      }
    }
  }

  return parsed;
}

// ============================================================
// Invoker Creation
// ============================================================

/**
 * 创建事件 invoker 函数。
 * invoker 是一个持有 value 属性的闭包，调用时执行 invoker.value(event)。
 */
export function createInvoker(initialValue: Function): EventInvoker {
  const invoker = ((e: Event) => {
    // 处理修饰符
    const parsed = (invoker as any)._parsed as ParsedEvent | undefined;
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
  nextValue: Function | null,
  _prevValue?: Function | null,
  _instance?: any,
): void {
  // 兼容现有 common-events 的对象格式 { handler, capture, ... }
  const actualNextValue = extractHandler(nextValue);

  const eventKey = getEventKey(rawName);
  const parsed = parseEventModifier(rawName);

  // 获取或创建 el._vei 缓存
  let invokers = (el as any)[VEI_KEY];
  if (!invokers) {
    invokers = (el as any)[VEI_KEY] = {};
  }

  const existingInvoker = invokers[eventKey] as EventInvoker | undefined;

  if (actualNextValue && existingInvoker) {
    // 情况 1：有新值 + 有旧 invoker → 直接替换 value
    existingInvoker.value = actualNextValue;
  } else if (actualNextValue && !existingInvoker) {
    // 情况 2：有新值 + 无旧 invoker → 创建并绑定
    const invoker = createInvoker(actualNextValue);
    (invoker as any)._parsed = parsed;
    invokers[eventKey] = invoker;

    // 构建 AddEventListenerOptions
    const options: AddEventListenerOptions | boolean | undefined = buildEventListenerOptions(parsed);
    el.addEventListener(parsed.name, invoker, options);
  } else if (!actualNextValue && existingInvoker) {
    // 情况 3：无新值 + 有旧 invoker → 移除
    el.removeEventListener(parsed.name, existingInvoker);
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
  const invokers = (el as any)[VEI_KEY];
  if (!invokers) return;

  for (const eventKey in invokers) {
    const invoker = invokers[eventKey] as EventInvoker | undefined;
    if (invoker) {
      const parsed = (invoker as any)._parsed as ParsedEvent | undefined;
      const eventName = parsed?.name ?? normalizeEventName(eventKey);
      el.removeEventListener(eventName, invoker);
    }
  }

  delete (el as any)[VEI_KEY];
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * 从值中提取事件处理函数。
 * 兼容直接函数和 { handler, capture, ... } 对象格式。
 */
function extractHandler(value: Function | null): Function | null {
  if (typeof value === 'function') return value;
  if (value != null && typeof value === 'object' && 'handler' in value) {
    return (value as any).handler as Function;
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
