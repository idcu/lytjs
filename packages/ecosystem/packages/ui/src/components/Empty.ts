/**
 * @lytjs/ui - Empty 组件
 *
 * 空状态组件，用于展示无数据的状态
 */

import type { EmptyProps, EmptySlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Empty 组件
 */
export const Empty = defineComponent({
  name: 'LytEmpty',

  props: {
    description: { type: String, default: '暂无数据' },
    image: { type: String, default: '' },
    imageSize: { type: Number, default: 160 },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    const getEmptyClass = () => {
      const classes = ['lyt-empty'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getEmptyStyle = () => {
      if (!props.style) return undefined;
      if (isString(props.style)) return props.style;
      if (isObject(props.style)) {
        return Object.entries(props.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];
      
      // 图片区域
      if (slots.image) {
        children.push(createVNode('div', { class: 'lyt-empty__image' }, slots.image()));
      } else if (props.image) {
        children.push(createVNode('div', { class: 'lyt-empty__image' }, [
          createVNode('img', {
            src: props.image,
            alt: 'empty',
            style: { width: `${props.imageSize}px`, height: `${props.imageSize}px` },
          }),
        ]));
      } else {
        // 默认 SVG 图标
        children.push(createVNode('div', { class: 'lyt-empty__image' }, [
          createVNode('svg', {
            viewBox: '0 0 400 320',
            class: 'lyt-empty__svg',
            style: { width: `${props.imageSize}px`, height: `${props.imageSize * 0.8}px` },
          }, [
            createVNode('g', { fill: 'none', 'fill-rule': 'evenodd' }, [
              createVNode('g', { transform: 'translate(40 40)' }, [
                createVNode('ellipse', { fill: 'var(--lyt-color-info)', opacity: '0.2', cx: '160', cy: '140', rx: '160', ry: '140' }),
                createVNode('path', { d: 'M160 0C71.6 0 0 62.7 0 140s71.6 140 160 140 160-62.7 160-140S248.4 0 160 0z', fill: 'var(--lyt-color-info)', opacity: '0.15' }),
                createVNode('g', { fill: 'var(--lyt-color-info)' }, [
                  createVNode('path', { d: 'M184 104a8 8 0 0 1 8 8v24a8 8 0 0 1-16 0v-24a8 8 0 0 1 8-8z', opacity: '0.3' }),
                  createVNode('path', { d: 'M128 104a8 8 0 0 1 8 8v24a8 8 0 0 1-16 0v-24a8 8 0 0 1 8-8z', opacity: '0.3' }),
                  createVNode('path', { d: 'M216 184H104a8 8 0 0 1-8-8v-16a8 8 0 0 1 8-8h112a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8z', opacity: '0.2' }),
                ]),
              ]),
            ]),
          ]),
        ]));
      }

      // 描述区域
      if (slots.description) {
        children.push(createVNode('div', { class: 'lyt-empty__description' }, slots.description()));
      } else if (props.description) {
        children.push(createVNode('div', { class: 'lyt-empty__description' }, [props.description]));
      }

      // 底部内容
      if (slots.default) {
        children.push(createVNode('div', { class: 'lyt-empty__bottom' }, slots.default()));
      }

      return createVNode('div', mergeA11yProps({
        id: props.id,
        'aria-label': props.ariaLabel,
        'aria-describedby': props.ariaDescribedBy,
        role: 'status',
        'aria-live': 'polite',
      }, {
        class: getEmptyClass(),
        style: getEmptyStyle(),
      }), children);
    };
  },
});

export type { EmptyProps, EmptySlots };
