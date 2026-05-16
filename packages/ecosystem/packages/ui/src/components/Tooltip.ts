/**
 * @lytjs/ui - Tooltip 组件
 *
 * 文字提示组件，用于显示额外的提示信息
 */

import type { TooltipProps, TooltipSlots, TooltipSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

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

  setup(props: Record<string, unknown>, { slots }: { slots: TooltipSlots }) {
    const p = props as unknown as TooltipSetupProps;
    const state = reactive({
      visible: false,
    });
    let openTimer: ReturnType<typeof setTimeout> | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMouseEnter = () => {
      if (p.disabled || p.trigger !== 'hover') return;
      if (closeTimer) clearTimeout(closeTimer);
      if (p.openDelay && p.openDelay > 0) {
        openTimer = setTimeout(() => {
          state.visible = true;
        }, p.openDelay);
      } else {
        state.visible = true;
      }
    };

    const handleMouseLeave = () => {
      if (p.disabled || p.trigger !== 'hover') return;
      if (openTimer) clearTimeout(openTimer);
      if (p.closeDelay && p.closeDelay > 0) {
        closeTimer = setTimeout(() => {
          state.visible = false;
        }, p.closeDelay);
      } else {
        state.visible = false;
      }
    };

    const handleClick = () => {
      if (p.disabled || p.trigger !== 'click') return;
      state.visible = !state.visible;
    };

    const handleFocus = () => {
      if (p.disabled || p.trigger !== 'focus') return;
      state.visible = true;
    };

    const handleBlur = () => {
      if (p.disabled || p.trigger !== 'focus') return;
      state.visible = false;
    };

    const getTooltipClass = () => {
      const classes = ['lyt-tooltip'];
      classes.push(`lyt-tooltip--${p.placement}`);
      if (p.class) classes.push(p.class);
      return classes.join(' ');
    };

    const getTooltipStyle = () => {
      const style: Record<string, string> = {};
      if (p.style) {
        if (isString(p.style)) {
          return p.style;
        }
        if (isObject(p.style)) {
          Object.assign(style, p.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];
      
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

      if (state.visible && !p.disabled) {
        const contentChildren: VNode[] = [];
        
        if (p.showArrow) {
          contentChildren.push(createVNode('div', {
            class: 'lyt-tooltip__arrow',
          }, []));
        }

        if (p.content) {
          contentChildren.push(createVNode('div', {
            class: 'lyt-tooltip__content',
          }, [createTextVNode(p.content)]));
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
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
      }, {
        class: 'lyt-tooltip-wrapper',
      }), children);
    };
  },
});

export type { TooltipProps, TooltipSlots };
