/**
 * @lytjs/ui - InputNumber 组件
 *
 * 数字输入框组件，用于数值输入
 */

import type { InputNumberProps, InputNumberSlots, InputNumberSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import {
  createVNode,
  createTextVNode,
  type VNode,
  reactive,
  computed,
  watch,
} from '@lytjs/core/runtime';
import { isString, isObject } from '@lytjs/common-is';
import { getSpinbuttonA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import { t } from '../locale';

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
      /**
       * 聚焦期间用户**原始输入文本**。
       *
       * ⚠️ 2026-10-28 新增：此前 `displayValue` 无条件按 `precision` 做 `toFixed`，
       * 于是用户刚敲下 `1`（precision=2）就立刻被改写成 `1.00` —— 光标跳到末尾，
       * 再敲 `5` 变成 `1.005`，**根本没法输入小数**。
       * 修好 `patchProp` 的表单状态之后这个老问题会真的显现（以前 attribute 写不进 dirty 输入框，
       * 恰好把症状掩盖了），所以必须在组件层加 focus 守卫。
       * 语义与 Vue 的 InputNumber 一致：**聚焦时显示用户敲的原文，失焦后才格式化**。
       */
      inputText: undefined as string | undefined,
    });

    const displayValue = computed(() => {
      // 用户敲过字（且还没失焦）时显示原文（不做 toFixed / 不补零），避免光标跳动。
      //
      // 判据刻意**不**写成 `state.focus && …`：`focus` 事件在部分环境/测试里不会派发
      // （实测 InputNumber 的用例只派发 input + blur，不派发 focus），
      // 那样守卫会静默失效、又退回到「敲 1 立刻变 1.00」。以「有没有原文」为准更稳。
      // 原文在 `handleBlur` 里清空，因此失焦后一定会回到格式化显示。
      if (state.inputText !== undefined) {
        return state.inputText;
      }
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
        // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onChange` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
        return;
      }

      const newValue = clampValue(value);
      state.inputValue = newValue;
      emit('update:modelValue', newValue);
      emit('change', newValue);
      // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onChange` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
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
      // 记录原文：聚焦期间 displayValue 直接返回它（不重格式化）
      state.inputText = value;

      if (value === '') {
        state.inputValue = undefined;
        emit('update:modelValue', undefined);
        emit('input', undefined);
        // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onInput` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
        return;
      }

      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        state.inputValue = numValue;
        emit('input', numValue);
        // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onInput` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
      }
    };

    const handleBlur = (e: Event) => {
      state.focus = false;
      // 失焦后回到「按 precision 格式化」的显示
      state.inputText = undefined;
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
      // ★ 2026-10-04：`controlsPosition` 声明了却从未使用 ⇒ 加减号位置不可定制。
      //   语义沿用 Element-Plus 的 `controls-position`（`left` / `right`）。
      if (_props.controlsPosition) {
        classes.push(`lyt-input-number--controls-${_props.controlsPosition}`);
      }
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
          ariaLabel: t('inputNumber.decrease'),
          disabled: _props.disabled || isAtMin.value,
        });
        children.push(
          createVNode(
            'span',
            mergeA11yProps(decreaseBtnProps, {
              class: `lyt-input-number__decrease ${isAtMin.value ? 'is-disabled' : ''}`,
              onClick: handleDecrement,
              // span 不是原生按钮：补 Enter/Space 键盘路径（B05）
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDecrement();
                }
              },
            }),
            [createTextVNode('−')],
          ),
        );
      }

      // 加号按钮
      if (_props.controls) {
        const increaseBtnProps = getButtonA11yProps({
          ariaLabel: t('inputNumber.increase'),
          disabled: _props.disabled || isAtMax.value,
        });
        children.push(
          createVNode(
            'span',
            mergeA11yProps(increaseBtnProps, {
              class: `lyt-input-number__increase ${isAtMax.value ? 'is-disabled' : ''}`,
              onClick: handleIncrement,
              // span 不是原生按钮：补 Enter/Space 键盘路径（B05）
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleIncrement();
                }
              },
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
            // ★ 2026-10-04：`label` 声明了却从未使用 ⇒ 输入框没有可访问名称。
            'aria-label': (_props.label as string | undefined) || undefined,
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
