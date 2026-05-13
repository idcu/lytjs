/**
 * @lytjs/ui - Switch 组件
 *
 * 开关组件，用于表示两种状态的切换
 */

import type { SwitchProps, SwitchSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, computed } from '@lytjs/reactivity';

/**
 * Switch 组件
 */
export const Switch = defineComponent({
  name: 'LytSwitch',

  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    size: { type: String, default: 'default' },
    activeText: { type: String, default: '' },
    inactiveText: { type: String, default: '' },
    activeColor: { type: String, default: '' },
    inactiveColor: { type: String, default: '' },
    activeValue: { type: [Boolean, String, Number], default: true },
    inactiveValue: { type: [Boolean, String, Number], default: false },
    name: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const state = reactive({
      focus: false,
    });

    const isChecked = computed(() => {
      return props.modelValue === props.activeValue;
    });

    const handleClick = () => {
      if (props.disabled || props.loading) return;
      
      const newValue = isChecked.value ? props.inactiveValue : props.activeValue;
      emit('update:modelValue', newValue);
      emit('change', newValue);
      props.onChange?.(newValue);
    };

    const handleFocus = () => {
      state.focus = true;
    };

    const handleBlur = () => {
      state.focus = false;
    };

    const getSwitchClass = () => {
      const classes = ['lyt-switch'];
      if (isChecked.value) classes.push('lyt-switch--checked');
      if (props.disabled) classes.push('lyt-switch--disabled');
      if (props.loading) classes.push('lyt-switch--loading');
      if (props.size !== 'default') classes.push(`lyt-switch--${props.size}`);
      if (state.focus) classes.push('lyt-switch--focus');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getSwitchStyle = () => {
      const style: Record<string, string> = {};
      if (props.activeColor && isChecked.value) {
        style.backgroundColor = props.activeColor;
      }
      if (props.inactiveColor && !isChecked.value) {
        style.backgroundColor = props.inactiveColor;
      }
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
      
      // 内部核心
      const coreChildren: VNode[] = [];
      
      // 左侧文字
      if (isChecked.value && props.activeText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--left',
        }, [props.activeText]));
      } else if (!isChecked.value && props.inactiveText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--left',
        }, [props.inactiveText]));
      } else if (slots.active && isChecked.value) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--left',
        }, slots.active()));
      } else if (slots.inactive && !isChecked.value) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--left',
        }, slots.inactive()));
      }

      // 开关按钮
      coreChildren.push(createVNode('span', {
        class: 'lyt-switch__core',
      }, [
        createVNode('span', {
          class: 'lyt-switch__button',
        }, props.loading ? ['◌'] : []),
      ]));

      // 右侧文字
      if (isChecked.value && props.activeText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--right',
        }, [props.activeText]));
      } else if (!isChecked.value && props.inactiveText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--right',
        }, [props.inactiveText]));
      }

      children.push(createVNode('div', {
        class: 'lyt-switch__wrapper',
      }, coreChildren));

      return createVNode('div', {
        class: getSwitchClass(),
        style: getSwitchStyle(),
        onClick: handleClick,
        onFocus: handleFocus,
        onBlur: handleBlur,
        tabindex: props.disabled ? -1 : 0,
      }, children);
    };
  },
});

export type { SwitchProps, SwitchSlots };
