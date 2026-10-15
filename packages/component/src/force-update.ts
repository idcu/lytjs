// src/force-update.ts
// 组件强制更新（含 `instance.update` 不可用时的回退）
//
// ★ 2026-10-16：这段回退原先**只存在于** `component-proxy.ts` 的 `$forceUpdate` 里，
//   而 `async-component.ts` 的 `triggerComponentUpdate` 只写了 `if (instance.update) update()`
//   —— **没有回退**，尽管它的 JSDoc 承诺了「不可用时回退到基于 nextTick 的重新渲染」
//   ⇒ 异步组件加载完成后**视图不切换**（实测：挂载后等 60ms，真实组件始终不出现）。
//   按坑 `parallel-impl-only-one-fixed`（平行实现只修一处）：同一份逻辑只留一处实现，
//   两处共用本函数。

import { nextTick } from '@lytjs/common-scheduler';
import type { ComponentInternalInstance } from './types';

/**
 * 触发组件重新渲染。
 *
 * 优先调用 `instance.update()`；不可用时（非标准渲染器场景）回退为
 * 「下一个 tick 重新执行 render 并替换 `instance.subTree`」，
 * 并保留旧 subTree 的 `anchor` / `ref`（Fragment 定位与 ref 绑定）。
 */
export function forceComponentUpdate(instance: ComponentInternalInstance): void {
  if (instance.update) {
    instance.update();
    return;
  }

  if (!instance.isMounted || !instance.render || instance.isUnmounted) return;

  nextTick(() => {
    if (instance.isUnmounted) return;
    const prevTree = instance.subTree;
    const nextTree = instance.render!(instance.ctx as Parameters<typeof instance.render>[0]);
    if (!nextTree) return;

    instance.subTree = nextTree;
    // 渲染器在下次调度时会检测到 subTree 变化并执行 patch。
    nextTree.el = prevTree?.el ?? null;
    // 保留 anchor 信息，确保 Fragment 子节点定位正确
    if (prevTree && 'anchor' in prevTree) {
      (nextTree as unknown as Record<string, unknown>).anchor = (
        prevTree as unknown as Record<string, unknown>
      ).anchor;
    }
    // 转移 ref 绑定，避免 ref 丢失
    if (prevTree && 'ref' in prevTree) {
      (nextTree as unknown as Record<string, unknown>).ref = (
        prevTree as unknown as Record<string, unknown>
      ).ref;
    }
  });
}
