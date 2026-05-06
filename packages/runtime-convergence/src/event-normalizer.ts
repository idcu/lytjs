// @lytjs/runtime-convergence - event-normalizer
// 事件归一化：解析事件名、提供 invoker 缓存模式、通过 RendererHost 操作事件

import type { RendererHost, HostEvent, HostEventHandler, HostEventOptions } from '@lytjs/host-contract';
import type { ParsedModifiers, ParsedEventInfo, EventInvoker } from './types';
import { EVENT_MODIFIER_RE } from '@lytjs/common-events';

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
export class EventNormalizer<HN = unknown, HE extends HN = HN> {
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

    // FIX: P2-41 事件捕获选项支持：支持 .capture 修饰符
    const modifierMatch = rawName.match(/\.(stop|prevent|capture|once|self|passive)/g);
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
  patchEvent(
    el: HE,
    rawName: string,
    nextValue: HostEventHandler | null,
  ): void {
    const eventKey = this.getEventKey(rawName);
    const parsed = this.parseEventName(rawName);

    // FIX: P2-46 使用 WeakMap 替代 el._vei 属性存储
    let invokers = this.invokerCache.get(el);
    if (!invokers) {
      invokers = {};
      this.invokerCache.set(el, invokers);
    }

    const existingInvoker = invokers[eventKey];

    if (nextValue && existingInvoker) {
      // 情况 1：有新值 + 有旧 invoker → 直接替换 value
      existingInvoker.value = nextValue;
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

    const handler: HostEventHandler = (event: HostEvent) => {
      if (disposed) return;

      // 处理修饰符
      if (parsed.modifiers.stop) {
        event.stopPropagation();
      }
      if (parsed.modifiers.prevent) {
        event.preventDefault();
      }
      if (parsed.modifiers.self && event.target !== event.currentTarget) {
        return;
      }

      if (currentValue) {
        currentValue(event);
      }
    };

    const invoker: EventInvoker<HE> = {
      get value() {
        return currentValue;
      },
      set value(fn: HostEventHandler | null) {
        currentValue = fn;
      },
      parsed,
      el,
      handler,
      dispose: () => {
        disposed = true;
        currentValue = null;
      },
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
