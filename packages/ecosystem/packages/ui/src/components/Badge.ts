/**
 * @lytjs/ui - Badge 组件
 *
 * 徽标组件，用于展示数字或点标记
 */

import type { BadgeSetupProps, BadgeSlots, BadgeProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';

export const Badge = defineComponent({
  name: 'LytBadge',

  props: {
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 99 },
    dot: { type: Boolean, default: false },
    showZero: { type: Boolean, default: false },
    type: { type: String, default: 'danger' },
    offset: { type: Array, default: undefined },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: BadgeSlots }) {
    const p = props as BadgeSetupProps;

    const displayCount = (): string => {
      if (p.dot) return '';
      if (p.count > p.maxCount) return `${p.maxCount}+`;
      return String(p.count);
    };

    const showBadge = (): boolean => {
      if (p.dot) return true;
      if (p.count === 0) return p.showZero;
      return true;
    };

    const getCountStyle = (): Record<string, string> => {
      const style: Record<string, string> = {};
      if (p.offset) {
        style.top = `${p.offset[0]}px`;
        style.right = `${p.offset[1]}px`;
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];

      if (slots.default) {
        children.push(...slots.default());
      }

      if (showBadge()) {
        children.push(createVNode('sup', {
          class: [
            'lyt-badge__count',
            `lyt-badge__count--${p.type}`,
            p.dot ? 'lyt-badge__count--dot' : '',
          ].filter(Boolean).join(' '),
          style: getCountStyle(),
        }, [createVNode('span', {}, p.dot ? '' : displayCount())]));
      }

      return createVNode('span', {
        class: [
          'lyt-badge',
          p.class as string,
        ].filter(Boolean).join(' '),
      }, children);
    };
  },
});

export type { BadgeProps, BadgeSlots, BadgeSetupProps };
