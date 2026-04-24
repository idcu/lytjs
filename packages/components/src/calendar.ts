/**
 * Calendar 日历组件
 * Props: value, placeholder, disabled
 * Events: change
 * Slots: none
 */

import { defineComponent, ref, computed } from '@lytjs/reactivity'

export const Calendar = defineComponent({
  name: 'LytCalendar',

  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '请选择日期',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit }) {
    const visible = ref(false)
    const currentDate = ref(new Date())
    const selectedDate = ref<Date | null>(null)

    const weekDays = ['日', '一', '二', '三', '四', '五', '六']

    const displayValue = computed(() => {
      if (props.value) return props.value
      if (selectedDate.value) {
        const d = selectedDate.value
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      return ''
    })

    const currentYear = computed(() => currentDate.value.getFullYear())
    const currentMonth = computed(() => currentDate.value.getMonth())

    const openPopup = () => {
      if (props.disabled) return
      visible.value = true
    }

    const closePopup = () => {
      visible.value = false
    }

    const prevMonth = () => {
      currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
    }

    const nextMonth = () => {
      currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
    }

    const selectDate = (date: Date) => {
      selectedDate.value = date
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      emit('change', formatted)
      closePopup()
    }

    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay()
    }

    const generateCalendarDays = () => {
      const days: { date: Date | null; isCurrentMonth: boolean }[] = []
      const year = currentYear.value
      const month = currentMonth.value
      const daysInMonth = getDaysInMonth(year, month)
      const firstDay = getFirstDayOfMonth(year, month)

      const prevMonthDays = getDaysInMonth(year, month - 1)
      for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
          date: new Date(year, month - 1, prevMonthDays - i),
          isCurrentMonth: false,
        })
      }

      for (let i = 1; i <= daysInMonth; i++) {
        days.push({
          date: new Date(year, month, i),
          isCurrentMonth: true,
        })
      }

      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        })
      }

      return days
    }

    const isToday = (date: Date) => {
      const today = new Date()
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      )
    }

    const isSelected = (date: Date) => {
      if (!selectedDate.value) return false
      return (
        date.getDate() === selectedDate.value.getDate() &&
        date.getMonth() === selectedDate.value.getMonth() &&
        date.getFullYear() === selectedDate.value.getFullYear()
      )
    }

    return {
      props,
      visible,
      weekDays,
      currentYear,
      currentMonth,
      displayValue,
      openPopup,
      closePopup,
      prevMonth,
      nextMonth,
      selectDate,
      generateCalendarDays,
      isToday,
      isSelected,
    }
  },

  template: `
    <div class="lyt-calendar">
      <input
        type="text"
        class="lyt-calendar__input"
        :value="displayValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        readonly
        @click="openPopup"
      />
      <span class="lyt-calendar__icon">
        <svg viewBox="0 0 1024 1024" width="1em" height="1em">
          <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
          <path d="M464 336a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm304 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0zM464 528a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm304 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0zM464 720a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm304 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0z" />
        </svg>
      </span>
      <div v-if="visible" class="lyt-calendar__popup">
        <div class="lyt-calendar__header">
          <button class="lyt-calendar__btn" @click="prevMonth">
            <svg viewBox="0 0 1024 1024" width="1em" height="1em">
              <path d="M724 218.3L512 430.3 300 218.3 188 330.3l212 212 212 212 112-112-200-212z" />
            </svg>
          </button>
          <span class="lyt-calendar__title">{{ currentYear }}年{{ currentMonth + 1 }}月</span>
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
            v-for="day in generateCalendarDays()"
            key="day.date.getTime()"
            :class="[
              'lyt-calendar__day',
              !day.isCurrentMonth ? 'lyt-calendar__day--other' : '',
              isToday(day.date) ? 'lyt-calendar__day--today' : '',
              isSelected(day.date) ? 'lyt-calendar__day--selected' : ''
            ].join(' ')"
            @click="day.isCurrentMonth && selectDate(day.date)"
          >
            {{ day.date.getDate() }}
          </div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-calendar {
      position: relative;
      display: inline-block;
      width: 240px;
    }
    .lyt-calendar__input {
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
    .lyt-calendar__input:hover {
      border-color: var(--lyt-color-primary);
    }
    .lyt-calendar__input:disabled {
      background-color: var(--lyt-color-bg-disabled);
      cursor: not-allowed;
    }
    .lyt-calendar__icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--lyt-color-muted);
      pointer-events: none;
    }
    .lyt-calendar__popup {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      padding: 12px;
      min-width: 280px;
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
      border-radius: var(--lyt-radius-sm);
      color: var(--lyt-color-text);
      transition: background-color 0.2s;
    }
    .lyt-calendar__btn:hover {
      background-color: var(--lyt-color-bg);
    }
    .lyt-calendar__title {
      font-size: 16px;
      font-weight: 500;
      color: var(--lyt-color-text);
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
      color: var(--lyt-color-muted);
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
      border-radius: var(--lyt-radius-sm);
      transition: all 0.2s;
      color: var(--lyt-color-text);
      font-size: 14px;
    }
    .lyt-calendar__day:hover:not(.lyt-calendar__day--other) {
      background-color: var(--lyt-color-bg);
    }
    .lyt-calendar__day--other {
      color: var(--lyt-color-muted);
      cursor: default;
    }
    .lyt-calendar__day--today {
      color: var(--lyt-color-primary);
      font-weight: 500;
    }
    .lyt-calendar__day--selected {
      background-color: var(--lyt-color-primary);
      color: white;
    }
  `,
})
