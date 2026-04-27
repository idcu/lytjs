/**
 * Switch 开关
 * Props: checked, disabled, size(small/medium/large), activeColor, inactiveColor
 * Events: change
 */

import { defineComponent } from '@lytjs/component';
import { reactive } from '@lytjs/reactivity';

export const Switch = defineComponent({
  name: 'LytSwitch',

  props: {
    checked: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    activeColor: {
      type: String,
      default: 'var(--lyt-color-primary)',
    },
    inactiveColor: {
      type: String,
      default: 'var(--lyt-color-border)',
    },
    modelValue: {
      type: Boolean,
      default: undefined,
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isChecked: props.modelValue !== undefined ? props.modelValue : props.checked,
    });

    const handleClick = () => {
      if (props.disabled) return;
      state.isChecked = !state.isChecked;
      emit('change', state.isChecked);
      emit('update:modelValue', state.isChecked);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    const switchStyle = () => ({
      backgroundColor: state.isChecked ? props.activeColor : props.inactiveColor,
    });

    return { state, handleClick, handleKeydown, switchStyle };
  },

  template: `
    <div
      class="lyt-switch lyt-switch--{size} {state.isChecked ? 'lyt-switch--checked' : ''} {disabled ? 'lyt-switch--disabled' : ''}"
      :style="switchStyle()"
      role="switch"
      :aria-checked="state.isChecked"
      tabindex="0"
      @click="handleClick"
      @keydown="handleKeydown"
    >
      <span class="lyt-switch__core">
        <span class="lyt-switch__action"></span>
      </span>
    </div>
  `,

  styles: `
    .lyt-switch {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      vertical-align: middle;
      outline: none;
      transition: background-color 0.3s;
      border-radius: 10px;
    }
    .lyt-switch--small { width: 36px; height: 20px; border-radius: 10px; }
    .lyt-switch--medium { width: 48px; height: 26px; border-radius: 13px; }
    .lyt-switch--large { width: 60px; height: 32px; border-radius: 16px; }
    .lyt-switch--disabled { opacity: 0.6; cursor: not-allowed; }
    .lyt-switch__core {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .lyt-switch__action {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: #fff;
      transition: transform 0.3s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
    .lyt-switch--small .lyt-switch__action { width: 14px; height: 14px; margin-left: 3px; }
    .lyt-switch--medium .lyt-switch__action { width: 20px; height: 20px; margin-left: 3px; }
    .lyt-switch--large .lyt-switch__action { width: 26px; height: 26px; margin-left: 3px; }
    .lyt-switch--checked .lyt-switch__action { transform: translateX(100%); }
    .lyt-switch--small.lyt-switch--checked .lyt-switch__action { transform: translateX(16px); }
    .lyt-switch--medium.lyt-switch--checked .lyt-switch__action { transform: translateX(22px); }
    .lyt-switch--large.lyt-switch--checked .lyt-switch__action { transform: translateX(28px); }
  `,
});
