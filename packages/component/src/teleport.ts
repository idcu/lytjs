import type { ComponentOptions } from './types';

export interface TeleportProps {
  to: string | Element;
  disabled?: boolean;
}

export const Teleport: ComponentOptions = {
  name: 'Teleport',
  // FIX: P1-21 定义正确的 props 类型替代 as any，
  // 使用联合类型 [String, Object] 明确声明 to 属性接受字符串或对象
  props: {
    to: { type: [String, Object] as unknown as { new (...args: unknown[]): string | Element }[], required: true },
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
