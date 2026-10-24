// src/events.ts
// @lytjs/dom-runtime - 事件委托机制
// 通过事件委托减少事件监听器数量，提升性能

// ==================== 事件委托管理器 ====================

interface EventHandler {
  selector: string;
  handler: (event: Event, target: Element) => void;
}

/**
 * 单个事件类型的委托条目。
 *
 * ★ 2026-10-24：此前用 `{[eventType: string]: EventHandler[]}` 存 handler，
 *   再把原生监听器塞进同一个对象的 `_nativeHandler` 字段 —— 于是**每个元素只有一个
 *   原生监听器**，且它闭包里写死了「第一次注册时的事件类型」：
 *   ```ts
 *   if (!events) { … element.addEventListener(eventType, nativeHandler); events._nativeHandler = … }
 *   ```
 *   ⇒ 同一容器注册第二种事件类型时（`delegateEventBatch` 的文档示例就是
 *   `click` + `input` + `click`），`events` 已存在 ⇒ **不挂新监听**
 *   ⇒ 第二种事件**永远不触发**。
 *   现在按事件类型各存一条（handler 列表 + 自己的原生监听器）。
 */
interface DelegatedEntry {
  handlers: EventHandler[];
  nativeHandler: (nativeEvent: Event) => void;
}

type DelegatedEvents = Record<string, DelegatedEntry>;

const delegatedEventsMap = new WeakMap<Element, DelegatedEvents>();

/**
 * 为元素注册事件委托
 * 多个相同类型的事件处理函数可以合并到同一个监听器
 *
 * @param element - 要绑定事件的元素
 * @param eventType - 事件类型（click, input, etc.）
 * @param selector - CSS 选择器，用于匹配触发事件的子元素
 * @param handler - 事件处理函数
 * @returns 取消注册函数
 *
 * @example
 * ```ts
 * const unregister = delegateEvent(container, 'click', 'button', (e, target) => {
 *   console.log('Button clicked:', target.dataset.id);
 * });
 * // later: unregister();
 * ```
 */
export function delegateEvent(
  element: Element,
  eventType: string,
  selector: string,
  handler: (event: Event, target: Element) => void,
): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  let events = delegatedEventsMap.get(element);
  if (!events) {
    events = {};
    delegatedEventsMap.set(element, events);
  }

  let entry = events[eventType];

  if (!entry) {
    const nativeHandler = (nativeEvent: Event) => {
      const current = delegatedEventsMap.get(element)?.[eventType];
      if (!current) return;

      const target = nativeEvent.target as Element | null;

      // 遍历**快照**：handler 在派发过程中注销自己时，不应影响本轮其它 handler
      for (const { selector: sel, handler: h } of [...current.handlers]) {
        let matched: Element | null;
        if (sel === '') {
          matched = element;
        } else if (target && typeof target.closest === 'function') {
          matched = target.closest(sel);
        } else {
          matched = null;
        }
        if (matched) {
          h(nativeEvent, matched);
        }
      }
    };

    element.addEventListener(eventType, nativeHandler);
    entry = { handlers: [], nativeHandler };
    events[eventType] = entry;
  }

  entry.handlers.push({ selector, handler });

  return () => {
    const currentEvents = delegatedEventsMap.get(element);
    const currentEntry = currentEvents?.[eventType];
    if (!currentEvents || !currentEntry) return;

    const index = currentEntry.handlers.findIndex(
      (h) => h.selector === selector && h.handler === handler,
    );
    if (index !== -1) {
      currentEntry.handlers.splice(index, 1);
    }

    if (currentEntry.handlers.length === 0) {
      element.removeEventListener(eventType, currentEntry.nativeHandler);
      delete currentEvents[eventType];

      if (Object.keys(currentEvents).length === 0) {
        delegatedEventsMap.delete(element);
      }
    }
  };
}

/**
 * 批量注册事件委托
 * 减少重复的监听器设置
 *
 * @param element - 要绑定事件的元素
 * @param events - 事件配置数组
 * @returns 取消注册所有事件的函数
 *
 * @example
 * ```ts
 * const unregisterAll = delegateEventBatch(container, [
 *   { eventType: 'click', selector: 'button.add', handler: handleAdd },
 *   { eventType: 'click', selector: 'button.delete', handler: handleDelete },
 *   { eventType: 'input', selector: 'input.search', handler: handleSearch },
 * ]);
 * // later: unregisterAll();
 * ```
 */
export function delegateEventBatch(
  element: Element,
  events: Array<{
    eventType: string;
    selector: string;
    handler: (event: Event, target: Element) => void;
  }>,
): () => void {
  const unregisters = events.map(({ eventType, selector, handler }) =>
    delegateEvent(element, eventType, selector, handler),
  );

  return () => {
    unregisters.forEach((unregister) => unregister());
  };
}

/**
 * 阻止事件冒泡的便捷函数
 */
export function stopPropagation(event: Event): void {
  event.stopPropagation();
}

/**
 * 阻止默认行为的便捷函数
 */
export function preventDefault(event: Event): void {
  event.preventDefault();
}

/**
 * 同时阻止冒泡和默认行为
 */
export function stopEvent(event: Event): void {
  event.stopPropagation();
  event.preventDefault();
}

// ==================== 事件类型定义 ====================

export type EventType =
  | 'click'
  | 'input'
  | 'change'
  | 'submit'
  | 'keydown'
  | 'keyup'
  | 'keypress'
  | 'focus'
  | 'blur'
  | 'scroll'
  | 'resize'
  | 'mouseenter'
  | 'mouseleave'
  | 'mouseover'
  | 'mouseout'
  | 'touchstart'
  | 'touchmove'
  | 'touchend';

/**
 * 常见事件类型列表，用于类型检查
 */
export const COMMON_EVENTS: EventType[] = [
  'click',
  'input',
  'change',
  'submit',
  'keydown',
  'keyup',
  'keypress',
  'focus',
  'blur',
  'scroll',
  'resize',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'touchstart',
  'touchmove',
  'touchend',
];

/**
 * 检查字符串是否为有效的事件类型
 */
export function isValidEventType(type: string): type is EventType {
  return COMMON_EVENTS.includes(type as EventType);
}
