/**
 * @lytjs/ui - Tooltip 组件
 *
 * 文字提示组件，用于显示额外的提示信息
 */

import type { TooltipProps, TooltipSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Tooltip 组件
 */
export const Tooltip = defineComponent({
  name: 'LytTooltip',

  props: {
    content: { type: String, default: '' },
    placement: { type: String, default: 'top' },
    trigger: { type: String, default: 'hover' },
    disabled: { type: Boolean, default: false },
    openDelay: { type: Number, default: 0 },
    closeDelay: { type: Number, default: 0 },
    showArrow: { type: Boolean, default: true },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    const state = reactive({
      visible: false,
      openTimer: null as any,
      closeTimer: null as any,
    });

    const handleMouseEnter = () => {
      if (props.disabled || props.trigger !== 'hover') return;
      clearTimeout(state.closeTimer);
      if (props.openDelay > 0) {
        state.openTimer = setTimeout(() => {
          state.visible = true;
        }, props.openDelay);
      } else {
        state.visible = true;
      }
    };

    const handleMouseLeave = () => {
      if (props.disabled || props.trigger !== 'hover') return;
      clearTimeout(state.openTimer);
      if (props.closeDelay > 0) {
        state.closeTimer = setTimeout(() => {
          state.visible = false;
        }, props.closeDelay);
      } else {
        state.visible = false;
      }
    };

    const handleClick = () => {
      if (props.disabled || props.trigger !== 'click') return;
      state.visible = !state.visible;
    };

    const handleFocus = () => {
      if (props.disabled || props.trigger !== 'focus') return;
      state.visible = true;
    };

    const handleBlur = () => {
      if (props.disabled || props.trigger !== 'focus') return;
      state.visible = false;
    };

    const getTooltipClass = () => {
      const classes = ['lyt-tooltip'];
      classes.push(`lyt-tooltip--${props.placement}`);
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getTooltipStyle = () => {
      const style: Record<string, string> = {};
      if (props.style) {
        if (isString(props.style)) {
          return props.style;
        }
        if (isObject(props.style)) {
          Object.assign(style, props.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];
      
      // 触发元素
      if (slots.default) {
        children.push(createVNode('div', {
          class: 'lyt-tooltip__trigger',
          onMouseenter: handleMouseEnter,
          onMouseleave: handleMouseLeave,
          onClick: handleClick,
          onFocus: handleFocus,
          onBlur: handleBlur,
        }, slots.default()));
      }

      // 提示内容
      if (state.visible && !props.disabled) {
        const contentChildren: VNode[] = [];
        
        // 箭头
        if (props.showArrow) {
          contentChildren.push(createVNode('div', {
            class: 'lyt-tooltip__arrow',
          }, []));
        }

        // 内容
        if (props.content) {
          contentChildren.push(createVNode('div', {
            class: 'lyt-tooltip__content',
          }, [props.content]));
        } else if (slots.content) {
          contentChildren.push(createVNode('div', {
            class: 'lyt-tooltip__content',
          }, slots.content()));
        }

        children.push(createVNode('div', {
          class: getTooltipClass(),
          style: getTooltipStyle(),
        }, contentChildren));
      }

      return createVNode('div', mergeA11yProps({
        id: props.id,
        'aria-label': props.ariaLabel,
        'aria-describedby': props.ariaDescribedBy,
      }, {
        class: 'lyt-tooltip-wrapper',
      }), children);
    };
  },
});

export type { TooltipProps, TooltipSlots };
