/**
 * @lytjs/ui - Toast 组件
 *
 * 轻提示组件，用于显示简短的消息提示
 */

import type { ToastProps, ToastSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, onMounted, onUnmounted } from '@lytjs/reactivity';

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

  setup(props: any, { slots, emit }: any) {
    const state = reactive({
      visible: true,
      timer: null as any,
    });

    const startTimer = () => {
      if (props.duration > 0) {
        state.timer = setTimeout(() => {
          close();
        }, props.duration);
      }
    };

    const clearTimer = () => {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    };

    const close = () => {
      state.visible = false;
      emit('close');
      props.onClose?.();
    };

    const handleClose = (e: Event) => {
      e.stopPropagation();
      close();
    };

    const getToastClass = () => {
      const classes = ['lyt-toast'];
      classes.push(`lyt-toast--${props.type}`);
      classes.push(`lyt-toast--${props.position}`);
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getToastStyle = () => {
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

    onMounted(() => {
      startTimer();
    });

    onUnmounted(() => {
      clearTimer();
    });

    return () => {
      if (!state.visible) return null;

      const children: VNode[] = [];
      
      // 图标
      if (props.icon) {
        children.push(createVNode('span', {
          class: 'lyt-toast__icon',
        }, [props.icon]));
      } else if (slots.icon) {
        children.push(createVNode('span', {
          class: 'lyt-toast__icon',
        }, slots.icon()));
      }

      // 消息内容
      if (props.message) {
        children.push(createVNode('span', {
          class: 'lyt-toast__message',
        }, [props.message]));
      } else if (slots.default) {
        children.push(createVNode('span', {
          class: 'lyt-toast__message',
        }, slots.default()));
      }

      // 关闭按钮
      if (props.closable) {
        children.push(createVNode('span', {
          class: 'lyt-toast__close',
          onClick: handleClose,
        }, ['&times;']));
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
