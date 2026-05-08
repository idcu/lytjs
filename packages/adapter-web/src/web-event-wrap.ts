/**
 * @lytjs/adapter-web - DOM Event Wrapping
 * 将原生 DOM Event 包装为平台无关的 HostEvent。
 */

import type { HostEvent } from '@lytjs/host-contract';

/**
 * 将原生 DOM Event 包装为 HostEvent。
 *
 * 纯翻译层，不做任何归一化或兼容处理。
 *
 * @param e - 原生 DOM Event
 * @returns HostEvent 实例
 */
export function wrapDOMEvent(e: Event): HostEvent {
  return {
    get type(): string {
      return e.type;
    },
    get target(): unknown {
      return e.target;
    },
    get currentTarget(): unknown {
      return e.currentTarget;
    },
    preventDefault(): void {
      e.preventDefault();
    },
    stopPropagation(): void {
      e.stopPropagation();
    },
    nativeEvent: e,
  };
}
