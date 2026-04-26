/**
 * Checkbox 复选框
 * Props: checked, disabled, label, indeterminate
 * Events: change
 */

import { defineComponent } from '@lytjs/component';
import { reactive } from '@lytjs/reactivity';

export const Checkbox = defineComponent({
  name: 'LytCheckbox',

  props: {
    checked: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: '',
    },
    indeterminate: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: Boolean,
      default: undefined,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isChecked: props.modelValue !== undefined ? props.modelValue : props.checked,
    });

    const handleChange = (_e: Event) => {
      if (props.disabled) return;
      state.isChecked = !state.isChecked;
      emit('change', state.isChecked);
      emit('update:modelValue', state.isChecked);
    };

    return { state, handleChange, slots };
  },

  template: `
    <label class="lyt-checkbox {disabled ? 'lyt-checkbox--disabled' : ''} {state.isChecked ? 'lyt-checkbox--checked' : ''}">
      <span class="lyt-checkbox__input {state.isChecked ? 'lyt-checkbox__input--checked' : ''} {indeterminate ? 'lyt-checkbox__input--indeterminate' : ''}">
        <span class="lyt-checkbox__inner"></span>
        <input
          class="lyt-checkbox__original"
          type="checkbox"
          :checked="state.isChecked"
          :disabled="disabled"
          @change="handleChange"
        />
      </span>
      <span class="lyt-checkbox__label" v-if="label || slots.default">
        <slot>{{ label }}</slot>
      </span>
    </label>
  `,

  styles: `
    .lyt-checkbox {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      user-select: none;
      white-space: nowrap;
    }
    .lyt-checkbox--disabled { cursor: not-allowed; color: var(--lyt-color-muted); opacity: 0.5; }
    .lyt-checkbox__input {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      outline: none;
    }
    .lyt-checkbox__inner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 1px solid var(--lyt-color-border);
      border-radius: 2px;
      background-color: var(--lyt-color-bg);
      transition: all 0.3s;
      position: relative;
    }
    .lyt-checkbox__inner::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 5px;
      width: 4px;
      height: 8px;
      border: 2px solid #fff;
      border-top: 0;
      border-left: 0;
      transform: rotate(45deg) scale(0);
      transition: transform 0.2s;
    }
    .lyt-checkbox__input--checked .lyt-checkbox__inner {
      background-color: var(--lyt-color-primary);
      border-color: var(--lyt-color-primary);
    }
    .lyt-checkbox__input--checked .lyt-checkbox__inner::after {
      transform: rotate(45deg) scale(1);
    }
    .lyt-checkbox__input--indeterminate .lyt-checkbox__inner {
      background-color: var(--lyt-color-primary);
      border-color: var(--lyt-color-primary);
    }
    .lyt-checkbox__input--indeterminate .lyt-checkbox__inner::after {
      content: '';
      top: 6px;
      left: 3px;
      width: 8px;
      height: 2px;
      border: none;
      background-color: #fff;
      transform: none;
    }
    .lyt-checkbox__original {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      margin: 0;
    }
    .lyt-checkbox__label { margin-left: 8px; }
    .lyt-checkbox--disabled .lyt-checkbox__inner {
      background-color: var(--lyt-color-bg);
      border-color: var(--lyt-color-border);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .lyt-checkbox--disabled .lyt-checkbox__input--checked .lyt-checkbox__inner {
      background-color: var(--lyt-color-muted);
      border-color: var(--lyt-color-muted);
    }
  `,
});
