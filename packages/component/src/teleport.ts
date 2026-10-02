import type { ComponentOptions } from './types';
// vnode 侧的符号（`Symbol.for('Teleport')`）—— vdom 的 `getShapeFlag` 按它分派。
// 与本文件导出的 `Teleport`（组件对象）是**两个不同的东西**，勿混。
import { Teleport as TeleportVNodeType } from '@lytjs/common-vnode';

export interface TeleportProps {
  to: string | Element;
  disabled?: boolean;
}

export const Teleport: ComponentOptions = {
  name: 'Teleport',
  // ★ 2026-10-02：声明对应的 vnode 符号，使 `getShapeFlag` 产出
  // `ARRAY_CHILDREN | TELEPORT` ⇒ vdom 分派到 mountTeleport / patchTeleport。
  // 缺它时：组件对象落进 `STATEFUL_COMPONENT` → `mountComponent` 找不到
  // `render` → 模板与渲染函数里用 `<Teleport>` **静默渲染为空**（实测）。
  __vnodeType: TeleportVNodeType,
  // FIX: P1-21 定义正确的 props 类型替代 as any
  // FIX: DTS build error - 使用 any 避免 PropConstructor 类型不兼容
  // FIX: DTS build error - props 使用 any 类型
  props: {
    to: { type: [String, Object] as unknown as new (...args: unknown[]) => object, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup() {
    // Teleport is handled by the vdom patch algorithm.
    // The actual Teleport logic (mounting to target, disabled handling)
    // lives in vdom's patch function (mountTeleport / patchTeleport).
    // FIX: P2-19 disabled 状态切换动画：
    // 当 disabled 属性在 true/false 之间切换时，vdom 层的 patchTeleport
    // 负责处理 DOM 节点的移动和过渡动画。组件层无需额外处理。
  },
};
