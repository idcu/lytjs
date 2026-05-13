/**
 * @lytjs/ui - Alert 组件
 *
 * 警告提示组件，用于显示重要的提示信息
 */

import type { AlertProps, AlertSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive } from '@lytjs/reactivity';

/**
 * Alert 组件
 */
export const Alert = defineComponent({
  name: 'LytAlert',

  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    type: { type: String, default: 'info' },
    closable: { type: Boolean, default: false },
    showIcon: { type: Boolean, default: true },
    effect: { type: String, default: 'light' },
    center: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onClose: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const state = reactive({
      visible: true,
    });

    const handleClose = (e: Event) => {
      e.stopPropagation();
      state.visible = false;
      emit('close');
      props.onClose?.();
    };

    const getAlertClass = () => {
      const classes = ['lyt-alert'];
      classes.push(`lyt-alert--${props.type}`);
      classes.push(`lyt-alert--${props.effect}`);
      if (props.center) classes.push('lyt-alert--center');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getAlertStyle = () => {
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

    const getIcon = () => {
      const icons: Record<string, string> = {
        success: '✓',
        warning: '⚠',
        error: '✕',
        info: 'ℹ',
      };
      return icons[props.type] || icons.info;
    };

    return () => {
      if (!state.visible) return null;

      const children: VNode[] = [];
      
      // 图标
      if (props.showIcon) {
        children.push(createVNode('span', {
          class: 'lyt-alert__icon',
        }, [getIcon()]));
      } else if (slots.icon) {
        children.push(createVNode('span', {
          class: 'lyt-alert__icon',
        }, slots.icon()));
      }

      // 内容区域
      const contentChildren: VNode[] = [];
      
      // 标题
      if (props.title) {
        contentChildren.push(createVNode('span', {
          class: 'lyt-alert__title',
        }, [props.title]));
      } else if (slots.title) {
        contentChildren.push(createVNode('span', {
          class: 'lyt-alert__title',
        }, slots.title()));
      }

      // 描述
      if (props.description) {
        contentChildren.push(createVNode('p', {
          class: 'lyt-alert__description',
        }, [props.description]));
      } else if (slots.description) {
        contentChildren.push(createVNode('p', {
          class: 'lyt-alert__description',
        }, slots.description()));
      } else if (slots.default) {
        contentChildren.push(...slots.default());
      }

      if (contentChildren.length > 0) {
        children.push(createVNode('div', {
          class: 'lyt-alert__content',
        }, contentChildren));
      }

      // 关闭按钮
      if (props.closable) {
        children.push(createVNode('span', {
          class: 'lyt-alert__close',
          onClick: handleClose,
        }, ['&times;']));
      }

      return createVNode('div', {
        class: getAlertClass(),
        style: getAlertStyle(),
      }, children);
    };
  },
});

export type { AlertProps, AlertSlots };
