/**
 * Radio 单选框
 * Props: checked, disabled, label, value, name
 * Events: change
 *
 * A11y: 原生 radio 提供基本键盘支持，添加 aria-describedby、inputId
 */

import { defineComponent } from '@lytjs/component';

export const Radio = defineComponent({
  name: 'LytRadio',

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
    value: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    name: {
      type: String,
      default: '',
    },
    modelValue: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    /** 无障碍标签 */
    ariaLabel: {
      type: String,
      default: '',
    },
    /** 描述文本元素 ID */
    ariaDescribedby: {
      type: String,
      default: '',
    },
    /** 组件唯一 ID */
    inputId: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const isChecked = () => {
      if (props.modelValue !== undefined && props.value !== undefined) {
        return props.modelValue === props.value;
      }
      return props.checked;
    };

    const handleChange = (_e: Event) => {
      if (props.disabled) return;
      emit('change', props.value);
      emit('update:modelValue', props.value);
    };

    return { isChecked, handleChange, slots };
  },

  template: `
    <label class="lyt-radio {disabled ? 'lyt-radio--disabled' : ''} {isChecked() ? 'lyt-radio--checked' : ''}">
      <span class="lyt-radio__input {isChecked() ? 'lyt-radio__input--checked' : ''}">
        <span class="lyt-radio__inner"></span>
        <input
          class="lyt-radio__original"
          type="radio"
          :name="name"
          :checked="isChecked()"
          :disabled="disabled"
          :id="inputId || undefined"
          :aria-label="ariaLabel || undefined"
          :aria-describedby="ariaDescribedby || undefined"
          @change="handleChange"
        />
      </span>
      <span class="lyt-radio__label" v-if="label || slots.default">
        <slot>{{ label }}</slot>
      </span>
    </label>
  `,

  styles: `
    .lyt-radio {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      user-select: none;
      white-space: nowrap;
    }
    .lyt-radio--disabled { cursor: not-allowed; color: var(--lyt-color-muted); opacity: 0.5; }
    .lyt-radio__input {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      outline: none;
    }
    .lyt-radio__inner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 1px solid var(--lyt-color-border);
      border-radius: 50%;
      background-color: var(--lyt-color-bg);
      transition: all 0.3s;
      position: relative;
    }
    .lyt-radio__inner::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #fff;
      transform: translate(-50%, -50%) scale(0);
      transition: transform 0.2s;
    }
    .lyt-radio__input--checked .lyt-radio__inner {
      background-color: var(--lyt-color-primary);
      border-color: var(--lyt-color-primary);
    }
    .lyt-radio__input--checked .lyt-radio__inner::after {
      transform: translate(-50%, -50%) scale(1);
    }
    .lyt-radio__original {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      margin: 0;
    }
    .lyt-radio__label { margin-left: 8px; }
    .lyt-radio--disabled .lyt-radio__inner {
      background-color: var(--lyt-color-bg);
      border-color: var(--lyt-color-border);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .lyt-radio--disabled .lyt-radio__input--checked .lyt-radio__inner {
      background-color: var(--lyt-color-muted);
      border-color: var(--lyt-color-muted);
    }
  `,
});
