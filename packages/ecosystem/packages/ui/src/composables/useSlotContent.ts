/**
 * @lytjs/ui - useSlotContent
 *
 * 统一插槽内容的归一化：插槽函数可能返回数组、单个 VNode 或假值。
 *
 * 返回语义（与组件里手写 `Array.isArray` / `else` 分支完全一致）：
 * - `null`：插槽不存在，或插槽返回假值 ⇒ 调用方应跳过渲染；
 * - `[]`：插槽存在且返回空数组 ⇒ 调用方仍需渲染空容器（保持原 DOM）；
 * - `[vnode]`：插槽返回单个节点。
 */

import type { VNode } from '@lytjs/vdom';

type SlotFn = (...args: unknown[]) => unknown;

export interface SlotContentApi {
  /** 插槽是否存在（不调用插槽函数） */
  has(name: string): boolean;
  /** 归一化插槽内容，语义见文件头 */
  resolve(name: string): VNode[] | null;
}

export function useSlotContent(slots: object): SlotContentApi {
  const map = slots as Record<string, SlotFn | undefined>;

  return {
    has: (name) => Boolean(map[name]),
    resolve: (name) => {
      const slot = map[name];
      if (!slot) return null;
      const content = slot();
      if (Array.isArray(content)) return content as VNode[];
      return content ? [content as VNode] : null;
    },
  };
}
