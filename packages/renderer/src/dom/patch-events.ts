/**
 * Lyt.js 渲染器 — 事件系统
 *
 * 本模块实现了渲染器的事件处理系统，包括：
 *   1. 事件名规范化（@click → onclick, onClick → click）
 *   2. 事件修饰符解析与处理（.stop, .prevent, .capture, .once, .self, .passive）
 *   3. 事件缓存 invoker 模式 —— 每个元素一个事件 handler 对象
 *
 * 设计思路：
 *   - 每个元素维护一个 el._vei（VNode Event Invoker）对象
 *   - key 为事件名（如 'onClick'），value 为 invoker 函数
 *   - invoker 函数内部调用实际的事件处理函数
 *   - 更新事件时只需替换 invoker.value，无需重新 addEventListener
 */

/* ================================================================
 *  类型定义
 * ================================================================ */

/**
 * 事件修饰符解析结果
 */
export interface ParsedEvent {
  /** 原始事件名（如 'click', 'input'） */
  name: string
  /** 是否需要 stopPropagation */
  stop: boolean
  /** 是否需要 preventDefault */
  prevent: boolean
  /** 是否使用捕获模式 */
  capture: boolean
  /** 是否只触发一次 */
  once: boolean
  /** 是否只在 event.target === el 时触发 */
  self: boolean
  /** 是否使用 passive 模式 */
  passive: boolean
}

/**
 * 事件 Invoker 接口
 *
 * invoker 是一个函数，内部持有对实际事件处理函数的引用。
 * 更新事件时只需修改 invoker.value，无需重新绑定 DOM 事件。
 */
export interface EventInvoker extends EventListener {
  /** 实际的事件处理函数 */
  value: Function | null
}

/* ================================================================
 *  事件名规范化
 * ================================================================ */

/**
 * 事件名前缀映射表
 * 用于将 @ 或 on 前缀的事件名转换为标准事件名
 */
const EVENT_PREFIX_RE = /^(?:@|on)/;

/**
 * 规范化事件名
 *
 * 将各种形式的事件名统一转换为标准格式：
 *   - @click → click
 *   - onClick → click
 *   - click → click
 *   - @click.stop → click（修饰符在 parseEventModifier 中处理）
 *
 * @param rawName 原始事件名
 * @returns 标准事件名（小写）
 */
export function normalizeEventName(rawName: string): string {
  return rawName.replace(EVENT_PREFIX_RE, '').toLowerCase();
}

/**
 * 将事件名转换为 invoker 的 key 格式
 *
 * 规则：
 *   - 事件名首字母大写，前面加 'on'
 *   - 例如：click → onClick, mouseenter → onMouseenter
 *   - 这样做是为了与 Vue 3 的 props 事件命名保持一致
 *
 * @param rawName 原始事件名（可能带 @ 或 on 前缀）
 * @returns invoker key（如 'onClick'）
 */
export function getEventKey(rawName: string): string {
  const name = normalizeEventName(rawName);
  return 'on' + name.charAt(0).toUpperCase() + name.slice(1);
}

/* ================================================================
 *  事件修饰符解析
 * ================================================================ */

/**
 * 修饰符名称到属性名的映射
 */
const MODIFIER_MAP: Record<string, 'stop' | 'prevent' | 'capture' | 'once' | 'self' | 'passive'> = {
  stop: 'stop',
  prevent: 'prevent',
  capture: 'capture',
  once: 'once',
  self: 'self',
  passive: 'passive',
};

/**
 * 解析事件修饰符
 *
 * 从事件名中提取修饰符，例如：
 *   - 'click.stop.prevent' → { name: 'click', stop: true, prevent: true }
 *   - 'input.once' → { name: 'input', once: true }
 *   - 'keydown.enter' → { name: 'keydown.enter' }（enter 不是标准修饰符，保留在 name 中）
 *
 * @param rawEvent 原始事件名（可能包含修饰符）
 * @returns 解析后的结果
 */
export function parseEventModifier(rawEvent: string): ParsedEvent {
  const parts = rawEvent.split('.');
  const name = parts[0];

  const result: ParsedEvent = {
    name,
    stop: false,
    prevent: false,
    capture: false,
    once: false,
    self: false,
    passive: false,
  };

  // 遍历修饰符部分
  for (let i = 1; i < parts.length; i++) {
    const modifier = parts[i];
    const key = MODIFIER_MAP[modifier];
    if (key) {
      result[key] = true;
    }
    // 不认识的修饰符忽略（如按键修饰符 .enter, .esc 等由运行时处理）
  }

  return result;
}

/* ================================================================
 *  事件 Invoker 创建
 * ================================================================ */

/**
 * 创建事件 invoker 函数
 *
 * invoker 是一个包装函数，它在被 DOM 事件触发时调用内部的 value 函数。
 * 通过替换 invoker.value 可以更新事件处理逻辑，而无需重新绑定 DOM 事件。
 *
 * @param initialValue 初始的事件处理函数
 * @returns invoker 函数（同时满足 EventListener 接口）
 */
export function createInvoker(initialValue: Function): EventInvoker {
  const invoker = ((e: Event) => {
    // invoker.value 是实际的事件处理函数
    if (invoker.value) {
      invoker.value(e);
    }
  }) as EventInvoker;

  invoker.value = initialValue;

  return invoker;
}

/* ================================================================
 *  事件绑定与更新
 * ================================================================ */

/**
 * 元素上的事件 invoker 存储键名
 */
const VEI_KEY = '_vei';

/**
 * 获取元素上的事件 invoker 对象
 *
 * @param el DOM 元素
 * @returns invoker 对象，如果不存在则返回 null
 */
export function getEventInvokers(el: Element): Record<string, EventInvoker> | null {
  return (el as any)[VEI_KEY] || null;
}

/**
 * 更新元素上的事件监听
 *
 * 使用 invoker 缓存模式：
 *   1. 如果元素没有 invoker 对象，创建一个
 *   2. 如果 invoker 已存在且新值不为空，直接替换 invoker.value
 *   3. 如果 invoker 已存在但新值为空，移除事件监听
 *   4. 如果 invoker 不存在且新值不为空，创建 invoker 并添加事件监听
 *
 * @param el         DOM 元素
 * @param rawName    原始事件名（如 'onClick', '@click'）
 * @param nextValue  新的事件处理函数（null 表示移除）
 * @param prevValue  旧的事件处理函数（可选）
 * @param instance   组件实例（可选，用于事件作用域）
 */
export function patchEvent(
  el: Element,
  rawName: string,
  nextValue: Function | null,
  _prevValue?: Function | null,
  _instance?: unknown
): void {
  // 获取 invoker key
  const eventKey = getEventKey(rawName);

  // 解析事件名和修饰符
  const parsed = parseEventModifier(normalizeEventName(rawName));
  const eventName = parsed.name;

  // 获取或创建元素上的 invoker 对象
  let invokers = el[VEI_KEY];
  if (!invokers) {
    invokers = el[VEI_KEY] = {};
  }

  // 获取已存在的 invoker
  const existingInvoker = invokers[eventKey] as EventInvoker | undefined;

  if (nextValue && existingInvoker) {
    // 情况 1：invoker 已存在，新值不为空 → 直接替换 value
    existingInvoker.value = nextValue;
  } else if (nextValue && !existingInvoker) {
    // 情况 2：invoker 不存在，新值不为空 → 创建 invoker 并绑定事件
    const invoker = createInvoker(nextValue);
    invokers[eventKey] = invoker;

    // 构建 addEventListener 的选项
    const options: AddEventListenerOptions = {};

    if (parsed.capture) {
      options.capture = true;
    }
    if (parsed.once) {
      options.once = true;
    }
    if (parsed.passive) {
      options.passive = true;
    }

    // 绑定事件
    el.addEventListener(eventName, invoker, options);
  } else if (!nextValue && existingInvoker) {
    // 情况 3：invoker 已存在，新值为空 → 移除事件监听
    el.removeEventListener(eventName, existingInvoker);
    invokers[eventKey] = undefined;
  }
}

/**
 * 移除元素上的所有事件监听
 *
 * 遍历元素上的 invoker 对象，移除所有已绑定的事件。
 * 通常在元素卸载时调用。
 *
 * @param el DOM 元素
 */
export function removeAllEventListeners(el: any): void {
  const invokers = el[VEI_KEY];
  if (!invokers) return;

  for (const key in invokers) {
    const invoker = invokers[key] as EventInvoker | undefined;
    if (invoker) {
      // 从 key 中提取事件名（去掉 'on' 前缀）
      const eventName = key.charAt(2).toLowerCase() + key.slice(3);
      el.removeEventListener(eventName, invoker);
    }
  }

  // 清空 invoker 对象
  el[VEI_KEY] = {};
}
