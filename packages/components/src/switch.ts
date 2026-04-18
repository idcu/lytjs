/**
 * Toggle 切换开关
 * Props: checked, disabled, loading, onValue, offValue, size, activeColor, inactiveColor
 * Events: change, update:modelValue
 * Features: 开关值, 禁用状态, 变更回调, 加载状态
 */

import { defineComponent } from '@lytjs/component'
import { reactive, watch } from '@lytjs/reactivity'

export const Toggle = defineComponent({
  name: 'LytToggle',

  props: {
    checked: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    onValue: {
      type: [String, Number, Boolean] as any,
      default: true,
    },
    offValue: {
      type: [String, Number, Boolean] as any,
      default: false,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    activeColor: {
      type: String,
      default: '#409eff',
    },
    inactiveColor: {
      type: String,
      default: '#dcdfe6',
    },
    modelValue: {
      type: [String, Number, Boolean] as any,
      default: undefined,
    },
    activeText: {
      type: String,
      default: '',
    },
    inactiveText: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isChecked: props.modelValue !== undefined
        ? props.modelValue === props.onValue
        : props.checked,
    })

    /** 获取当前值 */
    const currentValue = () => {
      return state.isChecked ? props.onValue : props.offValue
    }

    /** 切换 */
    const handleClick = () => {
      if (props.disabled || props.loading) return
      state.isChecked = !state.isChecked
      const val = currentValue()
      emit('change', val)
      emit('update:modelValue', val)
    }

    /** 键盘事件 */
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    }

    /** 开关样式 */
    const switchStyle = () => ({
      backgroundColor: state.isChecked ? props.activeColor : props.inactiveColor,
    })

    /** 监听 modelValue */
    watch(() => props.modelValue, (val: any) => {
      if (val !== undefined) {
        state.isChecked = val === props.onValue
      }
    })

    return { state, currentValue, handleClick, handleKeydown, switchStyle }
  },

  template: `
    <div
      class="lyt-toggle lyt-toggle--{size} {state.isChecked ? 'lyt-toggle--checked' : ''} {disabled ? 'lyt-toggle--disabled' : ''} {loading ? 'lyt-toggle--loading' : ''}"
      :style="switchStyle()"
      role="switch"
      :aria-checked="state.isChecked"
      tabindex="0"
      @click="handleClick"
      @keydown="handleKeydown"
    >
      <span class="lyt-toggle__core">
        <span class="lyt-toggle__action">
          <svg v-if="loading" class="lyt-toggle__loading-icon" viewBox="0 0 1024 1024" width="1em" height="1em">
            <path d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32z"/>
          </svg>
        </span>
      </span>
      <span class="lyt-toggle__label lyt-toggle__label--left" v-if="inactiveText && !state.isChecked">{{ inactiveText }}</span>
      <span class="lyt-toggle__label lyt-toggle__label--right" v-if="activeText && state.isChecked">{{ activeText }}</span>
    </div>
  `,

  styles: `
    .lyt-toggle {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      vertical-align: middle;
      outline: none;
      transition: background-color 0.3s;
      border-radius: 10px;
      gap: 6px;
    }
    .lyt-toggle--small { border-radius: 10px; }
    .lyt-toggle--medium { border-radius: 13px; }
    .lyt-toggle--large { border-radius: 16px; }
    .lyt-toggle--disabled { opacity: 0.6; cursor: not-allowed; }
    .lyt-toggle--loading { cursor: wait; }
    .lyt-toggle__core {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      position: relative;
      transition: all 0.3s;
    }
    .lyt-toggle--small .lyt-toggle__core { width: 36px; height: 20px; }
    .lyt-toggle--medium .lyt-toggle__core { width: 48px; height: 26px; }
    .lyt-toggle--large .lyt-toggle__core { width: 60px; height: 32px; }
    .lyt-toggle__action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: #fff;
      transition: transform 0.3s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
    .lyt-toggle--small .lyt-toggle__action { width: 14px; height: 14px; margin-left: 3px; }
    .lyt-toggle--medium .lyt-toggle__action { width: 20px; height: 20px; margin-left: 3px; }
    .lyt-toggle--large .lyt-toggle__action { width: 26px; height: 26px; margin-left: 3px; }
    .lyt-toggle--checked .lyt-toggle__action { transform: translateX(100%); }
    .lyt-toggle--small.lyt-toggle--checked .lyt-toggle__action { transform: translateX(16px); }
    .lyt-toggle--medium.lyt-toggle--checked .lyt-toggle__action { transform: translateX(22px); }
    .lyt-toggle--large.lyt-toggle--checked .lyt-toggle__action { transform: translateX(28px); }
    .lyt-toggle__loading-icon { animation: lyt-toggle-spin 1s linear infinite; }
    @keyframes lyt-toggle-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .lyt-toggle__label {
      font-size: 13px;
      color: #606266;
      line-height: 1;
      user-select: none;
    }
  `,
})
