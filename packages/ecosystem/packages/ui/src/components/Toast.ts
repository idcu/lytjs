/**
 * @lytjs/ui - Toast 组件
 *
 * 轻提示组件，用于显示简短的消息提示
 */

import type { ToastProps, ToastSlots, ToastSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive } from '@lytjs/reactivity';

/**
 * Toast 组件
 */
export const Toast = defineComponent({
  name: 'LytToast',

  props: {
    message: { type: String, default: '' },
    type: { type: String, default: 'info' },
    duration: { type: Number, default: 3000 },
    position: { type: String, default: 'top' },
    icon: { type: String, default: '' },
    closable: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onClose: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as ToastSetupProps;
    const state = reactive({
      visible: true,
      timer: null as ReturnType<typeof setTimeout> | null,
    });

    const startTimer = () => {
      if (_props.duration > 0) {
        state.timer = setTimeout(() => {
          close();
        }, _props.duration);
      }
    };

    const clearTimer = () => {
      if (state.timer) {
        clearTimeout(state.timer as ReturnType<typeof setTimeout>);
        state.timer = null;
      }
    };

    const close = () => {
      state.visible = false;
      emit('close');
      _props.onClose?.();
    };

    const handleClose = (e: Event) => {
      e.stopPropagation();
      close();
    };

    const getToastClass = () => {
      const classes = ['lyt-toast'];
      classes.push(`lyt-toast--${_props.type}`);
      classes.push(`lyt-toast--${_props.position}`);
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getToastStyle = () => {
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

    // 启动定时器
    startTimer();

    return () => {
      if (!state.visible) return createVNode('div', { style: 'display: none;' }, []);

      const children: VNode[] = [];
      
      // 图标
      if (_props.icon) {
        children.push(createVNode('span', {
          class: 'lyt-toast__icon',
        }, [createVNode('span', {}, _props.icon)]));
      } else if (slots.icon) {
        const slotIcon = slots.icon();
        if (Array.isArray(slotIcon)) {
          children.push(createVNode('span', {
            class: 'lyt-toast__icon',
          }, slotIcon as VNode[]));
        }
      }

      // 消息内容
      if (_props.message) {
        children.push(createVNode('span', {
          class: 'lyt-toast__message',
        }, [createVNode('span', {}, _props.message)]));
      } else if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(createVNode('span', {
            class: 'lyt-toast__message',
          }, slotContent as VNode[]));
        }
      }

      // 关闭按钮
      if (_props.closable) {
        children.push(createVNode('span', {
          class: 'lyt-toast__close',
          onClick: handleClose,
        }, [createVNode('span', {}, '&times;')]));
      }

      return createVNode('div', {
        class: getToastClass(),
        style: getToastStyle(),
        onMouseenter: clearTimer,
        onMouseleave: startTimer,
      }, children);
    };
  },
});

export type { ToastProps, ToastSlots };
