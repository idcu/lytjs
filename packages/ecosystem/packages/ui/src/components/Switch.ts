/**
 * @lytjs/ui - Switch 组件
 *
 * 开关组件，用于表示两种状态的切换
 */

import type { SwitchProps, SwitchSlots, SwitchSetupProps } from './types';
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
    activeValue: { type: Boolean, default: true },
    inactiveValue: { type: Boolean, default: false },
    name: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as SwitchSetupProps;
    const state = reactive({
      focus: false,
    });

    const isChecked = computed(() => {
      return _props.modelValue === _props.activeValue;
    });

    const handleClick = () => {
      if (_props.disabled || _props.loading) return;
      
      const newValue = isChecked.value ? _props.inactiveValue : _props.activeValue;
      emit('update:modelValue', newValue);
      emit('change', newValue);
      _props.onChange?.(newValue as boolean);
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
      if (_props.disabled) classes.push('lyt-switch--disabled');
      if (_props.loading) classes.push('lyt-switch--loading');
      if (_props.size !== 'default') classes.push(`lyt-switch--${_props.size}`);
      if (state.focus) classes.push('lyt-switch--focus');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getSwitchStyle = () => {
      const style: Record<string, string> = {};
      if (_props.activeColor && isChecked.value) {
        style.backgroundColor = _props.activeColor;
      }
      if (_props.inactiveColor && !isChecked.value) {
        style.backgroundColor = _props.inactiveColor;
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

    return () => {
      const children: VNode[] = [];
      
      // 内部核心
      const coreChildren: VNode[] = [];
      
      // 左侧文字
      if (isChecked.value && _props.activeText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--left',
        }, [createVNode('span', {}, _props.activeText)]));
      } else if (!isChecked.value && _props.inactiveText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--left',
        }, [createVNode('span', {}, _props.inactiveText)]));
      } else if (slots.active && isChecked.value) {
        const slotContent = slots.active();
        if (Array.isArray(slotContent)) {
          coreChildren.push(createVNode('span', {
            class: 'lyt-switch__label lyt-switch__label--left',
          }, slotContent as VNode[]));
        }
      } else if (slots.inactive && !isChecked.value) {
        const slotContent = slots.inactive();
        if (Array.isArray(slotContent)) {
          coreChildren.push(createVNode('span', {
            class: 'lyt-switch__label lyt-switch__label--left',
          }, slotContent as VNode[]));
        }
      }

      // 开关按钮
      const buttonChildren: VNode[] = [];
      if (_props.loading) {
        buttonChildren.push(createVNode('span', {}, '◌'));
      }
      coreChildren.push(createVNode('span', {
        class: 'lyt-switch__core',
      }, [
        createVNode('span', {
          class: 'lyt-switch__button',
        }, buttonChildren),
      ]));

      // 右侧文字
      if (isChecked.value && _props.activeText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--right',
        }, [createVNode('span', {}, _props.activeText)]));
      } else if (!isChecked.value && _props.inactiveText) {
        coreChildren.push(createVNode('span', {
          class: 'lyt-switch__label lyt-switch__label--right',
        }, [createVNode('span', {}, _props.inactiveText)]));
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
        tabindex: _props.disabled ? -1 : 0,
      }, children);
    };
  },
});

export type { SwitchProps, SwitchSlots };
