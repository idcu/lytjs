/**
 * @lytjs/ui - Checkbox 组件
 *
 * 复选框组件，用于多选场景
 */

import type { CheckboxProps, CheckboxSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject, isArray } from '@lytjs/common-is';
import { reactive, computed } from '@lytjs/reactivity';

/**
 * Checkbox 组件
 */
export const Checkbox = defineComponent({
  name: 'LytCheckbox',

  props: {
    modelValue: { type: [Boolean, Array], default: false },
    label: { type: String, default: '' },
    trueLabel: { type: [String, Number], default: undefined },
    falseLabel: { type: [String, Number], default: undefined },
    disabled: { type: Boolean, default: false },
    checked: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
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
      if (isArray(props.modelValue)) {
        return props.modelValue.includes(props.label || props.trueLabel);
      }
      return props.modelValue || props.checked;
    });

    const handleChange = (e: Event) => {
      if (props.disabled) return;
      
      const target = e.target as HTMLInputElement;
      let newValue;
      
      if (isArray(props.modelValue)) {
        newValue = [...props.modelValue];
        const value = props.label || props.trueLabel;
        if (target.checked) {
          if (!newValue.includes(value)) {
            newValue.push(value);
          }
        } else {
          const index = newValue.indexOf(value);
          if (index > -1) {
            newValue.splice(index, 1);
          }
        }
      } else {
        newValue = target.checked;
      }
      
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

    const getCheckboxClass = () => {
      const classes = ['lyt-checkbox'];
      if (isChecked.value) classes.push('lyt-checkbox--checked');
      if (props.disabled) classes.push('lyt-checkbox--disabled');
      if (props.indeterminate) classes.push('lyt-checkbox--indeterminate');
      if (state.focus) classes.push('lyt-checkbox--focus');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getCheckboxStyle = () => {
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
        type: 'checkbox',
        class: 'lyt-checkbox__input',
        checked: isChecked.value,
        disabled: props.disabled,
        name: props.name,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
      }, []));

      // 自定义的复选框样式
      children.push(createVNode('span', {
        class: 'lyt-checkbox__inner',
      }, []));

      // 标签内容
      if (props.label) {
        children.push(createVNode('span', {
          class: 'lyt-checkbox__label',
        }, [props.label]));
      } else if (slots.default) {
        children.push(createVNode('span', {
          class: 'lyt-checkbox__label',
        }, slots.default()));
      }

      return createVNode('label', {
        class: getCheckboxClass(),
        style: getCheckboxStyle(),
      }, children);
    };
  },
});

export type { CheckboxProps, CheckboxSlots };
