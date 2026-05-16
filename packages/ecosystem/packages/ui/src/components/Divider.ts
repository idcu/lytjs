import type { DividerProps, DividerSlots, DividerSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

export const Divider = defineComponent({
  name: 'LytDivider',

  props: {
    type: { type: String, default: 'horizontal' },
    contentPosition: { type: String, default: 'center' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: DividerSlots }) {
    const p = props as unknown as DividerSetupProps;

    const getDividerClass = () => {
      const classes = ['lyt-divider'];
      if (p.type !== 'horizontal') {
        classes.push(`lyt-divider--${p.type}`);
      }
      if (slots.default) {
        classes.push(`lyt-divider--${p.contentPosition}`);
      }
      if (p.class) {
        classes.push(p.class);
      }
      return classes.join(' ');
    };

    const getDividerStyle = () => {
      if (!p.style) return undefined;
      if (isString(p.style)) return p.style;
      if (isObject(p.style)) {
        return Object.entries(p.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];
      
      if (slots.default) {
        children.push(createVNode('span', { class: 'lyt-divider__text' }, slots.default()));
      }

      return createVNode('div', mergeA11yProps({
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
        role: 'separator',
      }, {
        class: getDividerClass(),
        style: getDividerStyle(),
      }), children);
    };
  },
});

export type { DividerProps, DividerSlots };
