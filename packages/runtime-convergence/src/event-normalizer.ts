// @lytjs/runtime-convergence - event-normalizer
// 事件归一化：解析事件名、提供 invoker 缓存模式、通过 RendererHost 操作事件

import type { RendererHost, HostEvent, HostEventHandler, HostEventOptions } from '@lytjs/host-contract';
import type { ParsedModifiers, ParsedEventInfo, EventInvoker } from './types';

// ============================================================
// 常量
// ============================================================

/** 事件修饰符正则（支持多个修饰符） */
const EVENT_MODIFIER_RE = /\.(stop|prevent|capture|once|self|passive)(?=\.|$)/g;

/** el 上缓存 invoker 的 key */
const VEI_KEY = '_vei';

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
    if (name.startsWith('on') && name.length > 2 && /^[A-Za-z]$/.test(name[2]!)) {
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

    // 获取或创建 el._vei 缓存
    const cacheMap = el as unknown as Record<string, InvokerCache<HE>>;
    let invokers = cacheMap[VEI_KEY];
    if (!invokers) {
      invokers = {};
      cacheMap[VEI_KEY] = invokers;
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
      this.host.addEventListener(el, parsed.name, invoker.handler, options);
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
    const cacheMap = el as unknown as Record<string, InvokerCache<HE>>;
    const invokers = cacheMap[VEI_KEY];
    if (!invokers) return;

    for (const eventKey in invokers) {
      const invoker = invokers[eventKey];
      if (invoker) {
        const options = this.buildHostEventOptions(invoker.parsed.modifiers);
        this.host.removeEventListener(el, invoker.parsed.name, invoker.handler, options);
      }
    }

    delete cacheMap[VEI_KEY];
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
