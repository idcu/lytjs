/**
 * 弹层（Modal / Dialog / Drawer）共用的「焦点 + Escape」控制器。
 *
 * ## 为什么需要它
 *
 * 2026-11-04 审计发现三个对话框各自实现了一套，而且**三套都是错的**：
 *
 * | 组件 | Escape 挂在哪 | 后果 |
 * |---|---|---|
 * | `Modal` | 对话框元素的 `onKeydown` | 焦点**从未移入**对话框 ⇒ 事件收不到 ⇒ Escape 永不生效 |
 * | `Dialog` | 包裹层的 `onKeydown` | 焦点在内部时才生效；焦点一旦逃出（点外部 / 程序化 focus）就失效 |
 * | `Drawer` | `window.addEventListener`（setup 里注册、**从不移除**） | 卸载后仍响应；N 个抽屉按一次 Escape **全部关闭** |
 *
 * 三者共同的缺口是：**打开后不把焦点移进来、关闭后不还回去、Tab 可以走到背后的页面**。
 * 而 `@lytjs/common-a11y` 里早就写好了 `focusTrap` —— 一次都没被调用过。
 *
 * ## 语义
 *
 * - 打开：等 DOM 就位后建立焦点陷阱（初始焦点落在第一个可聚焦元素上）；
 * - Escape：**只关最上层**（用模块级栈判定），且由 `onEscape` 回调决定关不关；
 * - 关闭：解除陷阱并把焦点还给打开前的元素；
 * - 卸载：强制解除（否则监听会挂到进程退出）。
 */

import { focusTrap } from '@lytjs/common-a11y';

/** 当前打开的弹层（后进先出）。只存标识，不持有组件实例，避免泄漏。 */
const openOverlays: symbol[] = [];

export function pushOverlay(id: symbol): void {
  const existing = openOverlays.indexOf(id);
  if (existing >= 0) openOverlays.splice(existing, 1);
  openOverlays.push(id);
}

export function popOverlay(id: symbol): void {
  const index = openOverlays.indexOf(id);
  if (index >= 0) openOverlays.splice(index, 1);
}

/** 该弹层是否是**最上层**（决定 Escape 该关谁） */
export function isTopmostOverlay(id: symbol): boolean {
  return openOverlays.length > 0 && openOverlays[openOverlays.length - 1] === id;
}

/** 当前打开的弹层数量（观测用） */
export function getOpenOverlayCount(): number {
  return openOverlays.length;
}

export interface OverlayFocusOptions {
  /** Escape 被按下**且本弹层在最上层**时调用 */
  onEscape: () => void;
  /** 关闭时是否把焦点还给打开前的元素，默认 `true` */
  restoreFocus?: boolean;
  /** 初始焦点选择器或元素（不传则取容器内第一个可聚焦元素） */
  initialFocus?: string | HTMLElement;
}

export interface OverlayFocusController {
  /** 打开后调用（会等一个宏任务，让 DOM 先就位） */
  activate(): void;
  /** 关闭 / 卸载时调用（幂等） */
  deactivate(): void;
  /** 是否处于激活状态（观测用） */
  isActive(): boolean;
}

/**
 * 创建控制器。
 *
 * @param getContainer 返回弹层根元素（打开后才有值，因此是函数而非元素）
 */
export function createOverlayFocus(
  getContainer: () => HTMLElement | null,
  options: OverlayFocusOptions,
): OverlayFocusController {
  // 标识符用普通字符串：`lyt-` 前缀会被 `check-ui-styles` 当成「组件发出的类名」，
  // 而这里只是 Symbol 的 description，不是 CSS 类。
  const id = Symbol('overlay-focus');
  let cleanup: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  const deactivate = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (cleanup) {
      const fn = cleanup;
      cleanup = null;
      fn();
    }
    popOverlay(id);
    active = false;
  };

  const activate = (): void => {
    // 幂等：重复打开（或 watch 连续触发）不应叠加两层陷阱
    deactivate();

    timer = setTimeout(() => {
      timer = null;
      const container = getContainer();
      if (!container) return;

      pushOverlay(id);
      active = true;

      let initial: HTMLElement | undefined;
      if (options.initialFocus !== undefined) {
        initial =
          typeof options.initialFocus === 'string'
            ? (container.querySelector<HTMLElement>(options.initialFocus) ?? undefined)
            : options.initialFocus;
      }

      cleanup = focusTrap(container, {
        initialFocus: initial,
        restoreFocus: options.restoreFocus ?? true,
        // 提供 onEscape ⇒ focusTrap 不会自行解除陷阱，由本控制器在关闭时解除
        onEscape: () => {
          if (isTopmostOverlay(id)) options.onEscape();
        },
      });
    }, 0);
  };

  return {
    activate,
    deactivate,
    isActive: () => active,
  };
}
