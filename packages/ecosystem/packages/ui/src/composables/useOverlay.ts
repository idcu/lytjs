/**
 * @lytjs/ui - useOverlay
 *
 * 弹层生命周期里的公共部分：body 滚动锁 + 焦点控制器代理。
 *
 * 焦点/Escape 的实现在 `components/overlay-focus.ts`（Modal / Dialog / Drawer
 * 共用）；这里只收敛此前在三处各写一遍的滚动锁，并保持「锁与焦点分开控制」——
 * 组件可在关闭时先解锁滚动、等 prop 变化后再归还焦点。
 */

import type { OverlayFocusController } from '../components/overlay-focus';

export interface UseOverlayOptions {
  controller: OverlayFocusController;
  /** 是否锁 body 滚动；每次调用时求值，支持从受控 prop 读取 */
  lockScroll?: () => boolean;
}

export interface UseOverlayApi {
  lockScroll(): void;
  unlockScroll(): void;
  activate(): void;
  deactivate(): void;
}

export function useOverlay(options: UseOverlayOptions): UseOverlayApi {
  let locked = false;

  const lockScroll = (): void => {
    if (locked || !options.lockScroll?.()) return;
    if (typeof document === 'undefined') return;
    document.body.style.overflow = 'hidden';
    locked = true;
  };

  const unlockScroll = (): void => {
    if (!locked || typeof document === 'undefined') return;
    document.body.style.overflow = '';
    locked = false;
  };

  return {
    lockScroll,
    unlockScroll,
    activate: () => options.controller.activate(),
    deactivate: () => options.controller.deactivate(),
  };
}
