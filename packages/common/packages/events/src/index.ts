/**
 * @lytjs/common-events
 * 事件发射器与订阅管理工具
 */

import { isFunction } from '@lytjs/common-is';

export type EventHandler<T extends unknown[] = unknown[]> = (...args: T) => void;

/**
 * Check if a key is an event handler (onXxx)
 */
export function isOn(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

// ============================================================
// 事件缓存 key 与修饰符解析
// ============================================================

/** 事件缓存 key 前缀 */
export const VEI_KEY = '_vei';

/**
 * 已知的**非按键**修饰符；其余修饰符一律按「按键名」解释（与 Vue 一致）。
 *
 * ★ 2026-11-07（S08）：本表是**唯一真源**，`@lytjs/dom-runtime` 等消费方不得再建副本。
 */
export const NON_KEY_MODIFIERS: ReadonlySet<string> = new Set([
  'stop',
  'prevent',
  'self',
  'capture',
  'once',
  'passive',
  'native',
  'exact',
  'left',
  'middle',
  'right',
  'ctrl',
  'shift',
  'alt',
  'meta',
]);

/** 系统修饰键集合（`.ctrl` / `.shift` / `.alt` / `.meta`，`exact` 判定使用）。 */
export const SYSTEM_MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const;

/** Vue 风格按键别名 → `KeyboardEvent.key` 取值。注意 `.left/right` 同时是鼠标键。 */
export const KEY_ALIASES: Record<string, string[]> = {
  enter: ['Enter'],
  tab: ['Tab'],
  delete: ['Delete', 'Backspace'],
  esc: ['Escape'],
  space: [' ', 'Spacebar'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
};

/** 鼠标按键修饰符 → `MouseEvent.button` */
export const MOUSE_BUTTONS: Record<string, number> = { left: 0, middle: 1, right: 2 };

/**
 * 事件修饰符正则（保留导出以兼容旧调用方；完整解析见 `parseEventModifier`）。
 * @deprecated 解析逻辑已改为按 `.` 分段，不依赖该正则。
 */
export const EVENT_MODIFIER_RE = /\.(stop|prevent|capture|once|self|passive)(?=\.|$)/g;

/**
 * 拆分事件名与修饰符后缀。
 *
 * 支持格式：@click / onClick / click → base=click；onClick.stop.enter → base=click、modifiers=[stop, enter]
 *
 * ⚠️ 2026-11-03 修（P1）：此前第三位只要是字母就剥掉 `on` —— 于是原生事件
 * `online` / `onLine` 被规范成 **`line`**，`@online`（网络恢复）永远不会触发。
 * 只在小写 `on` + **大写**字母时才认为是「onXxx」形式（`onClick` / `onMouseenter`）。
 */
export function splitEventName(rawName: string): { base: string; modifiers: string[] } {
  let name = rawName.startsWith('@') ? rawName.slice(1) : rawName;
  if (name.startsWith('on') && name.length > 2 && /^[A-Z]$/.test(name[2]!)) {
    name = name.slice(2);
  }
  const [base = '', ...modifiers] = name.split('.');
  return { base, modifiers };
}

/**
 * 事件名规范化：移除 @/on 前缀和修饰符后缀，转小写。
 * 支持格式：@click / onClick / click → click
 */
export function normalizeEventName(rawName: string): string {
  return splitEventName(rawName).base.toLowerCase();
}

/**
 * 事件缓存 key 转换：click → onClick
 * 先去除修饰符后缀（`.` 之后的部分），再进行首字母大写转换。
 * 支持输入格式：click / onClick / onClick.stop
 */
export function getEventKey(name: string): string {
  const baseName = splitEventName(name).base;
  if (!baseName) return 'on';
  if (baseName.startsWith('on') && baseName.length > 2 && /^[A-Z]$/.test(baseName[2]!)) {
    return baseName;
  }
  return 'on' + baseName[0]!.toUpperCase() + baseName.slice(1);
}

/** 事件修饰符标志位（`modifierNames` 为原始名字数组，供统一语义判定使用）。 */
export interface EventModifierFlags {
  /** 原始修饰符名（按出现顺序） */
  modifierNames: string[];
  stop: boolean;
  prevent: boolean;
  capture: boolean;
  once: boolean;
  self: boolean;
  passive: boolean;
  left: boolean;
  middle: boolean;
  right: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  exact: boolean;
}

/** 解析结果：事件名 + 全部修饰符标志位。 */
export interface ParsedEventModifier extends EventModifierFlags {
  name: string;
}

/**
 * 解析事件修饰符。
 * 例如：onClick.stop.prevent → { name: 'click', modifierNames: ['stop','prevent'], stop: true, ... }
 */
export function parseEventModifier(rawName: string): ParsedEventModifier {
  const { base, modifiers } = splitEventName(rawName);
  const flags: EventModifierFlags = {
    modifierNames: modifiers,
    stop: false,
    prevent: false,
    capture: false,
    once: false,
    self: false,
    passive: false,
    left: false,
    middle: false,
    right: false,
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    exact: false,
  };
  for (const raw of modifiers) {
    const mod = raw.toLowerCase();
    if (mod in flags && mod !== 'modifierNames') {
      (flags as unknown as Record<string, boolean>)[mod] = true;
    }
  }
  return { name: base.toLowerCase(), ...flags };
}

/** 修饰符输入：数组（编译器产物）或对象（Signal 路径）。 */
export type EventModifierInput = readonly string[] | Record<string, boolean>;

function toModifierSet(input: EventModifierInput): Set<string> {
  if (Array.isArray(input)) return new Set(input as readonly string[]);
  const record = input as Record<string, boolean>;
  return new Set(Object.keys(record).filter((key) => Boolean(record[key])));
}

/**
 * 判定一次事件是否应被修饰符**拦截**（返回 `true` = 不调用 handler）。
 *
 * 两类语义：
 * - **副作用型**（`prevent` / `stop`）：无条件执行，**不拦截**；
 * - **条件型**（`self` / 鼠标键 / 系统键 / 按键名 / `exact`）：不满足即拦截。
 *
 * ★ 2026-11-07（S08）：vnode（adapter-web）、host（event-normalizer）、
 * compiler/signal（dom-runtime）三条路径共用本函数，禁止各自再写一份。
 */
export function isEventModifierIntercepted(event: Event, input: EventModifierInput): boolean {
  const mods = toModifierSet(input);

  // `.self` 必须在 stop/prevent **之前**判断（子元素上的事件应完全忽略）
  if (mods.has('self') && event.target !== event.currentTarget) return true;

  if (mods.has('prevent')) event.preventDefault();
  if (mods.has('stop')) event.stopPropagation();

  // 鼠标键：`.left` / `.middle` / `.right`（注意与方向键同名，见 NON_KEY_MODIFIERS）
  const mouseMods = [...mods].filter((m) => m in MOUSE_BUTTONS);
  if (mouseMods.length > 0) {
    const button = (event as MouseEvent).button;
    if (!mouseMods.some((m) => MOUSE_BUTTONS[m] === button)) return true;
  }

  const sysPressed = (m: string): boolean =>
    Boolean((event as unknown as Record<string, boolean>)[`${m}Key`]);

  if (mods.has('exact')) {
    // `.exact`：按下了任一**未被显式列出**的系统键 ⇒ 拦截
    if (SYSTEM_MODIFIERS.some((m) => sysPressed(m) && !mods.has(m))) return true;
  } else {
    // 显式键位修饰符：列出了但没按下 ⇒ 拦截（`.ctrl` 语义）
    if (SYSTEM_MODIFIERS.some((m) => mods.has(m) && !sysPressed(m))) return true;
  }

  // 按键名修饰符：`.enter` / `.esc` / 任意 `KeyboardEvent.key` 名；任一命中即放行
  const keyMods = [...mods].filter((m) => !NON_KEY_MODIFIERS.has(m));
  if (keyMods.length > 0) {
    const key = (event as KeyboardEvent).key;
    const matched = keyMods.some((m) => {
      const aliases = KEY_ALIASES[m.toLowerCase()] ?? [m];
      return aliases.some((a) => a === key);
    });
    if (!matched) return true;
  }

  return false;
}

// ============================================================
// DOM event name mapping & helpers
// ============================================================

/**
 * Special event name mappings from camelCase prop names to DOM event names.
 * e.g., onDoubleClick -> dblclick, onMouseEnter -> mouseenter
 */
export const DOM_EVENT_NAME_MAP: Record<string, string> = {
  onDoubleClick: 'dblclick',
  onMouseEnter: 'mouseenter',
  onMouseLeave: 'mouseleave',
  onBeforeInput: 'beforeinput',
  onCompositionStart: 'compositionstart',
  onCompositionUpdate: 'compositionupdate',
  onCompositionEnd: 'compositionend',
  onPointerEnter: 'pointerenter',
  onPointerLeave: 'pointerleave',
  onPointerDown: 'pointerdown',
  onPointerMove: 'pointermove',
  onPointerUp: 'pointerup',
  onPointerCancel: 'pointercancel',
  onPointerOver: 'pointerover',
  onPointerOut: 'pointerout',
  onDragStart: 'dragstart',
  onDragEnd: 'dragend',
  onDragOver: 'dragover',
  onDragEnter: 'dragenter',
  onDragLeave: 'dragleave',
  onDragDrop: 'drop',
  onAnimationStart: 'animationstart',
  onAnimationEnd: 'animationend',
  onAnimationIteration: 'animationiteration',
  onTransitionEnd: 'transitionend',
  onTouchStart: 'touchstart',
  onTouchMove: 'touchmove',
  onTouchEnd: 'touchend',
  onTouchCancel: 'touchcancel',
  onContextMenu: 'contextmenu',
  onWheel: 'wheel',
  onScroll: 'scroll',
};

/**
 * Convert a camelCase event prop name (e.g., onClick) to a DOM event name (e.g., click).
 * Uses the mapping table for special cases, falls back to simple lowercase conversion.
 */
export function getDOMEventName(rawName: string): string {
  return DOM_EVENT_NAME_MAP[rawName] ?? rawName.slice(2).toLowerCase();
}

/**
 * Extract the event handler function from a prop value.
 * Supports both plain functions and objects with a handler property.
 */
export function extractDOMEventHandler(value: unknown): EventListener | null {
  if (isFunction(value)) {
    return value as EventListener;
  }
  if (value != null && typeof value === 'object' && 'handler' in value) {
    return (value as { handler: EventListener }).handler;
  }
  return null;
}

/**
 * Extract event options (capture, passive, once) from a prop value.
 * Returns undefined when no options are specified (for performance).
 */
export function extractDOMEventOptions(
  value: unknown,
): boolean | AddEventListenerOptions | undefined {
  if (value != null && typeof value === 'object' && !isFunction(value)) {
    const opts = value as Record<string, unknown>;
    if ('capture' in opts || 'passive' in opts || 'once' in opts) {
      return {
        capture: !!opts.capture,
        passive: !!opts.passive,
        once: !!opts.once,
      };
    }
  }
  return undefined;
}

// ============================================================
// EventEmitter
// ============================================================

/**
 * 事件发射器
 */
export class EventEmitter {
  private events: Map<string, Set<EventHandler>> = new Map();

  /**
   * 注册事件监听器
   */
  on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return this;
  }

  /**
   * 注册一次性事件监听器
   */
  once(event: string, handler: EventHandler): this {
    const wrapper: EventHandler = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    // ★ 2026-10-26 修复：把原始回调挂在包装器上，使 `off(event, 原始函数)` 也能摘掉。
    //   此前 `off` 拿原始函数去 `Set.delete`，而 Set 里存的是 wrapper ⇒ 删不掉：
    //   调用方**无法取消**一个一次性监听，只能等它被触发；组件卸载后闭包一直被持有。
    (wrapper as EventHandler & { __originalHandler?: EventHandler }).__originalHandler = handler;
    return this.on(event, wrapper);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event);
    if (handlers) {
      // 直接命中，或命中「once 包装器」里记录的原始回调
      for (const registered of handlers) {
        const original = (registered as EventHandler & { __originalHandler?: EventHandler })
          .__originalHandler;
        if (registered === handler || original === handler) {
          handlers.delete(registered);
        }
      }
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: unknown[]): boolean {
    const handlers = this.events.get(event);
    if (!handlers || handlers.size === 0) return false;
    const snapshot = [...handlers];
    for (const handler of snapshot) {
      try {
        handler(...args);
      } catch (e) {
        console.error(`Error in event handler for "${event}":`, e);
      }
    }
    return true;
  }

  /**
   * 移除指定事件的所有监听器
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0;
  }
}

/**
 * 订阅管理器 - 管理多个取消订阅函数
 */
export class SubscriptionManager {
  private unsubscribers: Set<() => void> = new Set();

  /**
   * 添加一个取消订阅函数
   * @returns 移除此订阅的函数
   */
  add(unsubscribe: () => void): () => void {
    this.unsubscribers.add(unsubscribe);
    return () => {
      this.unsubscribers.delete(unsubscribe);
    };
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        console.error('Error during unsubscribe:', e);
      }
    });
    this.unsubscribers.clear();
  }

  /**
   * 当前订阅数量
   */
  get count(): number {
    return this.unsubscribers.size;
  }
}

/**
 * 主题订阅管理器 - 基于主题的发布/订阅
 */
export class TopicSubscriptionManager {
  private topics: Map<string, Set<EventHandler>> = new Map();

  /**
   * 订阅主题
   */
  subscribe(topic: string, handler: EventHandler): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(handler);
    return () => this.unsubscribe(topic, handler);
  }

  /**
   * 取消订阅主题
   */
  unsubscribe(topic: string, handler: EventHandler): void {
    const handlers = this.topics.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.topics.delete(topic);
      }
    }
  }

  /**
   * 发布消息到主题
   */
  publish(topic: string, ...args: unknown[]): boolean {
    const handlers = this.topics.get(topic);
    if (!handlers || handlers.size === 0) return false;
    // 创建快照，防止发布期间订阅者列表被修改导致的问题
    const snapshot = [...handlers];
    for (const handler of snapshot) {
      try {
        handler(...args);
      } catch (e) {
        console.error(`Error in topic handler for "${topic}":`, e);
      }
    }
    return true;
  }

  /**
   * 取消指定主题的所有订阅
   */
  unsubscribeAll(topic?: string): void {
    if (topic) {
      this.topics.delete(topic);
    } else {
      this.topics.clear();
    }
  }

  /**
   * 获取指定主题的订阅者数量
   */
  subscriberCount(topic: string): number {
    return this.topics.get(topic)?.size ?? 0;
  }
}
