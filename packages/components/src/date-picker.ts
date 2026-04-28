/**
 * DatePicker 日期选择器
 * Props: modelValue, format, placeholder, disabled, range, minDate, maxDate
 * Events: change, update:modelValue
 * Features: 日历弹出, 日期范围, 格式配置
 *
 * 日历网格渲染逻辑复用 calendar-utils.ts 中的共享函数。
 */

import { defineComponent } from '@lytjs/component'
import { reactive } from '@lytjs/reactivity'
import {
  generateCalendarDays,
  formatDate,
  formatDateWithPattern,
  parseDate,
} from './calendar-utils'

export const DatePicker = defineComponent({
  name: 'LytDatePicker',

  props: {
    modelValue: {
      type: [String, Array] as any,
      default: '',
    },
    format: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    placeholder: {
      type: String,
      default: '请选择日期',
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
    readonly: {
      type: Boolean,
      default: false,
    },
    minDate: {
      type: String,
      default: '',
    },
    maxDate: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isOpen: false,
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth(),
      selectedDate: props.modelValue as string,
      hoverDate: '',
      rangeStart: '',
      rangeEnd: '',
    })

    const weekDays = ['日', '一', '二', '三', '四', '五', '六']

    /** 生成日历数据 - 使用共享函数 */
    const calendarDays = () => {
      const rawDays = generateCalendarDays(state.currentYear, state.currentMonth)
      const today = new Date()
      const todayStr = formatDate(today)

      return rawDays.map(day => {
        const isSelected = props.range
          ? (day.dateStr === state.rangeStart || day.dateStr === state.rangeEnd)
          : day.dateStr === state.selectedDate

        const isDisabled = checkDateDisabled(day.dateStr)

        return {
          date: day.dateStr,
          day: day.date.getDate(),
          isCurrentMonth: day.isCurrentMonth,
          isToday: day.dateStr === todayStr,
          isSelected,
          isDisabled,
        }
      })
    }

    /** 检查日期是否被禁用（minDate / maxDate） */
    const checkDateDisabled = (dateStr: string): boolean => {
      if (props.minDate && dateStr < props.minDate) return true
      if (props.maxDate && dateStr > props.maxDate) return true
      return false
    }

    /** 选择日期 */
    const handleDateClick = (date: string) => {
      if (props.disabled || props.readonly) return

      if (props.range) {
        if (!state.rangeStart || (state.rangeStart && state.rangeEnd)) {
          state.rangeStart = date
          state.rangeEnd = ''
        } else {
          state.rangeEnd = date
          const start = state.rangeStart < date ? state.rangeStart : date
          const end = state.rangeStart < date ? date : state.rangeStart
          emit('change', [start, end])
          emit('update:modelValue', [start, end])
          state.isOpen = false
        }
      } else {
        state.selectedDate = date
        emit('change', date)
        emit('update:modelValue', date)
        state.isOpen = false
      }
    }

    /** 切换月份 */
    const prevMonth = () => {
      if (state.currentMonth === 0) {
        state.currentMonth = 11
        state.currentYear--
      } else {
        state.currentMonth--
      }
    }

    const nextMonth = () => {
      if (state.currentMonth === 11) {
        state.currentMonth = 0
        state.currentYear++
      } else {
        state.currentMonth++
      }
    }

    /** 切换弹出层 */
    const togglePicker = () => {
      if (props.disabled) return
      state.isOpen = !state.isOpen
    }

    /** 清除 */
    const handleClear = (e: Event) => {
      e.stopPropagation()
      state.selectedDate = ''
      state.rangeStart = ''
      state.rangeEnd = ''
      emit('change', props.range ? [] : '')
      emit('update:modelValue', props.range ? [] : '')
    }

    /** 显示文本 */
    const displayText = () => {
      if (props.range) {
        const val = props.modelValue as string[]
        if (Array.isArray(val) && val.length === 2) return `${val[0]} ~ ${val[1]}`
        return ''
      }
      return state.selectedDate || (props.modelValue as string) || ''
    }

    /** 月份标题 */
    const monthTitle = () => {
      return `${state.currentYear} 年 ${state.currentMonth + 1} 月`
    }

    return {
      state, weekDays, calendarDays, handleDateClick,
      prevMonth, nextMonth, togglePicker, handleClear,
      displayText, monthTitle,
    }
  },

  template: `
    <div class="lyt-datepicker {disabled ? 'lyt-datepicker--disabled' : ''} {state.isOpen ? 'lyt-datepicker--open' : ''}">
      <div class="lyt-datepicker__input" @click="togglePicker">
        <span class="lyt-datepicker__text {displayText() ? '' : 'lyt-datepicker__text--placeholder'}">
          {{ displayText() || placeholder }}
        </span>
        <span class="lyt-datepicker__clear" v-if="clearable && displayText()" @click="handleClear">&times;</span>
        <span class="lyt-datepicker__icon">
          <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M128 384v512h768V384H128zm-32-64h832a32 32 0 0 1 32 32v576a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V352a32 32 0 0 1 32-32zm96-128v96h64V192h-64zm544 0v96h64V192h-64zM128 320h768V256H128v64z"/></svg>
        </span>
      </div>
      <div class="lyt-datepicker__dropdown" v-if="state.isOpen">
        <div class="lyt-datepicker__header">
          <span class="lyt-datepicker__prev" @click="prevMonth">&laquo;</span>
          <span class="lyt-datepicker__title">{{ monthTitle() }}</span>
          <span class="lyt-datepicker__next" @click="nextMonth">&raquo;</span>
        </div>
        <div class="lyt-datepicker__weekdays">
          <span v-for="day in weekDays" class="lyt-datepicker__weekday">{{ day }}</span>
        </div>
        <div class="lyt-datepicker__days">
          <span
            v-for="cell in calendarDays()"
            class="lyt-datepicker__day {cell.isCurrentMonth ? '' : 'lyt-datepicker__day--other'} {cell.isToday ? 'lyt-datepicker__day--today' : ''} {cell.isSelected ? 'lyt-datepicker__day--selected' : ''} {cell.isDisabled ? 'lyt-datepicker__day--disabled' : ''}"
            @click="handleDateClick(cell.date)"
          >{{ cell.day }}</span>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-datepicker {
      display: inline-block;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      font-size: 14px;
    }
    .lyt-datepicker__input {
      display: flex;
      align-items: center;
      height: 36px;
      padding: 0 30px 0 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      transition: border-color 0.3s;
      position: relative;
    }
    .lyt-datepicker--open .lyt-datepicker__input { border-color: #409eff; }
    .lyt-datepicker--disabled .lyt-datepicker__input { background-color: #f5f7fa; border-color: #e4e7ed; cursor: not-allowed; color: #c0c4cc; }
    .lyt-datepicker__text { flex: 1; color: #606266; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lyt-datepicker__text--placeholder { color: #c0c4cc; }
    .lyt-datepicker__clear { position: absolute; right: 28px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #c0c4cc; font-size: 16px; }
    .lyt-datepicker__clear:hover { color: #909399; }
    .lyt-datepicker__icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #c0c4cc; display: flex; align-items: center; }
    .lyt-datepicker__dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 320px;
      background-color: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      z-index: 1000;
      padding: 12px;
      box-sizing: border-box;
    }
    .lyt-datepicker__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .lyt-datepicker__prev, .lyt-datepicker__next { cursor: pointer; font-size: 16px; color: #606266; padding: 4px 8px; border-radius: 4px; transition: background-color 0.3s; }
    .lyt-datepicker__prev:hover, .lyt-datepicker__next:hover { background-color: #f5f7fa; }
    .lyt-datepicker__title { font-size: 14px; font-weight: 600; color: #303133; }
    .lyt-datepicker__weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 4px; }
    .lyt-datepicker__weekday { font-size: 12px; color: #909399; padding: 4px 0; }
    .lyt-datepicker__days { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
    .lyt-datepicker__day {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; margin: 2px auto;
      font-size: 13px; color: #606266; cursor: pointer; border-radius: 50%;
      transition: all 0.3s;
    }
    .lyt-datepicker__day:hover { background-color: #f5f7fa; }
    .lyt-datepicker__day--other { color: #c0c4cc; }
    .lyt-datepicker__day--today { color: #409eff; font-weight: 600; }
    .lyt-datepicker__day--selected { background-color: #409eff; color: #fff; }
    .lyt-datepicker__day--selected:hover { background-color: #66b1ff; }
    .lyt-datepicker__day--disabled { color: #c0c4cc; cursor: not-allowed; }
  `,
})
