/**
 * Input 输入框
 * Props: type(text/password/number/email/tel/textarea), placeholder, disabled, readonly, maxlength, clearable, size
 * Events: input, change, focus, blur, clear
 * State: value, focused, hovering
 */

import { defineComponent } from '@lytjs/component';
import { reactive } from '@lytjs/reactivity';

export const Input = defineComponent({
  name: 'LytInput',

  props: {
    type: {
      type: String,
      default: 'text',
      validator: (v: string) => ['text', 'password', 'number', 'email', 'tel', 'textarea'].includes(v),
    },
    placeholder: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    maxlength: {
      type: Number,
      default: undefined,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    modelValue: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      value: props.modelValue,
      focused: false,
      hovering: false,
    });

    const isTextarea = () => props.type === 'textarea';

    const showClear = () =>
      props.clearable &&
      !props.disabled &&
      !props.readonly &&
      state.value.length > 0 &&
      state.hovering;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      state.value = target.value;
      emit('input', state.value);
      emit('update:modelValue', state.value);
    };

    const handleChange = (_e: Event) => {
      emit('change', state.value);
    };

    const handleFocus = (e: FocusEvent) => {
      state.focused = true;
      emit('focus', e);
    };

    const handleBlur = (e: FocusEvent) => {
      state.focused = false;
      emit('blur', e);
    };

    const handleClear = () => {
      state.value = '';
      emit('input', '');
      emit('update:modelValue', '');
      emit('clear');
    };

    const handleMouseEnter = () => {
      state.hovering = true;
    };

    const handleMouseLeave = () => {
      state.hovering = false;
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (isTextarea()) {
        const target = e.target as HTMLTextAreaElement;
        requestAnimationFrame(() => {
          target.style.height = 'auto';
          target.style.height = target.scrollHeight + 'px';
        });
      }
    };

    return {
      state, isTextarea, showClear,
      handleInput, handleChange, handleFocus, handleBlur,
      handleClear, handleMouseEnter, handleMouseLeave, handleKeydown,
      slots,
    };
  },

  template: `
    <div
      class="lyt-input-wrapper lyt-input-wrapper--{size} {state.focused ? 'lyt-input-wrapper--focused' : ''} {disabled ? 'lyt-input-wrapper--disabled' : ''}"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <textarea
        v-if="isTextarea()"
        class="lyt-input lyt-input--textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :value="state.value"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      ></textarea>
      <input
        v-else
        class="lyt-input lyt-input--{size}"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :value="state.value"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <span
        v-if="showClear()"
        class="lyt-input__clear"
        @click="handleClear"
      >
        &times;
      </span>
    </div>
  `,

  styles: `
    .lyt-input-wrapper {
      display: inline-flex;
      align-items: center;
      position: relative;
      width: 100%;
      box-sizing: border-box;
    }
    .lyt-input {
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
    }
    .lyt-input::placeholder { color: var(--lyt-color-muted); opacity: 0.5; }
    .lyt-input:focus { border-color: var(--lyt-color-primary); }
    .lyt-input--small { height: 28px; line-height: 28px; font-size: var(--lyt-font-size-sm); padding: 0 8px; }
    .lyt-input--large { height: 44px; line-height: 44px; font-size: var(--lyt-font-size-lg); padding: 0 16px; }
    .lyt-input--textarea {
      height: auto;
      min-height: 36px;
      line-height: 1.5;
      padding: 8px 12px;
      resize: vertical;
    }
    .lyt-input-wrapper--focused .lyt-input { border-color: var(--lyt-color-primary); }
    .lyt-input-wrapper--disabled .lyt-input { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-muted); cursor: not-allowed; opacity: 0.6; }
    .lyt-input__clear {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: var(--lyt-color-muted);
      font-size: var(--lyt-font-size-lg);
      line-height: 1;
      transition: color 0.3s;
    }
    .lyt-input__clear:hover { color: var(--lyt-color-info); }
  `,
});
