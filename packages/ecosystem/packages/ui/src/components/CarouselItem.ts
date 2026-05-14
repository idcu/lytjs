/**
 * @lytjs/ui - CarouselItem 走马灯项组件
 *
 * 走马灯项组件，与 Carousel 配合使用
 */

import type { CarouselItemProps, CarouselItemSlots, CarouselItemSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * CarouselItem 走马灯项组件
 */
export const CarouselItem = defineComponent({
  name: 'LytCarouselItem',

  props: {
    name: { type: [String, Number], default: '' },
    label: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as CarouselItemSetupProps;

    const getCarouselItemClass = () => {
      const classes = ['lyt-carousel-item'];
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getCarouselItemStyle = () => {
      const style: Record<string, string> = {};
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];
      
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(...slotContent);
        }
      }

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel || _props.label,
        'aria-describedby': _props.ariaDescribedBy,
      }, {
        class: getCarouselItemClass(),
        style: getCarouselItemStyle(),
      }), children);
    };
  },
});

export type { CarouselItemProps, CarouselItemSlots };
