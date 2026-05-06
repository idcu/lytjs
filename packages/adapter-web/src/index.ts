/**
 * @lytjs/adapter-web - Web Platform Adapter
 * L3 Web 平台适配器，提供浏览器 DOM 的 RendererHost 实现。
 *
 * 所有 DOM API 调用集中在此包内，不泄漏到 L1/L2。
 */

// ============================================================
// Core: WebRendererHost
// ============================================================

export { WebRendererHost } from './web-host';

// ============================================================
// DOM Renderer
// ============================================================

export { createDOMRenderer } from './web-dom-renderer';
export type { DOMRenderer } from './web-dom-renderer';

// ============================================================
// Hydration
// ============================================================

export { createHydrationFunctions } from './web-hydration';
export type { HydrationRenderer } from './web-hydration';

// ============================================================
// Event Wrapping
// ============================================================

export { wrapDOMEvent } from './web-event-wrap';

// ============================================================
// Patch Props (re-export for backward compatibility)
// ============================================================

export { patchProp, patchClass, patchStyle, patchAttr } from './web-patch-props';

// ============================================================
// Patch Events (re-export for backward compatibility)
// ============================================================

export {
  patchEvent,
  createInvoker,
  removeAllEventListeners,
} from './web-patch-events';
export type { ParsedEvent, EventInvoker } from './web-patch-events';

// normalizeEventName, getEventKey, parseEventModifier 已迁移到 @lytjs/common-events
export { normalizeEventName, getEventKey, parseEventModifier } from '@lytjs/common-events';

// ============================================================
// createWebHost - 便捷工厂函数
// ============================================================

// FIX: P2-17 删除重复导入，WebRendererHost 已在文件顶部导出
import type { RendererHost } from '@lytjs/host-contract';

/**
 * 创建 Web 平台的 RendererHost 实例。
 * 便捷工厂函数，等价于 `new WebRendererHost()`。
 */
export function createWebHost(): RendererHost<Node, Element> {
  // FIX: P2-17 使用已导入的 WebRendererHost 类
  return new WebRendererHost();
}
