/**
 * @lytjs/ui - InputNumber 组件
 *
 * 数字输入框组件，用于数值输入
 */

import type { InputNumberProps, InputNumberSlots, InputNumberSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, computed, watch } from '@lytjs/reactivity';
import { getSpinbuttonA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaRequired: { type: Boolean, default: false },
    ariaInvalid: { type: Boolean, default: false },
    tabIndex: { type: Number, default: undefined },
    onChange: { type: Function, default: undefined },
    onInput: { type: Function, default: undefined },
    onKeydown: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { emit }) {
    const _props = props as InputNumberSetupProps;
    const state = reactive({
      inputValue: _props.modelValue,
      focus: false,
    });

    const displayValue = computed(() => {
      if (state.inputValue === undefined || state.inputValue === null) {
        return '';
      }
      if (_props.precision !== undefined) {
        return state.inputValue.toFixed(_props.precision);
      }
      return String(state.inputValue);
    });

    const isAtMin = computed(() => {
      return state.inputValue !== undefined && state.inputValue <= _props.min;
    });

    const isAtMax = computed(() => {
      return state.inputValue !== undefined && state.inputValue >= _props.max;
    });

    const ensurePrecision = (value: number): number => {
      if (_props.precision !== undefined) {
        const factor = Math.pow(10, _props.precision);
        return Math.round(value * factor) / factor;
      }
      return value;
    };

    const ensureStep = (value: number): number => {
      if (_props.stepStrictly) {
        const steps = Math.round(value / _props.step);
        return ensurePrecision(steps * _props.step);
      }
      return ensurePrecision(value);
    };

    const clampValue = (value: number): number => {
      let result = value;
      if (result < _props.min) result = _props.min;
      if (result > _props.max) result = _props.max;
      return ensureStep(result);
    };

    const setValue = (value: number | undefined) => {
      if (value === undefined) {
        state.inputValue = undefined;
        emit('update:modelValue', undefined);
        emit('change', undefined);
        _props.onChange?.(undefined);
        return;
      }

      const newValue = clampValue(value);
      state.inputValue = newValue;
      emit('update:modelValue', newValue);
      emit('change', newValue);
      _props.onChange?.(newValue);
    };

    const handleIncrement = () => {
      if (_props.disabled || isAtMax.value) return;
      const newValue = (state.inputValue || 0) + _props.step;
      setValue(newValue);
    };

    const handleDecrement = () => {
      if (_props.disabled || isAtMin.value) return;
      const newValue = (state.inputValue || 0) - _props.step;
      setValue(newValue);
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;

      if (value === '') {
        state.inputValue = undefined;
        emit('update:modelValue', undefined);
        emit('input', undefined);
        _props.onInput?.(undefined);
        return;
      }

      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        state.inputValue = numValue;
        emit('input', numValue);
        _props.onInput?.(numValue);
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

    const handleKeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleIncrement();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleDecrement();
          break;
        case 'Home':
          if (_props.min !== -Infinity) {
            e.preventDefault();
            setValue(_props.min);
          }
          break;
        case 'End':
          if (_props.max !== Infinity) {
            e.preventDefault();
            setValue(_props.max);
          }
          break;
      }
      _props.onKeydown?.(e);
    };

    watch(
      () => _props.modelValue,
      (newValue) => {
        if (newValue !== state.inputValue) {
          state.inputValue = newValue;
        }
      },
    );

    const getInputNumberClass = () => {
      const classes = ['lyt-input-number'];
      if (_props.size !== 'default') classes.push(`lyt-input-number--${_props.size}`);
      if (_props.disabled) classes.push('lyt-input-number--disabled');
      if (state.focus) classes.push('lyt-input-number--focus');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getInputNumberStyle = () => {
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

    return () => {
      const children: VNode[] = [];

      // 减号按钮
      if (_props.controls) {
        const decreaseBtnProps = getButtonA11yProps({
          ariaLabel: '减少',
          disabled: _props.disabled || isAtMin.value,
        });
        children.push(
          createVNode(
            'span',
            mergeA11yProps(decreaseBtnProps, {
              class: `lyt-input-number__decrease ${isAtMin.value ? 'is-disabled' : ''}`,
              onClick: handleDecrement,
            }),
            [createTextVNode('−')],
          ),
        );
      }

      // 加号按钮
      if (_props.controls) {
        const increaseBtnProps = getButtonA11yProps({
          ariaLabel: '增加',
          disabled: _props.disabled || isAtMax.value,
        });
        children.push(
          createVNode(
            'span',
            mergeA11yProps(increaseBtnProps, {
              class: `lyt-input-number__increase ${isAtMax.value ? 'is-disabled' : ''}`,
              onClick: handleIncrement,
            }),
            [createTextVNode('+')],
          ),
        );
      }

      // 输入框
      const spinbuttonProps = getSpinbuttonA11yProps({
        id: _props.id,
        ariaLabel: _props.ariaLabel,
        ariaDescribedBy: _props.ariaDescribedBy,
        ariaRequired: _props.ariaRequired,
        ariaInvalid: _props.ariaInvalid,
        disabled: _props.disabled,
        tabIndex: _props.tabIndex,
        value: state.inputValue,
        min: _props.min === -Infinity ? undefined : _props.min,
        max: _props.max === Infinity ? undefined : _props.max,
      });
      children.push(
        createVNode(
          'input',
          mergeA11yProps(spinbuttonProps, {
            type: 'text',
            class: 'lyt-input-number__input',
            value: displayValue.value,
            disabled: _props.disabled,
            placeholder: _props.placeholder,
            name: _props.name,
            onInput: handleInput,
            onBlur: handleBlur,
            onFocus: handleFocus,
            onKeydown: handleKeydown,
          }),
          [],
        ),
      );

      return createVNode(
        'div',
        {
          class: getInputNumberClass(),
          style: getInputNumberStyle(),
        },
        children,
      );
    };
  },
});

export type { InputNumberProps, InputNumberSlots };
