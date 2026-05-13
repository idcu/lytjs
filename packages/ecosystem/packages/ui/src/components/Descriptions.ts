/**
 * @lytjs/ui - Descriptions 组件
 *
 * 描述列表组件，支持行列合并、垂直/水平布局、自适应、插槽自定义
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';

/**
 * Descriptions 项数据结构
 */
interface DescriptionsItemData {
  label: string;
  value: string;
  span?: number;
  labelStyle?: any;
  contentStyle?: any;
}

/**
 * Descriptions 组件
 */
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

  setup(props: any, { slots }: any) {
    // 生成类名
    const getDescriptionsClass = () => {
      const classes = ['lyt-descriptions'];
      if (props.border) classes.push('lyt-descriptions--bordered');
      if (props.size !== 'medium') classes.push(`lyt-descriptions--${props.size}`);
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    // 渲染表头
    const renderHeader = () => {
      if (!props.title && !slots.title) return null;
      return createVNode(
        'div',
        { class: 'lyt-descriptions__header' },
        slots.title ? slots.title() : props.title
      );
    };

    // 渲染项目
    const renderItem = (item: any, index: number) => {
      const label = item.label || (slots[`label-${index}`] ? slots[`label-${index}`]() : '');
      const content = slots[`content-${index}`] ? slots[`content-${index}`]() : item.value;
      
      return createVNode(
        'div',
        { 
          class: `lyt-descriptions__item ${props.border ? 'lyt-descriptions__item--bordered' : ''}`,
          style: { gridColumn: `span ${item.span || 1}` },
        },
        [
          createVNode(
            'div',
            { 
              class: `lyt-descriptions__label ${props.border ? 'lyt-descriptions__label--bordered' : ''}`,
              style: item.labelStyle,
            },
            label
          ),
          createVNode(
            'div',
            { 
              class: `lyt-descriptions__content ${props.border ? 'lyt-descriptions__content--bordered' : ''}`,
              style: item.contentStyle,
            },
            content
          ),
        ]
      );
    };

    // 渲染主体
    const renderBody = () => {
      const items: any[] = [];
      
      // 收集子项
      if (slots.default) {
        // 如果有插槽，使用插槽内容
        const defaultContent = slots.default();
        if (Array.isArray(defaultContent)) {
          items.push(...defaultContent);
        } else {
          items.push(defaultContent);
        }
      }

      return createVNode(
        'div',
        { 
          class: `lyt-descriptions__body ${props.layout === 'vertical' ? 'lyt-descriptions__body--vertical' : ''}`,
          style: { 
            display: 'grid',
            gridTemplateColumns: `repeat(${props.column}, 1fr)`,
            gap: props.border ? '0' : '16px 24px',
          },
        },
        items
      );
    };

    return () => {
      return createVNode(
        'div',
        { class: getDescriptionsClass() },
        [
          renderHeader(),
          renderBody(),
        ]
      );
    };
  },
});

/**
 * DescriptionsItem 组件
 */
export const DescriptionsItem = defineComponent({
  name: 'LytDescriptionsItem',

  props: {
    label: { type: String, default: '' },
    span: { type: Number, default: 1 },
    labelStyle: { type: Object, default: undefined },
    contentStyle: { type: Object, default: undefined },
  },

  setup(props: any, { slots }: any) {
    const label = props.label || (slots.label ? slots.label() : '');
    const content = slots.default ? slots.default() : '';

    return () => {
      return createVNode(
        'div',
        { 
          class: 'lyt-descriptions-item',
          style: { gridColumn: `span ${props.span}` },
        },
        [
          createVNode(
            'div',
            { 
              class: 'lyt-descriptions-item__label',
              style: props.labelStyle,
            },
            label
          ),
          createVNode(
            'div',
            { 
              class: 'lyt-descriptions-item__content',
              style: props.contentStyle,
            },
            content
          ),
        ]
      );
    };
  },
});

export default Descriptions;
export type { DescriptionsItemData };
