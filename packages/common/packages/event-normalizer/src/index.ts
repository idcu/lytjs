// @lytjs/common-event-normalizer
// 事件归一化：解析事件名、提供 invoker 缓存模式、通过 RendererHost 操作事件

import type {
  RendererHost,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';
import { EVENT_MODIFIER_RE } from '@lytjs/common-events';

// ============================================================
// 类型定义
// ============================================================

/**
 * 事件修饰符解析结果。
 */
export interface ParsedModifiers {
  /** 是否调用 stopPropagation */
  stop: boolean;
  /** 是否调用 preventDefault */
  prevent: boolean;
  /** 是否使用 capture 模式 */
  capture: boolean;
  /** 是否使用 once 模式 */
  once: boolean;
  /** 是否仅在 target === currentTarget 时触发 */
  self: boolean;
  /** 是否使用 passive 模式 */
  passive: boolean;
}

/**
 * 解析后的事件信息。
 */
export interface ParsedEventInfo {
  /** 规范化后的事件名（如 'click'） */
  name: string;
  /** 事件修饰符 */
  modifiers: ParsedModifiers;
}

/**
 * 事件 invoker 接口。
 *
 * 持有 value 属性用于更新，避免重复 addEventListener。
 */
export interface EventInvoker<HE> {
  /** 当前绑定的事件处理函数 */
  value: ((event: HostEvent) => void) | null;
  /** 解析后的事件信息 */
  parsed: ParsedEventInfo;
  /** 宿主元素引用 */
  el: HE;
  /** 实际的事件处理函数（传给 addEventListener 的函数） */
  handler: (event: HostEvent) => void;
  /** 取消监听函数 */
  dispose: () => void;
}

/**
 * 事件监听器注册条目。
 */
export interface EventListenerEntry<HE> {
  /** 宿主元素 */
  el: HE;
  /** 事件名 */
  event: string;
  /** 处理函数 */
  handler: (event: HostEvent) => void;
  /** 事件选项 */
  options?: { capture?: boolean; once?: boolean; passive?: boolean };
}

// ============================================================
// 常量
// ============================================================

/** invoker 缓存类型 */
type InvokerCache<HE> = Record<string, EventInvoker<HE> | undefined>;

// ============================================================
// EventNormalizer
// ============================================================

/**
 * 事件归一化器。
 *
 * 负责解析事件名中的修饰符、管理事件 invoker 缓存，
 * 通过 RendererHost 接口执行平台无关的事件操作。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型
 */
// FIX: DTS build error - HN 必须约束为 object
export class EventNormalizer<HN extends object = object, HE extends HN = HN> {
  /** RendererHost 实例 */
  private host: RendererHost<HN, HE>;

  /**
   * FIX: P2-46 使用 WeakMap 替代 el._vei 属性存储，避免类型断言和属性污染
   * 键：宿主元素，值：该元素的事件 invoker 缓存
   */
  private invokerCache = new WeakMap<HE, InvokerCache<HE>>();

  /**
   * 创建事件归一化器实例。
   * @param host - RendererHost 实例
   */
  constructor(host: RendererHost<HN, HE>) {
    this.host = host;
  }

  // ==========================================================
  // 事件名解析
  // ==========================================================

  /**
   * 解析事件名。
   *
   * 将各种格式的事件名规范化并提取修饰符：
   * - onClick.stop.prevent → { name: 'click', modifiers: { stop: true, prevent: true } }
   * - @click.capture → { name: 'click', modifiers: { capture: true } }
   * - click → { name: 'click', modifiers: { stop: false, ... } }
   *
   * @param rawName - 原始事件名
   * @returns 解析后的事件信息
   */
  parseEventName(rawName: string): ParsedEventInfo {
    const name = this.normalizeEventName(rawName);
    const modifiers = this.parseModifiers(rawName);

    return { name, modifiers };
  }

  /**
   * 将原始事件名规范化为标准事件名。
   *
   * 支持格式：@click / onClick / click → click
   *
   * @param rawName - 原始事件名
   * @returns 规范化后的事件名
   */
  normalizeEventName(rawName: string): string {
    // 移除 @ 前缀
    let name = rawName.startsWith('@') ? rawName.slice(1) : rawName;

    // 移除 on 前缀（仅当以大写字母开头的 on 前缀时）
    // FIX: P2-45 使用 charAt 替代非空断言，更安全地访问字符串字符
    if (name.startsWith('on') && name.length > 2 && /^[A-Za-z]$/.test(name.charAt(2))) {
      name = name.slice(2);
    }

    // 移除修饰符后缀（如 .stop.prevent）
    name = name.replace(EVENT_MODIFIER_RE, '');

    // 转为小写
    return name.toLowerCase();
  }

  /**
   * 解析事件名中的修饰符。
   *
   * @param rawName - 原始事件名
   * @returns 修饰符集合
   */
  parseModifiers(rawName: string): ParsedModifiers {
    const modifiers: ParsedModifiers = {
      stop: false,
      prevent: false,
      capture: false,
      once: false,
      self: false,
      passive: false,
    };

    // FIX: P2-23 正则表达式缓存 - 模块级预编译正则
    const RE_EVENT_MODIFIERS = /\.(stop|prevent|capture|once|self|passive)/g;
    // FIX: P2-41 事件捕获选项支持：支持 .capture 修饰符
    const modifierMatch = rawName.match(RE_EVENT_MODIFIERS);
    if (modifierMatch) {
      for (const mod of modifierMatch) {
        switch (mod) {
          case '.stop':
            modifiers.stop = true;
            break;
          case '.prevent':
            modifiers.prevent = true;
            break;
          case '.capture':
            modifiers.capture = true;
            break;
          case '.once':
            modifiers.once = true;
            break;
          case '.self':
            modifiers.self = true;
            break;
          case '.passive':
            modifiers.passive = true;
            break;
        }
      }
    }

    return modifiers;
  }

  // ==========================================================
  // 事件名 → 缓存 key 转换
  // ==========================================================

  /**
   * 将事件名转换为 invoker 缓存的 key。
   *
   * click → onClick，mouseenter → onMouseenter
   *
   * @param rawName - 原始事件名
   * @returns 缓存 key
   */
  getEventKey(rawName: string): string {
    const name = this.normalizeEventName(rawName);
    // FIX: P2-v11-20 添加空字符串检查，避免 name 为空时 name[0] 返回 undefined
    if (!name) return 'on';
    return 'on' + name[0]!.toUpperCase() + name.slice(1);
  }

  // ==========================================================
  // Invoker 缓存模式
  // ==========================================================

  /**
   * 更新元素上的事件监听（invoker 缓存模式）。
   *
   * 四种情况：
   * 1. nextValue && existingInvoker → 直接替换 invoker.value（O(1) 赋值）
   * 2. nextValue && !existingInvoker → 创建 invoker，addEventListener
   * 3. !nextValue && existingInvoker → removeEventListener，清除缓存
   * 4. !nextValue && !existingInvoker → 无操作
   *
   * @param el - 宿主元素
   * @param rawName - 原始事件名
   * @param nextValue - 新的事件处理函数
   */
  patchEvent(el: HE, rawName: string, nextValue: HostEventHandler | null): void {
    const eventKey = this.getEventKey(rawName);
    const parsed = this.parseEventName(rawName);

    // FIX: P2-46 使用 WeakMap 替代 el._vei 属性存储
    let invokers = this.invokerCache.get(el);
    if (!invokers) {
      invokers = {};
      this.invokerCache.set(el, invokers);
    }

    const existingInvoker = invokers[eventKey];

    /**
     * 是否需要重新绑定。
     *
     * ⚠️ 2026-11-03 修（P1）：此前只要 key 相同就只换 `value` —— 于是
     *   ① 修饰符从 `@click` 变成 `@click.stop` / 加 `.capture` 后**不生效**；
     *   ② `.once` 触发后监听已被宿主摘掉，缓存里却还留着 invoker ⇒
     *      下一次更新只换 value，**再也不会触发**。
     */
    const needsRebind =
      existingInvoker !== undefined &&
      (existingInvoker.parsed.name !== parsed.name ||
        existingInvoker.parsed.modifiers.capture !== parsed.modifiers.capture ||
        existingInvoker.parsed.modifiers.passive !== parsed.modifiers.passive ||
        existingInvoker.parsed.modifiers.once !== parsed.modifiers.once ||
        // `.once` 的监听可能已被消费：更新 handler 时重新武装
        parsed.modifiers.once);

    if (nextValue && existingInvoker && !needsRebind) {
      // 情况 1：有新值 + 旧 invoker 且绑定参数没变 → 直接替换 value
      existingInvoker.value = nextValue;
      existingInvoker.parsed = parsed;
    } else if (nextValue && existingInvoker) {
      // 情况 1b：绑定参数变了 → 先摘旧的再绑新的
      const oldOptions = this.buildHostEventOptions(existingInvoker.parsed.modifiers);
      this.host.removeEventListener(
        el,
        existingInvoker.parsed.name,
        existingInvoker.handler,
        oldOptions,
      );
      existingInvoker.dispose();
      invokers[eventKey] = undefined;

      const invoker = this.createInvoker(el, parsed, nextValue);
      invokers[eventKey] = invoker;
      const hostDispose = this.host.addEventListener(
        el,
        parsed.name,
        invoker.handler,
        this.buildHostEventOptions(parsed.modifiers),
      );
      invoker.dispose = () => {
        hostDispose();
        (invoker as { value?: HostEventHandler | null }).value = null;
      };
    } else if (nextValue && !existingInvoker) {
      // 情况 2：有新值 + 无旧 invoker → 创建并绑定
      const invoker = this.createInvoker(el, parsed, nextValue);
      invokers[eventKey] = invoker;

      const options = this.buildHostEventOptions(parsed.modifiers);
      // FIX: P2 保存 addEventListener 返回的 dispose 函数到 invoker，
      // 确保后续可以通过 invoker.dispose() 正确移除事件监听
      const hostDispose = this.host.addEventListener(el, parsed.name, invoker.handler, options);
      invoker.dispose = () => {
        hostDispose();
        // 同时清理内部状态
        (invoker as { value?: HostEventHandler | null }).value = null;
      };
    } else if (!nextValue && existingInvoker) {
      // 情况 3：无新值 + 有旧 invoker → 移除
      const options = this.buildHostEventOptions(parsed.modifiers);
      this.host.removeEventListener(el, parsed.name, existingInvoker.handler, options);
      invokers[eventKey] = undefined;
    }
    // 情况 4：无新值 + 无旧 invoker → 无操作
  }

  /**
   * 移除元素上所有通过 invoker 缓存的事件监听。
   *
   * @param el - 宿主元素
   */
  removeAllEventListeners(el: HE): void {
    // FIX: P2-46 使用 WeakMap 替代 el._vei 属性存储
    const invokers = this.invokerCache.get(el);
    if (!invokers) return;

    // FIX: P2-47 使用 Object.keys 替代 for...in，避免遍历原型链上的属性
    for (const eventKey of Object.keys(invokers)) {
      const invoker = invokers[eventKey];
      if (invoker) {
        // FIX: P1-48 使用 invoker.handler 而非原始 handler 引用移除事件监听器，
        // 确保能正确匹配 addEventListener 时注册的包装 handler
        const options = this.buildHostEventOptions(invoker.parsed.modifiers);
        this.host.removeEventListener(el, invoker.parsed.name, invoker.handler, options);
      }
    }

    // 从 WeakMap 中删除该元素的缓存
    this.invokerCache.delete(el);
  }

  // ==========================================================
  // 内部方法
  // ==========================================================

  /**
   * 创建事件 invoker。
   *
   * invoker 持有 value 属性，调用时执行 invoker.value(event)。
   * 修饰符在 invoker 内部处理，更新时仅需替换 value。
   */
  private createInvoker(
    el: HE,
    parsed: ParsedEventInfo,
    initialValue: HostEventHandler,
  ): EventInvoker<HE> {
    let currentValue: HostEventHandler | null = initialValue;
    let disposed = false;

    /**
     * ⚠️ 2026-11-03 修（P1）：修饰符必须**调用时**从 `invoker.parsed` 读取。
     *   此前 handler 闭包捕获的是 `createInvoker` 的入参 `parsed` —— 于是
     *   `patchEvent` 里「只换 value + 更新 invoker.parsed」的优化**完全不生效**：
     *   从 `@click` 改成 `@click.stop` 后，`.stop` 永远不会执行。
     */
    const invoker = {
      get value() {
        return currentValue;
      },
      set value(fn: HostEventHandler | null) {
        currentValue = fn;
      },
      parsed,
      el,
      handler: (() => {}) as HostEventHandler,
      dispose: () => {
        disposed = true;
        currentValue = null;
      },
    } as EventInvoker<HE>;

    invoker.handler = (event: HostEvent) => {
      if (disposed) return;
      const modifiers = invoker.parsed.modifiers;

      // `.self` 必须在 stop/prevent **之前**判断（子元素上的事件应完全忽略）
      if (modifiers.self && event.target !== event.currentTarget) {
        return;
      }
      if (modifiers.stop) {
        event.stopPropagation();
      }
      if (modifiers.prevent) {
        event.preventDefault();
      }

      if (currentValue) {
        currentValue(event);
      }
    };

    return invoker;
  }

  /**
   * 根据 ParsedModifiers 构建 HostEventOptions。
   */
  private buildHostEventOptions(modifiers: ParsedModifiers): HostEventOptions | undefined {
    if (modifiers.capture || modifiers.once || modifiers.passive) {
      const options: HostEventOptions = {};
      if (modifiers.capture) options.capture = true;
      if (modifiers.once) options.once = true;
      if (modifiers.passive) options.passive = true;
      return options;
    }
    return undefined;
  }
}
