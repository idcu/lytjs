/**
 * @lytjs/ui - Descriptions 组件
 *
 * 描述列表组件，支持行列合并、垂直/水平布局、自适应、插槽自定义
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import type {
  DescriptionsSetupProps,
  DescriptionsSlots,
  DescriptionsItemSetupProps,
  DescriptionsItemSlots,
} from './types';

interface DescriptionsItemData {
  label: string;
  value: string;
  span?: number;
  labelStyle?: Record<string, string>;
  contentStyle?: Record<string, string>;
}

export const Descriptions = defineComponent({
  name: 'LytDescriptions',

  props: {
    title: { type: String, default: '' },
    column: { type: Number, default: 3 },
    border: { type: Boolean, default: false },
    size: { type: String, default: 'medium' },
    layout: { type: String, default: 'horizontal' },
    class: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: DescriptionsSlots }) {
    const p = props as DescriptionsSetupProps;

    return () => {
      const resultChildren: VNode[] = [];

      if (p.title || slots.title) {
        const titleContent: VNode[] = [];
        if (slots.title) {
          titleContent.push(...slots.title());
        } else {
          titleContent.push(createVNode('span', {}, String(p.title)));
        }
        resultChildren.push(
          createVNode('div', { class: 'lyt-descriptions__header' }, titleContent),
        );
      }

      const bodyChildren: VNode[] = [];

      if (slots.default) {
        bodyChildren.push(...slots.default());
      }

      resultChildren.push(
        createVNode(
          'div',
          {
            class: `lyt-descriptions__body ${p.layout === 'vertical' ? 'lyt-descriptions__body--vertical' : ''}`,
            style: {
              display: 'grid',
              gridTemplateColumns: `repeat(${p.column}, 1fr)`,
              gap: p.border ? '0' : '16px 24px',
            },
          },
          bodyChildren,
        ),
      );

      return createVNode(
        'div',
        {
          class: [
            'lyt-descriptions',
            p.border ? 'lyt-descriptions--bordered' : '',
            p.size !== 'medium' ? `lyt-descriptions--${p.size}` : '',
            p.class,
          ]
            .filter(Boolean)
            .join(' '),
        },
        resultChildren,
      );
    };
  },
});

export const DescriptionsItem = defineComponent({
  name: 'LytDescriptionsItem',

  props: {
    label: { type: String, default: '' },
    span: { type: Number, default: 1 },
    labelStyle: { type: Object, default: undefined },
    contentStyle: { type: Object, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: DescriptionsItemSlots }) {
    const p = props as DescriptionsItemSetupProps;

    return () => {
      const labelContent: VNode[] = [];
      if (slots.label) {
        labelContent.push(...slots.label());
      } else if (p.label) {
        labelContent.push(createVNode('span', {}, String(p.label)));
      }

      const contentContent: VNode[] = [];
      if (slots.default) {
        contentContent.push(...slots.default());
      }

      return createVNode(
        'div',
        {
          class: 'lyt-descriptions-item',
          style: { gridColumn: `span ${p.span}` },
        },
        [
          createVNode(
            'div',
            {
              class: 'lyt-descriptions-item__label',
              style: p.labelStyle,
            },
            labelContent.length > 0 ? labelContent : [createVNode('span', {}, '')],
          ),
          createVNode(
            'div',
            {
              class: 'lyt-descriptions-item__content',
              style: p.contentStyle,
            },
            contentContent.length > 0 ? contentContent : [createVNode('span', {}, '')],
          ),
        ],
      );
    };
  },
});

export default Descriptions;
export type { DescriptionsItemData };
export type {
  DescriptionsProps,
  DescriptionsSlots,
  DescriptionsSetupProps,
  DescriptionsItemProps,
  DescriptionsItemSlots,
  DescriptionsItemSetupProps,
} from './types';
