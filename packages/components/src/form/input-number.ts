/**
 * InputNumber 数字输入框
 * Props: min, max, step, precision, disabled, readonly, size(small/default/large), placeholder, controls, keyboard
 * Events: change, blur, focus
 */

import { defineComponent } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const InputNumber = defineComponent({
  name: 'LytInputNumber',

  props: {
    min: {
      type: Number,
      default: -Infinity,
    },
    max: {
      type: Number,
      default: Infinity,
    },
    step: {
      type: Number,
      default: 1,
    },
    precision: {
      type: Number,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default', 'large'].includes(v),
    },
    placeholder: {
      type: String,
      default: '',
    },
    controls: {
      type: Boolean,
      default: true,
    },
    keyboard: {
      type: Boolean,
      default: true,
    },
    modelValue: {
      type: Number,
      default: undefined,
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      value: props.modelValue,
      focused: false,
      inputValue: props.modelValue !== undefined ? String(props.modelValue) : '',
    });

    const formatValue = (val: number) => {
      if (props.precision !== undefined) {
        return Number(val.toFixed(props.precision));
      }
      return val;
    };

    const clampValue = (val: number) => {
      if (val < props.min) return props.min;
      if (val > props.max) return props.max;
      return val;
    };

    const setValue = (val: number) => {
      const clamped = clampValue(formatValue(val));
      state.value = clamped;
      state.inputValue = String(clamped);
      emit('change', clamped);
      emit('update:modelValue', clamped);
    };

    const increase = () => {
      if (props.disabled || props.readonly) return;
      const current = state.value !== undefined ? state.value : 0;
      setValue(current + props.step);
    };

    const decrease = () => {
      if (props.disabled || props.readonly) return;
      const current = state.value !== undefined ? state.value : 0;
      setValue(current - props.step);
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      state.inputValue = target.value;
      const num = Number(target.value);
      if (!isNaN(num)) {
        state.value = num;
        emit('change', num);
        emit('update:modelValue', num);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      state.focused = false;
      const num = Number(state.inputValue);
      if (!isNaN(num) && state.inputValue !== '') {
        setValue(num);
      } else {
        state.inputValue = state.value !== undefined ? String(state.value) : '';
      }
      emit('blur', e);
    };

    const handleFocus = (e: FocusEvent) => {
      state.focused = true;
      emit('focus', e);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (!props.keyboard) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        increase();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        decrease();
      }
    };

    const canIncrease = () => {
      if (state.value === undefined) return true;
      return state.value < props.max;
    };

    const canDecrease = () => {
      if (state.value === undefined) return true;
      return state.value > props.min;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.modelValue, (val: any) => {
      if (val !== undefined) {
        state.value = val;
        state.inputValue = String(val);
      }
    });

    return {
      state, increase, decrease, handleInput, handleBlur,
      handleFocus, handleKeydown, canIncrease, canDecrease,
    };
  },

  template: `
    <div class="lyt-input-number lyt-input-number--{size} {state.focused ? 'lyt-input-number--focused' : ''} {disabled ? 'lyt-input-number--disabled' : ''} {!controls ? 'lyt-input-number--no-controls' : ''}">
      <span
        class="lyt-input-number__decrease {disabled || !canDecrease() ? 'lyt-input-number__decrease--disabled' : ''}"
        @click="decrease"
        v-if="controls"
      >-</span>
      <input
        class="lyt-input-number__input"
        type="text"
        :value="state.inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown="handleKeydown"
      />
      <span
        class="lyt-input-number__increase {disabled || !canIncrease() ? 'lyt-input-number__increase--disabled' : ''}"
        @click="increase"
        v-if="controls"
      >+</span>
    </div>
  `,

  styles: `
    .lyt-input-number {
      display: inline-flex;
      align-items: center;
      position: relative;
      box-sizing: border-box;
      width: 180px;
    }
    .lyt-input-number__input {
      display: inline-block;
      width: 100%;
      height: 36px;
      padding: 0 12px;
      font-size: var(--lyt-font-size-base);
      line-height: 36px;
      color: var(--lyt-color-muted);
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      outline: none;
      transition: border-color 0.3s;
      box-sizing: border-box;
      text-align: center;
    }
    .lyt-input-number__input::placeholder { color: var(--lyt-color-muted); opacity: 0.5; }
    .lyt-input-number--focused .lyt-input-number__input { border-color: var(--lyt-color-primary); }
    .lyt-input-number--disabled .lyt-input-number__input { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-muted); cursor: not-allowed; opacity: 0.6; }
    .lyt-input-number--small .lyt-input-number__input { height: 28px; line-height: 28px; font-size: var(--lyt-font-size-sm); padding: 0 8px; }
    .lyt-input-number--large .lyt-input-number__input { height: 44px; line-height: 44px; font-size: var(--lyt-font-size-lg); padding: 0 16px; }
    .lyt-input-number__decrease,
    .lyt-input-number__increase {
      position: absolute;
      top: 1px;
      width: 32px;
      height: calc(100% - 2px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--lyt-font-size-lg);
      color: var(--lyt-color-muted);
      cursor: pointer;
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      transition: all 0.3s;
      z-index: 1;
      user-select: none;
    }
    .lyt-input-number__decrease {
      left: 1px;
      border-right: none;
      border-radius: var(--lyt-radius-sm) 0 0 var(--lyt-radius-sm);
    }
    .lyt-input-number__increase {
      right: 1px;
      border-left: none;
      border-radius: 0 var(--lyt-radius-sm) var(--lyt-radius-sm) 0;
    }
    .lyt-input-number__decrease:hover,
    .lyt-input-number__increase:hover {
      color: var(--lyt-color-primary);
    }
    .lyt-input-number__decrease--disabled,
    .lyt-input-number__increase--disabled {
      color: var(--lyt-color-info);
      cursor: not-allowed;
      opacity: 0.5;
    }
    .lyt-input-number__decrease--disabled:hover,
    .lyt-input-number__increase--disabled:hover {
      color: var(--lyt-color-info);
    }
    .lyt-input-number--no-controls .lyt-input-number__input {
      text-align: left;
    }
    .lyt-input-number--small { width: 140px; }
    .lyt-input-number--large { width: 220px; }
  `,
});
