/**
 * @lytjs/ui - Radio 组件
 *
 * 单选框组件，用于单选场景
 */

import type { RadioProps, RadioSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, computed } from '@lytjs/reactivity';

/**
 * Radio 组件
 */
export const Radio = defineComponent({
  name: 'LytRadio',

  props: {
    modelValue: { type: [String, Number, Boolean], default: undefined },
    label: { type: [String, Number, Boolean], default: undefined },
    disabled: { type: Boolean, default: false },
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
      return props.modelValue === props.label;
    });

    const handleChange = (e: Event) => {
      if (props.disabled) return;
      
      const newValue = props.label;
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

    const getRadioClass = () => {
      const classes = ['lyt-radio'];
      if (isChecked.value) classes.push('lyt-radio--checked');
      if (props.disabled) classes.push('lyt-radio--disabled');
      if (state.focus) classes.push('lyt-radio--focus');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getRadioStyle = () => {
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
      
      // 实际的 input 元素（隐藏）
      children.push(createVNode('input', {
        type: 'radio',
        class: 'lyt-radio__input',
        checked: isChecked.value,
        disabled: props.disabled,
        name: props.name,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
      }, []));

      // 自定义的单选框样式
      children.push(createVNode('span', {
        class: 'lyt-radio__inner',
      }, []));

      // 标签内容
      if (props.label !== undefined) {
        children.push(createVNode('span', {
          class: 'lyt-radio__label',
        }, [String(props.label)]));
      } else if (slots.default) {
        children.push(createVNode('span', {
          class: 'lyt-radio__label',
        }, slots.default()));
      }

      return createVNode('label', {
        class: getRadioClass(),
        style: getRadioStyle(),
      }, children);
    };
  },
});

export type { RadioProps, RadioSlots };
