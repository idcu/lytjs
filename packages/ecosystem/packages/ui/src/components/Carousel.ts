/**
 * @lytjs/ui - Carousel 走马灯组件
 *
 * 走马灯组件，用于展示轮播内容
 */

import type { CarouselProps, CarouselSlots, CarouselSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

export const Carousel = defineComponent({
  name: 'LytCarousel',

  props: {
    initialIndex: { type: Number, default: 0 },
    height: { type: String, default: '300px' },
    trigger: { type: String as () => 'click' | 'hover', default: 'hover' },
    autoplay: { type: Boolean, default: true },
    interval: { type: Number, default: 3000 },
    indicatorPosition: { type: String as () => 'outside' | 'none', default: '' },
    arrow: { type: String as () => 'always' | 'hover' | 'never', default: 'hover' },
    type: { type: String as () => '' | 'card', default: '' },
    loop: { type: Boolean, default: true },
    direction: { type: String as () => 'horizontal' | 'vertical', default: 'horizontal' },
    class: { type: String, default: '' },
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as CarouselSetupProps;

    return () => {
      const children: VNode[] = [];

      const containerChildren: VNode[] = [];
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          containerChildren.push(...(slotContent as VNode[]));
        } else if (slotContent) {
          containerChildren.push(slotContent as VNode);
        }
      }
      children.push(createVNode('div', { class: 'lyt-carousel__container' }, containerChildren));

      const getCarouselClass = () => {
        const classes = ['lyt-carousel'];
        if (_props.type) classes.push(`lyt-carousel--${_props.type}`);
        if (_props.direction) classes.push(`lyt-carousel--${_props.direction}`);
        if (_props.indicatorPosition)
          classes.push(`lyt-carousel--indicator-${_props.indicatorPosition}`);
        if (_props.class) classes.push(_props.class);
        return classes.join(' ');
      };

      const getCarouselStyle = () => {
        const style: Record<string, string> = {};
        if (_props.height) {
          style.height = _props.height;
        }
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

      return createVNode(
        'div',
        mergeA11yProps(
          {
            id: _props.id,
            'aria-label': _props.ariaLabel,
            'aria-describedby': _props.ariaDescribedBy,
            role: 'region',
          },
          {
            class: getCarouselClass(),
            style: getCarouselStyle(),
          },
        ),
        children,
      );
    };
  },
});

export type { CarouselProps, CarouselSlots };
