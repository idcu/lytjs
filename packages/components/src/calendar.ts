/**
 * Calendar 纯日历网格组件
 *
 * Props: year, month, defaultYear, defaultMonth, value, range
 * Events: update:year, update:month, select
 *
 * 纯日历网格渲染组件，不包含输入框和弹窗。
 * 支持受控模式（year/month）和非受控模式（defaultYear/defaultMonth）。
 */

import { defineComponent } from '@lytjs/component'
import { ref, computed, watch } from '@lytjs/reactivity'
import {
  generateCalendarDays,
  formatDate,
  parseDate,
  isSameDay,
} from './calendar-utils'

export const Calendar = defineComponent({
  name: 'LytCalendar',

  props: {
    /** 受控模式 - 当前年份 */
    year: {
      type: Number,
      default: undefined,
    },
    /** 受控模式 - 当前月份（0-11） */
    month: {
      type: Number,
      default: undefined,
    },
    /** 非受控模式 - 默认年份 */
    defaultYear: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    /** 非受控模式 - 默认月份（0-11） */
    defaultMonth: {
      type: Number,
      default: () => new Date().getMonth(),
    },
    /** 选中日期（YYYY-MM-DD 格式字符串） */
    value: {
      type: String,
      default: '',
    },
    /** 是否启用范围选择 */
    range: {
      type: Boolean,
      default: false,
    },
    /** 范围选择 - 起始日期 */
    rangeStart: {
      type: String,
      default: '',
    },
    /** 范围选择 - 结束日期 */
    rangeEnd: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit }) {
    // 内部状态（非受控模式）
    const internalYear = ref(props.defaultYear)
    const internalMonth = ref(props.defaultMonth)

    /** 当前显示的年份（受控优先） */
    const currentYear = computed(() => {
      return props.year !== undefined ? props.year : internalYear.value
    })

    /** 当前显示的月份（受控优先） */
    const currentMonth = computed(() => {
      return props.month !== undefined ? props.month : internalMonth.value
    })

    const weekDays = ['日', '一', '二', '三', '四', '五', '六']

    /** 解析选中日期 */
    const selectedDate = computed(() => {
      return props.value ? parseDate(props.value) : null
    })

    /** 解析范围起始日期 */
    const rangeStartDate = computed(() => {
      return props.rangeStart ? parseDate(props.rangeStart) : null
    })

    /** 解析范围结束日期 */
    const rangeEndDate = computed(() => {
      return props.rangeEnd ? parseDate(props.rangeEnd) : null
    })

    /** 生成日历网格数据 */
    const calendarDays = computed(() => {
      return generateCalendarDays(currentYear.value, currentMonth.value)
    })

    /** 上一个月 */
    const prevMonth = () => {
      let newYear = currentYear.value
      let newMonth = currentMonth.value - 1
      if (newMonth < 0) {
        newMonth = 11
        newYear--
      }
      // 非受控模式下更新内部状态
      if (props.year === undefined) internalYear.value = newYear
      if (props.month === undefined) internalMonth.value = newMonth
      emit('update:year', newYear)
      emit('update:month', newMonth)
    }

    /** 下一个月 */
    const nextMonth = () => {
      let newYear = currentYear.value
      let newMonth = currentMonth.value + 1
      if (newMonth > 11) {
        newMonth = 0
        newYear++
      }
      if (props.year === undefined) internalYear.value = newYear
      if (props.month === undefined) internalMonth.value = newMonth
      emit('update:year', newYear)
      emit('update:month', newMonth)
    }

    /** 选择日期 */
    const selectDate = (day: { date: Date; isCurrentMonth: boolean; dateStr: string }) => {
      if (!day.isCurrentMonth) return
      emit('select', day.dateStr, day.date)
    }

    /** 判断日期是否为今天 */
    const isToday = (day: { date: Date }) => {
      return isSameDay(day.date, new Date())
    }

    /** 判断日期是否被选中 */
    const isSelected = (day: { date: Date; dateStr: string }) => {
      if (props.range) {
        return day.dateStr === props.rangeStart || day.dateStr === props.rangeEnd
      }
      if (!selectedDate.value) return false
      return isSameDay(day.date, selectedDate.value)
    }

    /** 判断日期是否在范围内 */
    const isInRange = (day: { dateStr: string }) => {
      if (!props.range || !props.rangeStart || !props.rangeEnd) return false
      return day.dateStr > props.rangeStart && day.dateStr < props.rangeEnd
    }

    /** 月份标题 */
    const monthTitle = computed(() => {
      return `${currentYear.value}年${currentMonth.value + 1}月`
    })

    return {
      weekDays,
      currentYear,
      currentMonth,
      calendarDays,
      prevMonth,
      nextMonth,
      selectDate,
      isToday,
      isSelected,
      isInRange,
      monthTitle,
    }
  },

  template: `
    <div class="lyt-calendar">
      <div class="lyt-calendar__header">
        <button class="lyt-calendar__btn" @click="prevMonth">
          <svg viewBox="0 0 1024 1024" width="1em" height="1em">
            <path d="M724 218.3L512 430.3 300 218.3 188 330.3l212 212 212 212 112-112-200-212z" />
          </svg>
        </button>
        <span class="lyt-calendar__title">{{ monthTitle }}</span>
        <button class="lyt-calendar__btn" @click="nextMonth">
          <svg viewBox="0 0 1024 1024" width="1em" height="1em">
            <path d="M300 805.7l212-212 212-212-112-112-212 212-212-212L188 473.7l212 212 212 212 112-112-200-212z" />
          </svg>
        </button>
      </div>
      <div class="lyt-calendar__weekdays">
        <div v-for="day in weekDays" key="day" class="lyt-calendar__weekday">{{ day }}</div>
      </div>
      <div class="lyt-calendar__days">
        <div
          v-for="day in calendarDays"
          key="day.dateStr"
          :class="[
            'lyt-calendar__day',
            !day.isCurrentMonth ? 'lyt-calendar__day--other' : '',
            isToday(day) ? 'lyt-calendar__day--today' : '',
            isSelected(day) ? 'lyt-calendar__day--selected' : '',
            isInRange(day) ? 'lyt-calendar__day--in-range' : ''
          ].join(' ')"
          @click="selectDate(day)"
        >
          {{ day.date.getDate() }}
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-calendar {
      display: inline-block;
      min-width: 280px;
      padding: 12px;
      box-sizing: border-box;
    }
    .lyt-calendar__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .lyt-calendar__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: var(--lyt-radius-sm, 4px);
      color: var(--lyt-color-text, #303133);
      transition: background-color 0.2s;
    }
    .lyt-calendar__btn:hover {
      background-color: var(--lyt-color-bg, #f5f7fa);
    }
    .lyt-calendar__title {
      font-size: 16px;
      font-weight: 500;
      color: var(--lyt-color-text, #303133);
    }
    .lyt-calendar__weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }
    .lyt-calendar__weekday {
      text-align: center;
      font-size: 12px;
      color: var(--lyt-color-muted, #909399);
      padding: 4px 0;
    }
    .lyt-calendar__days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    .lyt-calendar__day {
      text-align: center;
      padding: 8px 4px;
      cursor: pointer;
      border-radius: var(--lyt-radius-sm, 4px);
      transition: all 0.2s;
      color: var(--lyt-color-text, #303133);
      font-size: 14px;
    }
    .lyt-calendar__day:hover:not(.lyt-calendar__day--other) {
      background-color: var(--lyt-color-bg, #f5f7fa);
    }
    .lyt-calendar__day--other {
      color: var(--lyt-color-muted, #c0c4cc);
      cursor: default;
    }
    .lyt-calendar__day--today {
      color: var(--lyt-color-primary, #409eff);
      font-weight: 500;
    }
    .lyt-calendar__day--selected {
      background-color: var(--lyt-color-primary, #409eff);
      color: white;
    }
    .lyt-calendar__day--in-range {
      background-color: var(--lyt-color-primary-light, #ecf5ff);
      border-radius: 0;
    }
  `,
})
