/**
 * @lytjs/ui - InputNumber 组件
 *
 * 数字输入框组件，用于数值输入
 */

import type { InputNumberProps, InputNumberSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject, isNumber } from '@lytjs/common-is';
import { reactive, computed, watch } from '@lytjs/reactivity';

/**
 * InputNumber 组件
 */
export const InputNumber = defineComponent({
  name: 'LytInputNumber',

  props: {
    modelValue: { type: Number, default: undefined },
    min: { type: Number, default: -Infinity },
    max: { type: Number, default: Infinity },
    step: { type: Number, default: 1 },
    stepStrictly: { type: Boolean, default: false },
    precision: { type: Number, default: undefined },
    size: { type: String, default: 'default' },
    disabled: { type: Boolean, default: false },
    controls: { type: Boolean, default: true },
    controlsPosition: { type: String, default: '' },
    name: { type: String, default: '' },
    label: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onInput: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const state = reactive({
      inputValue: props.modelValue,
      focus: false,
    });

    const displayValue = computed(() => {
      if (state.inputValue === undefined || state.inputValue === null) {
        return '';
      }
      if (props.precision !== undefined) {
        return state.inputValue.toFixed(props.precision);
      }
      return String(state.inputValue);
    });

    const isAtMin = computed(() => {
      return state.inputValue !== undefined && state.inputValue <= props.min;
    });

    const isAtMax = computed(() => {
      return state.inputValue !== undefined && state.inputValue >= props.max;
    });

    const ensurePrecision = (value: number): number => {
      if (props.precision !== undefined) {
        const factor = Math.pow(10, props.precision);
        return Math.round(value * factor) / factor;
      }
      return value;
    };

    const ensureStep = (value: number): number => {
      if (props.stepStrictly) {
        const steps = Math.round(value / props.step);
        return ensurePrecision(steps * props.step);
      }
      return ensurePrecision(value);
    };

    const clampValue = (value: number): number => {
      let result = value;
      if (result < props.min) result = props.min;
      if (result > props.max) result = props.max;
      return ensureStep(result);
    };

    const setValue = (value: number | undefined) => {
      if (value === undefined) {
        state.inputValue = undefined;
        emit('update:modelValue', undefined);
        emit('change', undefined);
        props.onChange?.(undefined);
        return;
      }
      
      const newValue = clampValue(value);
      state.inputValue = newValue;
      emit('update:modelValue', newValue);
      emit('change', newValue);
      props.onChange?.(newValue);
    };

    const handleIncrement = () => {
      if (props.disabled || isAtMax.value) return;
      const newValue = (state.inputValue || 0) + props.step;
      setValue(newValue);
    };

    const handleDecrement = () => {
      if (props.disabled || isAtMin.value) return;
      const newValue = (state.inputValue || 0) - props.step;
      setValue(newValue);
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      
      if (value === '') {
        state.inputValue = undefined;
        emit('update:modelValue', undefined);
        emit('input', undefined);
        props.onInput?.(undefined);
        return;
      }
      
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        state.inputValue = numValue;
        emit('input', numValue);
        props.onInput?.(numValue);
      }
    };

    const handleBlur = (e: Event) => {
      state.focus = false;
      const target = e.target as HTMLInputElement;
      const value = target.value;
      
      if (value === '') {
        setValue(undefined);
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setValue(numValue);
        }
      }
    };

    const handleFocus = () => {
      state.focus = true;
    };

    watch(() => props.modelValue, (newValue) => {
      if (newValue !== state.inputValue) {
        state.inputValue = newValue;
      }
    });

    const getInputNumberClass = () => {
      const classes = ['lyt-input-number'];
      if (props.size !== 'default') classes.push(`lyt-input-number--${props.size}`);
      if (props.disabled) classes.push('lyt-input-number--disabled');
      if (state.focus) classes.push('lyt-input-number--focus');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getInputNumberStyle = () => {
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
      
      // 减号按钮
      if (props.controls) {
        children.push(createVNode('span', {
          class: `lyt-input-number__decrease ${isAtMin.value ? 'is-disabled' : ''}`,
          onClick: handleDecrement,
        }, ['−']));
      }

      // 加号按钮
      if (props.controls) {
        children.push(createVNode('span', {
          class: `lyt-input-number__increase ${isAtMax.value ? 'is-disabled' : ''}`,
          onClick: handleIncrement,
        }, ['+']));
      }

      // 输入框
      children.push(createVNode('input', {
        type: 'text',
        class: 'lyt-input-number__input',
        value: displayValue.value,
        disabled: props.disabled,
        placeholder: props.placeholder,
        name: props.name,
        onInput: handleInput,
        onBlur: handleBlur,
        onFocus: handleFocus,
      }, []));

      return createVNode('div', {
        class: getInputNumberClass(),
        style: getInputNumberStyle(),
      }, children);
    };
  },
});

export type { InputNumberProps, InputNumberSlots };
