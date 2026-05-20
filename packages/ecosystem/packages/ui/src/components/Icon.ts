/**
 * @lytjs/ui - Icon 组件
 *
 * 基础图标组件，支持多种尺寸和颜色
 */

import type { IconProps, IconSlots, IconSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

export const Icon = defineComponent({
  name: 'LytIcon',

  props: {
    name: { type: String, default: '' },
    size: { type: String, default: '16px' },
    color: { type: String, default: '' },
    spin: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: IconSlots }) {
    const p = props as unknown as IconSetupProps;

    const getIconClass = () => {
      const classes = ['lyt-icon'];
      if (p.name) classes.push(`lyt-icon--${p.name}`);
      if (p.spin) classes.push('lyt-icon--spin');
      if (p.class) classes.push(p.class);
      return classes.join(' ');
    };

    const getIconStyle = () => {
      const style: Record<string, string> = {};
      if (p.size) style.fontSize = p.size;
      if (p.color) style.color = p.color;
      if (p.style) {
        if (isString(p.style)) {
          return p.style;
        }
        if (isObject(p.style)) {
          Object.assign(style, p.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];

      if (slots.default) {
        children.push(...slots.default());
      }

      return createVNode(
        'i',
        mergeA11yProps(
          {
            id: p.id,
            'aria-label': p.ariaLabel,
            'aria-describedby': p.ariaDescribedBy,
          },
          {
            class: getIconClass(),
            style: getIconStyle(),
          },
        ),
        children,
      );
    };
  },
});

export type { IconProps, IconSlots };
