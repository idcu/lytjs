import type { EmptyProps, EmptySlots, EmptySetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

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

  setup(props: Record<string, unknown>, { slots }: { slots: EmptySlots }) {
    const p = props as unknown as EmptySetupProps;

    const getEmptyClass = () => {
      const classes = ['lyt-empty'];
      if (p.class) classes.push(p.class);
      return classes.join(' ');
    };

    const getEmptyStyle = () => {
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
      
      if (slots.image) {
        children.push(createVNode('div', { class: 'lyt-empty__image' }, slots.image()));
      } else if (p.image) {
        children.push(createVNode('div', { class: 'lyt-empty__image' }, [
          createVNode('img', {
            src: p.image,
            alt: 'empty',
            style: { width: `${p.imageSize}px`, height: `${p.imageSize}px` },
          }),
        ]));
      } else {
        children.push(createVNode('div', { class: 'lyt-empty__image' }, [
          createVNode('svg', {
            viewBox: '0 0 400 320',
            class: 'lyt-empty__svg',
            style: { width: `${p.imageSize || 160}px`, height: `${(p.imageSize || 160) * 0.8}px` },
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

      if (slots.description) {
        children.push(createVNode('div', { class: 'lyt-empty__description' }, slots.description()));
      } else if (p.description) {
        children.push(createVNode('div', { class: 'lyt-empty__description' }, [createTextVNode(p.description)]));
      }

      if (slots.default) {
        children.push(createVNode('div', { class: 'lyt-empty__bottom' }, slots.default()));
      }

      return createVNode('div', mergeA11yProps({
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
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
