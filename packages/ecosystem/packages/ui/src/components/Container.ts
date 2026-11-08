import type { ContainerProps, ContainerSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/core/runtime';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

export interface ContainerSetupProps {
  fluid: boolean;
  class: string;
  style: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
}

export const Container = defineComponent({
  name: 'LytContainer',

  props: {
    fluid: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: ContainerSlots }) {
    const p = props as unknown as ContainerSetupProps;

    const getContainerClass = () => {
      const classes = ['lyt-container'];
      if (p.fluid) {
        classes.push('lyt-container--fluid');
      }
      if (p.class) {
        classes.push(p.class);
      }
      return classes.join(' ');
    };

    const getContainerStyle = () => {
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
        children.push(...slots.default());
      }

      return createVNode(
        'div',
        mergeA11yProps(
          {
            id: p.id,
            'aria-label': p.ariaLabel,
            'aria-describedby': p.ariaDescribedBy,
          },
          {
            class: getContainerClass(),
            style: getContainerStyle(),
          },
        ),
        children,
      );
    };
  },
});

export type { ContainerProps, ContainerSlots };
