/**
 * TimePicker 时间选择器组件
 * Props: value, format, placeholder, disabled, range, clearable, step
 * Events: change, clear
 * Slots: none
 */

import { defineComponent } from '@lytjs/component'
import { ref, computed, watch } from '@lytjs/reactivity'

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
    range: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    step: {
      type: Number,
      default: 1,
    },
  },

  setup(props, { emit }) {
    const visible = ref(false)

    // 开始时间
    const hour = ref('00')
    const minute = ref('00')
    const second = ref('00')

    // 结束时间（范围模式）
    const endHour = ref('00')
    const endMinute = ref('00')
    const endSecond = ref('00')

    const showSeconds = computed(() => props.format === 'HH:mm:ss')

    const displayValue = computed(() => {
      if (props.value) return props.value
      return ''
    })

    /** 解析时间字符串为 { hour, minute, second } */
    const parseTimeStr = (timeStr: string): { hour: string; minute: string; second: string } | null => {
      if (!timeStr) return null
      const parts = timeStr.split(':')
      if (parts.length >= 2) {
        return {
          hour: parts[0].padStart(2, '0'),
          minute: parts[1].padStart(2, '0'),
          second: parts[2] ? parts[2].padStart(2, '0') : '00',
        }
      }
      return null
    }

    /** 从 value prop 初始化时间值 */
    const initFromValue = () => {
      if (!props.value) {
        hour.value = '00'
        minute.value = '00'
        second.value = '00'
        endHour.value = '00'
        endMinute.value = '00'
        endSecond.value = '00'
        return
      }

      if (props.range) {
        // 范围模式：value 格式为 "HH:mm - HH:mm" 或 "HH:mm:ss - HH:mm:ss"
        const separator = ' - '
        const idx = props.value.indexOf(separator)
        if (idx !== -1) {
          const startStr = props.value.substring(0, idx)
          const endStr = props.value.substring(idx + separator.length)
          const start = parseTimeStr(startStr)
          const end = parseTimeStr(endStr)
          if (start) {
            hour.value = start.hour
            minute.value = start.minute
            second.value = start.second
          }
          if (end) {
            endHour.value = end.hour
            endMinute.value = end.minute
            endSecond.value = end.second
          }
        }
      } else {
        const parsed = parseTimeStr(props.value)
        if (parsed) {
          hour.value = parsed.hour
          minute.value = parsed.minute
          second.value = parsed.second
        }
      }
    }

    // 监听 value 变化，同步内部状态
    watch(() => props.value, () => {
      initFromValue()
    })

    // 初始化
    initFromValue()

    const openPopup = () => {
      if (props.disabled) return
      initFromValue()
      visible.value = true
    }

    const closePopup = () => {
      visible.value = false
    }

    /** 根据步进生成选项列表 */
    const generateOptions = (max: number, step: number) => {
      const options: number[] = []
      for (let i = 0; i < max; i += step) {
        options.push(i)
      }
      return options
    }

    const generateHours = () => generateOptions(24, props.step)
    const generateMinutes = () => generateOptions(60, props.step)
    const generateSeconds = () => generateOptions(60, props.step)

    /** 构建单个时间字符串 */
    const buildTimeStr = (h: string, m: string, s: string): string => {
      if (showSeconds.value) {
        return `${h}:${m}:${s}`
      }
      return `${h}:${m}`
    }

    const confirmTime = () => {
      if (props.range) {
        const startTime = buildTimeStr(hour.value, minute.value, second.value)
        const endTime = buildTimeStr(endHour.value, endMinute.value, endSecond.value)
        emit('change', `${startTime} - ${endTime}`)
      } else {
        const time = buildTimeStr(hour.value, minute.value, second.value)
        emit('change', time)
      }
      closePopup()
    }

    const clearTime = () => {
      emit('change', '')
      emit('clear')
      hour.value = '00'
      minute.value = '00'
      second.value = '00'
      endHour.value = '00'
      endMinute.value = '00'
      endSecond.value = '00'
    }

    const setHour = (h: number) => {
      hour.value = String(h).padStart(2, '0')
    }

    const setMinute = (m: number) => {
      minute.value = String(m).padStart(2, '0')
    }

    const setSecond = (s: number) => {
      second.value = String(s).padStart(2, '0')
    }

    const setEndHour = (h: number) => {
      endHour.value = String(h).padStart(2, '0')
    }

    const setEndMinute = (m: number) => {
      endMinute.value = String(m).padStart(2, '0')
    }

    const setEndSecond = (s: number) => {
      endSecond.value = String(s).padStart(2, '0')
    }

    const isActive = (current: string, target: number) => {
      return current === String(target).padStart(2, '0')
    }

    return {
      props,
      visible,
      hour,
      minute,
      second,
      endHour,
      endMinute,
      endSecond,
      showSeconds,
      displayValue,
      openPopup,
      closePopup,
      confirmTime,
      clearTime,
      setHour,
      setMinute,
      setSecond,
      setEndHour,
      setEndMinute,
      setEndSecond,
      generateHours,
      generateMinutes,
      generateSeconds,
      isActive,
    }
  },

  template: `
    <div class="lyt-time-picker {range ? 'lyt-time-picker--range' : ''}">
      <div class="lyt-time-picker__input-wrapper">
        <input
          type="text"
          class="lyt-time-picker__input"
          :value="displayValue"
          :placeholder="props.placeholder"
          :disabled="props.disabled"
          readonly
          @click="openPopup"
        />
        <span
          v-if="clearable && displayValue"
          class="lyt-time-picker__clear"
          @click.stop="clearTime"
        >
          <svg viewBox="0 0 1024 1024" width="1em" height="1em">
            <path d="M563.8 512l262.5-312.9c4.4-5.2 0.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L512 442.2 295.9 191.7c-3-3.6-7.5-5.7-12.3-5.7H203.8c-6.8 0-10.5 7.9-6.1 13.1L460.2 512 197.7 824.9c-4.4 5.2-0.7 13.1 6.1 13.1h79.8c4.7 0 9.2-2.1 12.3-5.7L512 581.8l216.1 250.5c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z" />
          </svg>
        </span>
        <span class="lyt-time-picker__icon">
          <svg viewBox="0 0 1024 1024" width="1em" height="1em">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
            <path d="M686 544H512V304c0-17.7-14.3-32-32-32s-32 14.3-32 32v272c0 17.7 14.3 32 32 32h242c17.7 0 32-14.3 32-32s-14.3-32-32-32z" />
          </svg>
        </span>
      </div>
      <div v-if="visible" class="lyt-time-picker__popup">
        <div class="lyt-time-picker__columns">
          <!-- 开始时间 -->
          <div class="lyt-time-picker__panel">
            <div class="lyt-time-picker__panel-label" v-if="range">开始时间</div>
            <div class="lyt-time-picker__panel-columns">
              <div class="lyt-time-picker__column">
                <div class="lyt-time-picker__label">时</div>
                <div class="lyt-time-picker__list">
                  <div
                    v-for="h in generateHours()"
                    key="h-{{h}}"
                    class="lyt-time-picker__item {{ isActive(hour, h) ? 'lyt-time-picker__item--active' : '' }}"
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
                    key="m-{{m}}"
                    class="lyt-time-picker__item {{ isActive(minute, m) ? 'lyt-time-picker__item--active' : '' }}"
                    @click="setMinute(m)"
                  >
                    {{ String(m).padStart(2, '0') }}
                  </div>
                </div>
              </div>
              <div v-if="showSeconds" class="lyt-time-picker__column">
                <div class="lyt-time-picker__label">秒</div>
                <div class="lyt-time-picker__list">
                  <div
                    v-for="s in generateSeconds()"
                    key="s-{{s}}"
                    class="lyt-time-picker__item {{ isActive(second, s) ? 'lyt-time-picker__item--active' : '' }}"
                    @click="setSecond(s)"
                  >
                    {{ String(s).padStart(2, '0') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 结束时间（范围模式） -->
          <div v-if="range" class="lyt-time-picker__panel lyt-time-picker__panel--end">
            <div class="lyt-time-picker__panel-label">结束时间</div>
            <div class="lyt-time-picker__panel-columns">
              <div class="lyt-time-picker__column">
                <div class="lyt-time-picker__label">时</div>
                <div class="lyt-time-picker__list">
                  <div
                    v-for="h in generateHours()"
                    key="eh-{{h}}"
                    class="lyt-time-picker__item {{ isActive(endHour, h) ? 'lyt-time-picker__item--active' : '' }}"
                    @click="setEndHour(h)"
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
                    key="em-{{m}}"
                    class="lyt-time-picker__item {{ isActive(endMinute, m) ? 'lyt-time-picker__item--active' : '' }}"
                    @click="setEndMinute(m)"
                  >
                    {{ String(m).padStart(2, '0') }}
                  </div>
                </div>
              </div>
              <div v-if="showSeconds" class="lyt-time-picker__column">
                <div class="lyt-time-picker__label">秒</div>
                <div class="lyt-time-picker__list">
                  <div
                    v-for="s in generateSeconds()"
                    key="es-{{s}}"
                    class="lyt-time-picker__item {{ isActive(endSecond, s) ? 'lyt-time-picker__item--active' : '' }}"
                    @click="setEndSecond(s)"
                  >
                    {{ String(s).padStart(2, '0') }}
                  </div>
                </div>
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
    .lyt-time-picker--range {
      width: 380px;
    }
    .lyt-time-picker__input-wrapper {
      position: relative;
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
    .lyt-time-picker__clear {
      position: absolute;
      right: 28px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--lyt-color-muted);
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
    }
    .lyt-time-picker__clear:hover {
      color: var(--lyt-color-text);
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
    .lyt-time-picker--range .lyt-time-picker__popup {
      min-width: 520px;
    }
    .lyt-time-picker__columns {
      display: flex;
      height: 200px;
    }
    .lyt-time-picker__panel {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .lyt-time-picker__panel--end {
      border-left: 1px solid var(--lyt-color-border);
    }
    .lyt-time-picker__panel-label {
      padding: 8px 12px;
      text-align: center;
      font-weight: 500;
      font-size: 13px;
      color: var(--lyt-color-text-secondary, #909399);
      border-bottom: 1px solid var(--lyt-color-border);
    }
    .lyt-time-picker__panel-columns {
      display: flex;
      flex: 1;
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
