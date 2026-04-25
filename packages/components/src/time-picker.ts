/**
 * TimePicker 时间选择器组件
 * Props: value, format, placeholder, disabled
 * Events: change
 * Slots: none
 */

import { defineComponent } from '@lytjs/component'
import { ref, computed } from '@lytjs/reactivity'

export const TimePicker = defineComponent({
  name: 'LytTimePicker',

  props: {
    value: {
      type: String,
      default: '',
    },
    format: {
      type: String,
      default: 'HH:mm',
    },
    placeholder: {
      type: String,
      default: '请选择时间',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit }) {
    const visible = ref(false)
    const hour = ref('00')
    const minute = ref('00')

    const displayValue = computed(() => {
      if (props.value) return props.value
      return ''
    })

    const openPopup = () => {
      if (props.disabled) return
      visible.value = true
    }

    const closePopup = () => {
      visible.value = false
    }

    const confirmTime = () => {
      const time = `${hour.value}:${minute.value}`
      emit('change', time)
      closePopup()
    }

    const setHour = (h: number) => {
      hour.value = String(h).padStart(2, '0')
    }

    const setMinute = (m: number) => {
      minute.value = String(m).padStart(2, '0')
    }

    const generateHours = () => Array.from({ length: 24 }, (_, i) => i)
    const generateMinutes = () => Array.from({ length: 60 }, (_, i) => i)

    return {
      props,
      visible,
      hour,
      minute,
      displayValue,
      openPopup,
      closePopup,
      confirmTime,
      setHour,
      setMinute,
      generateHours,
      generateMinutes,
    }
  },

  template: `
    <div class="lyt-time-picker">
      <input
        type="text"
        class="lyt-time-picker__input"
        :value="displayValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        readonly
        @click="openPopup"
      />
      <span class="lyt-time-picker__icon">
        <svg viewBox="0 0 1024 1024" width="1em" height="1em">
          <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
          <path d="M686 544H512V304c0-17.7-14.3-32-32-32s-32 14.3-32 32v272c0 17.7 14.3 32 32 32h242c17.7 0 32-14.3 32-32s-14.3-32-32-32z" />
        </svg>
      </span>
      <div v-if="visible" class="lyt-time-picker__popup">
        <div class="lyt-time-picker__columns">
          <div class="lyt-time-picker__column">
            <div class="lyt-time-picker__label">时</div>
            <div class="lyt-time-picker__list">
              <div
                v-for="h in generateHours()"
                key="h"
                class="lyt-time-picker__item {{ hour === String(h).padStart(2, '0') ? 'lyt-time-picker__item--active' : '' }}"
                @click="setHour(h)"
              >
                {{ String(h).padStart(2, '0') }}
              </div>
            </div>
          </div>
          <div class="lyt-time-picker__column">
            <div class="lyt-time-picker__label">分</div>
            <div class="lyt-time-picker__list">
              <div
                v-for="m in generateMinutes()"
                key="m"
                class="lyt-time-picker__item {{ minute === String(m).padStart(2, '0') ? 'lyt-time-picker__item--active' : '' }}"
                @click="setMinute(m)"
              >
                {{ String(m).padStart(2, '0') }}
              </div>
            </div>
          </div>
        </div>
        <div class="lyt-time-picker__footer">
          <button class="lyt-time-picker__btn lyt-time-picker__btn--cancel" @click="closePopup">取消</button>
          <button class="lyt-time-picker__btn lyt-time-picker__btn--confirm" @click="confirmTime">确定</button>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-time-picker {
      position: relative;
      display: inline-block;
      width: 200px;
    }
    .lyt-time-picker__input {
      width: 100%;
      padding: 8px 36px 8px 12px;
      font-size: var(--lyt-font-size-base);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-sizing: border-box;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
    }
    .lyt-time-picker__input:hover {
      border-color: var(--lyt-color-primary);
    }
    .lyt-time-picker__input:disabled {
      background-color: var(--lyt-color-bg-disabled);
      cursor: not-allowed;
    }
    .lyt-time-picker__icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--lyt-color-muted);
      pointer-events: none;
    }
    .lyt-time-picker__popup {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 280px;
    }
    .lyt-time-picker__columns {
      display: flex;
      height: 200px;
    }
    .lyt-time-picker__column {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--lyt-color-border);
    }
    .lyt-time-picker__column:last-child {
      border-right: none;
    }
    .lyt-time-picker__label {
      padding: 8px 12px;
      text-align: center;
      font-weight: 500;
      border-bottom: 1px solid var(--lyt-color-border);
      color: var(--lyt-color-text);
    }
    .lyt-time-picker__list {
      flex: 1;
      overflow-y: auto;
    }
    .lyt-time-picker__item {
      padding: 8px 12px;
      text-align: center;
      cursor: pointer;
      transition: background-color 0.2s;
      color: var(--lyt-color-text);
    }
    .lyt-time-picker__item:hover {
      background-color: var(--lyt-color-bg);
    }
    .lyt-time-picker__item--active {
      background-color: var(--lyt-color-primary-light);
      color: var(--lyt-color-primary);
      font-weight: 500;
    }
    .lyt-time-picker__footer {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      border-top: 1px solid var(--lyt-color-border);
      justify-content: flex-end;
    }
    .lyt-time-picker__btn {
      padding: 6px 16px;
      font-size: var(--lyt-font-size-sm);
      border-radius: var(--lyt-radius-sm);
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .lyt-time-picker__btn--cancel {
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-text);
    }
    .lyt-time-picker__btn--confirm {
      background-color: var(--lyt-color-primary);
      color: white;
    }
    .lyt-time-picker__btn:hover {
      opacity: 0.85;
    }
  `,
})
