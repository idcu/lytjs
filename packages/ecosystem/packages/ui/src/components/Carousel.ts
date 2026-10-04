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
    // ⚠️ 2026-10-04 移除**一批「配置了不存在功能」的 prop**：
    //   `initialIndex` / `trigger` / `autoplay` / `interval` / `arrow` / `loop` /
    //   `onChange` 描述的是**轮播功能**（当前索引、切换、自动播放、指示器），
    //   而本组件的 `setup` 里**响应式原语 = 0、事件处理器 = 0** ⇒
    //   这些 prop 一直是**静默无效**的（传了毫无反应）。
    //   与其留着让类型面说谎，不如删掉；待真正实现轮播时再加回（附行为判据）。
    height: { type: String, default: '300px' },
    indicatorPosition: { type: String as () => 'outside' | 'none', default: '' },
    type: { type: String as () => '' | 'card', default: '' },
    direction: { type: String as () => 'horizontal' | 'vertical', default: 'horizontal' },
    class: { type: String, default: '' },
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
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
