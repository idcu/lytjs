/**
 * @lytjs/ui - Breadcrumb 面包屑组件
 *
 * 面包屑导航组件，显示当前页面在网站层级中的位置
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';

export const BreadcrumbItem = defineComponent({
  name: 'LytBreadcrumbItem',

  props: {
    to: { type: String, default: '' },
    replace: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>) {
    const handleClick = () => {
      if (props.disabled) return;
      if (props.to) {
        if (props.replace) {
          window.location.replace(props.to as string);
        } else {
          window.location.href = props.to as string;
        }
      }
    };

    return () => {
      const children: VNode[] = [];
      if (props.label) {
        children.push(createVNode('span', {}, props.label as string));
      }

      return createVNode(
        'span',
        {
          class: ['lyt-breadcrumb__item', props.disabled ? 'lyt-breadcrumb__item--disabled' : '']
            .filter(Boolean)
            .join(' '),
          onClick: handleClick,
        },
        children,
      );
    };
  },
});

export const Breadcrumb = defineComponent({
  name: 'LytBreadcrumb',

  props: {
    separator: { type: String, default: '/' },
    separatorClass: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>) {
    return () => {
      const items: VNode[] = [];

      const content: VNode[] = [];

      items.forEach((item, index) => {
        if (index > 0) {
          content.push(
            createVNode(
              'span',
              {
                class: ['lyt-breadcrumb__separator', props.separatorClass as string]
                  .filter(Boolean)
                  .join(' '),
              },
              [createVNode('span', {}, props.separator as string)],
            ),
          );
        }
        content.push(item as VNode);
      });

      return createVNode('div', { class: 'lyt-breadcrumb' }, content);
    };
  },
});
