/**
 * @lytjs/ui - Breadcrumb 组件
 *
 * 面包屑导航组件，显示当前页面在网站层级中的位置
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, Fragment, type VNode } from '@lytjs/vdom';

export interface BreadcrumbItem {
  to?: string;
  replace?: boolean;
  disabled?: boolean;
}

export interface BreadcrumbItemSetupProps extends BreadcrumbItem {
  label: string;
}

export interface BreadcrumbItemSlots {
  default?: () => VNode[];
}

export const BreadcrumbItem = defineComponent({
  name: 'LytBreadcrumbItem',

  props: {
    to: { type: String, default: '' },
    replace: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' },
  },

  setup(props: BreadcrumbItemSetupProps, { slots }: { slots: BreadcrumbItemSlots }) {
    const handleClick = () => {
      if (props.disabled) return;
      if (props.to) {
        if (props.replace) {
          window.location.replace(props.to);
        } else {
          window.location.href = props.to;
        }
      }
    };

    return () => {
      return createVNode(Fragment, {}, [
        createVNode('span', {
          class: [
            'lyt-breadcrumb__item',
            props.disabled ? 'lyt-breadcrumb__item--disabled' : '',
          ].filter(Boolean).join(' '),
          onClick: handleClick,
        }, [
          slots.default ? slots.default() : props.label,
        ]),
      ]);
    };
  },
});

export interface BreadcrumbProps {
  separator: string;
  separatorClass: string;
}

export interface BreadcrumbSlots {
  default?: () => VNode[];
}

export const Breadcrumb = defineComponent({
  name: 'LytBreadcrumb',

  props: {
    separator: { type: String, default: '/' },
    separatorClass: { type: String, default: '' },
  },

  setup(_props: BreadcrumbProps, { slots }: { slots: BreadcrumbSlots }) {
    return () => {
      const items = slots.default?.() || [];
      
      const content: VNode[] = [];
      
      items.forEach((item, index) => {
        if (index > 0) {
          content.push(createVNode('span', {
            class: ['lyt-breadcrumb__separator', _props.separatorClass].filter(Boolean).join(' '),
          }, [_props.separator]));
        }
        content.push(item);
      });

      return createVNode('div', { class: 'lyt-breadcrumb' }, [
        content,
      ]);
    };
  },
});

export type { BreadcrumbProps, BreadcrumbSlots, BreadcrumbItemProps, BreadcrumbItemSlots } from './types';
