/**
 * @lytjs/ui - VaporBadge 组件
 *
 * Vapor 模式的徽标组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';

export interface VaporBadgeProps {
  value?: string | number;
  max?: number;
  isDot?: boolean;
  hidden?: boolean;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  class?: string;
}

export const VaporBadge = {
  name: 'VaporBadge',
  props: {
    value: { type: String, default: '' },
    max: { type: Number, default: 99 },
    isDot: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    type: { type: String, default: 'danger' },
    class: { type: String, default: '' },
  },
  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporBadgeProps;

    const getContent = (): string => {
      if (p.isDot) return '';
      if (typeof p.value === 'number' && typeof p.max === 'number') {
        return p.value > p.max ? `${p.max}+` : String(p.value);
      }
      return String(p.value ?? '');
    };

    const getClasses = (): string => {
      const cls = ['vapor-badge'];
      if (p.type) cls.push(`vapor-badge--${p.type}`);
      if (p.isDot) cls.push('vapor-badge--dot');
      if (p.class) cls.push(p.class as string);
      return cls.join(' ');
    };

    return () => {
      if (p.hidden) {
        return createVNode('slot', {}, []);
      }

      const badgeContent: VNode[] = [createTextVNode(getContent())];
      const badge = createVNode('span', { class: getClasses() }, badgeContent);
      const slotNode = createVNode('slot', {}, []);

      return createVNode('div', { class: 'vapor-badge__wrapper' }, [slotNode, badge]);
    };
  },
};
