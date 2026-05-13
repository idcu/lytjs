/**
 * @lytjs/ui - DatePicker 组件
 *
 * 日期选择器组件
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

// 获取月份天数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// 获取月份第一天是星期几
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// 格式化日期
function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * DatePicker 组件
 */
export const DatePicker = defineComponent({
  name: 'LytDatePicker',

  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '选择日期' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    format: { type: String, default: 'YYYY-MM-DD' },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: any, { emit }: any) {
    const isOpen = signal(false);
    const currentYear = signal(new Date().getFullYear());
    const currentMonth = signal(new Date().getMonth());

    // 生成日历数据
    const generateCalendar = () => {
      const year = currentYear();
      const month = currentMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      
      const days: Array<{ day: number; isCurrentMonth: boolean }> = [];
      
      // 上个月的日期
      const prevMonthDays = getDaysInMonth(year, month - 1);
      for (let i = firstDay - 1; i >= 0; i--) {
        days.push({ day: prevMonthDays - i, isCurrentMonth: false });
      }
      
      // 当前月的日期
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ day: i, isCurrentMonth: true });
      }
      
      // 下个月的日期
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, isCurrentMonth: false });
      }
      
      return days;
    };

    // 选择日期
    const selectDate = (day: number, isCurrentMonth: boolean) => {
      if (!isCurrentMonth) return;
      
      const date = new Date(currentYear(), currentMonth(), day);
      const formatted = formatDate(date, props.format);
      
      emit('update:modelValue', formatted);
      props.onChange?.(formatted);
      isOpen.set(false);
    };

    // 上个月
    const prevMonth = () => {
      if (currentMonth() === 0) {
        currentYear.set(currentYear() - 1);
        currentMonth.set(11);
      } else {
        currentMonth.set(currentMonth() - 1);
      }
    };

    // 下个月
    const nextMonth = () => {
      if (currentMonth() === 11) {
        currentYear.set(currentYear() + 1);
        currentMonth.set(0);
      } else {
        currentMonth.set(currentMonth() + 1);
      }
    };

    // 清除
    const clear = (e: Event) => {
      e.stopPropagation();
      emit('update:modelValue', '');
      props.onChange?.('');
    };

    // 月份名称
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // 生成类名
    const getPickerClass = () => {
      const classes = ['lyt-datepicker'];
      if (props.disabled) classes.push('lyt-datepicker--disabled');
      if (isOpen()) classes.push('lyt-datepicker--open');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const calendar = generateCalendar();
      
      const children: any[] = [
        // 输入框
        createVNode('div', {
          class: 'lyt-datepicker__trigger',
          onClick: () => !props.disabled && isOpen.set(!isOpen()),
        }, [
          createVNode('span', { class: 'lyt-datepicker__value' }, props.modelValue || props.placeholder),
          props.clearable && props.modelValue
            ? createVNode('span', { class: 'lyt-datepicker__clear', onClick: clear }, '✕')
            : createVNode('span', { style: 'display: none;' }, ''),
          createVNode('span', { class: 'lyt-datepicker__icon' }, '📅'),
        ]),
      ];

      // 日历面板
      if (isOpen()) {
        const headerChildren: any[] = [
          createVNode('button', { class: 'lyt-datepicker__prev', onClick: prevMonth }, '‹'),
          createVNode('span', { class: 'lyt-datepicker__title' }, `${currentYear()}年 ${monthNames[currentMonth()]}`),
          createVNode('button', { class: 'lyt-datepicker__next', onClick: nextMonth }, '›'),
        ];

        const weekChildren = weekDays.map(day =>
          createVNode('div', { class: 'lyt-datepicker__week-day' }, day)
        );

        const dayChildren = calendar.map((item) =>
          createVNode('div', {
            class: `lyt-datepicker__day ${item.isCurrentMonth ? '' : 'lyt-datepicker__day--other'} ${item.isCurrentMonth && props.modelValue === formatDate(new Date(currentYear(), currentMonth(), item.day), props.format) ? 'lyt-datepicker__day--selected' : ''}`,
            onClick: () => selectDate(item.day, item.isCurrentMonth),
          }, String(item.day))
        );

        children.push(
          createVNode('div', { class: 'lyt-datepicker__panel' }, [
            createVNode('div', { class: 'lyt-datepicker__header' }, headerChildren),
            createVNode('div', { class: 'lyt-datepicker__week' }, weekChildren),
            createVNode('div', { class: 'lyt-datepicker__days' }, dayChildren),
          ])
        );
      }

      return createVNode('div', { class: getPickerClass() }, children);
    };
  },
});

export default DatePicker;
