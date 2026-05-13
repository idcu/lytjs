/**
 * @lytjs/ui - DatePicker 组件
 *
 * 日期选择器组件，支持范围选择、时间选择、禁用日期、快捷选项，自研日期处理逻辑（零依赖）
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
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}



// 是否是同一天
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

/**
 * DatePicker 组件
 */
export const DatePicker = defineComponent({
  name: 'LytDatePicker',

  props: {
    modelValue: { type: [String, Array] as any, default: '' },
    placeholder: { type: String, default: '选择日期' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    format: { type: String, default: 'YYYY-MM-DD' },
    type: { type: String, default: 'date', validator: (v: any) => ['date', 'datetime', 'daterange', 'datetimerange'].includes(v) },
    disabledDate: { type: Function, default: undefined },
    shortcuts: { type: Array, default: () => [] },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: any, { emit }: any) {
    const isOpen = signal(false);
    const currentYear = signal(new Date().getFullYear());
    const currentMonth = signal(new Date().getMonth());
    const currentMonthEnd = signal(new Date().getMonth());
    const selectDate = signal<Date | null>(null);
    const rangeStart = signal<Date | null>(null);
    const rangeEnd = signal<Date | null>(null);
    const showTime = signal(false);
    const currentHours = signal(0);
    const currentMinutes = signal(0);
    const currentSeconds = signal(0);
    const currentHoursEnd = signal(23);
    const currentMinutesEnd = signal(59);
    const currentSecondsEnd = signal(59);

    // 打开/关闭
    const toggleOpen = () => {
      if (props.disabled) return;
      const newState = !isOpen();
      isOpen.set(newState);
      if (newState) {
        props.onOpen?.();
      } else {
        props.onClose?.();
      }
    };

    // 生成日历数据
    const generateCalendar = (year: number, month: number) => {
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      
      const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
      
      // 上个月的日期
      const prevMonthDays = getDaysInMonth(year, month - 1);
      for (let i = firstDay - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevMonthDays - i);
        days.push({ day: prevMonthDays - i, isCurrentMonth: false, date });
      }
      
      // 当前月的日期
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        days.push({ day: i, isCurrentMonth: true, date });
      }
      
      // 下个月的日期
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        days.push({ day: i, isCurrentMonth: false, date });
      }
      
      return days;
    };

    // 检查日期是否禁用
    const isDateDisabled = (date: Date): boolean => {
      if (props.disabledDate) {
        return props.disabledDate(date);
      }
      return false;
    };

    // 检查日期是否在范围内
    const isDateInRange = (date: Date): boolean => {
      if (!rangeStart() || !rangeEnd()) return false;
      return date >= rangeStart()! && date <= rangeEnd()!;
    };

    // 检查日期是否是范围开始或结束
    const isRangeBoundary = (date: Date): 'start' | 'end' | null => {
      if (rangeStart() && isSameDay(date, rangeStart()!)) return 'start';
      if (rangeEnd() && isSameDay(date, rangeEnd()!)) return 'end';
      return null;
    };

    // 选择日期
    const handleDateClick = (item: { date: Date; isCurrentMonth: boolean }) => {
      if (!item.isCurrentMonth || isDateDisabled(item.date)) return;

      if (props.type === 'daterange' || props.type === 'datetimerange') {
        if (!rangeStart() || (rangeStart() && rangeEnd())) {
          rangeStart.set(item.date);
          rangeEnd.set(null);
        } else {
          if (item.date < rangeStart()!) {
            rangeEnd.set(rangeStart());
            rangeStart.set(item.date);
          } else {
            rangeEnd.set(item.date);
          }
          completeRangeSelection();
        }
      } else {
        selectDate.set(item.date);
        completeSingleSelection();
      }
    };

    // 完成单个日期选择
    const completeSingleSelection = () => {
      if (!showTime()) {
        if (selectDate()) {
          const formatted = formatDate(selectDate()!, props.format);
          emit('update:modelValue', formatted);
          props.onChange?.(formatted);
          isOpen.set(false);
        }
      }
    };

    // 完成范围选择
    const completeRangeSelection = () => {
      if (rangeStart() && rangeEnd()) {
        const start = rangeStart()!;
        const end = rangeEnd()!;
        
        if (showTime()) {
          start.setHours(currentHours(), currentMinutes(), currentSeconds());
          end.setHours(currentHoursEnd(), currentMinutesEnd(), currentSecondsEnd());
        }

        const formattedStart = formatDate(start, props.format);
        const formattedEnd = formatDate(end, props.format);
        emit('update:modelValue', [formattedStart, formattedEnd]);
        props.onChange?.([formattedStart, formattedEnd]);
        isOpen.set(false);
      }
    };

    // 确定选择
    const confirmSelection = () => {
      if (props.type === 'daterange' || props.type === 'datetimerange') {
        completeRangeSelection();
      } else {
        completeSingleSelection();
      }
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

    // 上个月（结束面板）
    const prevMonthEnd = () => {
      if (currentMonthEnd() === 0) {
        currentYear.set(currentYear() - 1);
        currentMonthEnd.set(11);
      } else {
        currentMonthEnd.set(currentMonthEnd() - 1);
      }
    };

    // 下个月（结束面板）
    const nextMonthEnd = () => {
      if (currentMonthEnd() === 11) {
        currentYear.set(currentYear() + 1);
        currentMonthEnd.set(0);
      } else {
        currentMonthEnd.set(currentMonthEnd() + 1);
      }
    };

    // 清除
    const clear = (e: Event) => {
      e.stopPropagation();
      selectDate.set(null);
      rangeStart.set(null);
      rangeEnd.set(null);
      emit('update:modelValue', props.type.includes('range') ? [] : '');
      props.onChange?.(props.type.includes('range') ? [] : '');
    };

    // 快捷选项点击
    const handleShortcutClick = (shortcut: { text: string; value: () => Date | [Date, Date] }) => {
      const value = shortcut.value();
      if (Array.isArray(value)) {
        rangeStart.set(value[0]);
        rangeEnd.set(value[1]);
        if (props.type.includes('range')) {
          const formattedStart = formatDate(value[0], props.format);
          const formattedEnd = formatDate(value[1], props.format);
          emit('update:modelValue', [formattedStart, formattedEnd]);
          props.onChange?.([formattedStart, formattedEnd]);
          isOpen.set(false);
        }
      } else {
          selectDate.set(value);
          const formatted = formatDate(value, props.format);
          emit('update:modelValue', formatted);
          props.onChange?.(formatted);
          isOpen.set(false);
        }
    };

    // 切换时间选择
    const toggleTimeSelect = () => {
      showTime.set(!showTime());
    };

    // 月份名称
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // 生成类名
    const getPickerClass = () => {
      const classes = ['lyt-datepicker'];
      if (props.disabled) classes.push('lyt-datepicker--disabled');
      if (isOpen()) classes.push('lyt-datepicker--open');
      if (props.type.includes('range')) classes.push('lyt-datepicker--range');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    // 渲染单个日历
    const renderCalendar = (year: number, month: number, isEnd: boolean = false) => {
      const calendar = generateCalendar(year, month);
      
      const headerChildren: any[] = [
        createVNode('button', { class: 'lyt-datepicker__prev', onClick: isEnd ? prevMonthEnd : prevMonth }, '‹'),
        createVNode('span', { class: 'lyt-datepicker__title' }, `${year}年 ${monthNames[month]}`),
        createVNode('button', { class: 'lyt-datepicker__next', onClick: isEnd ? nextMonthEnd : nextMonth }, '›'),
      ];

      const weekChildren = weekDays.map(day =>
        createVNode('div', { class: 'lyt-datepicker__week-day' }, day)
      );

      const dayChildren = calendar.map((item) => {
        const isSelected = selectDate() ? isSameDay(item.date, selectDate()!) : false;
        const isDisabled = isDateDisabled(item.date);
        const isInRange = isDateInRange(item.date);
        const rangeBoundary = isRangeBoundary(item.date);
        
        let dayClass = 'lyt-datepicker__day';
        if (!item.isCurrentMonth) dayClass += ' lyt-datepicker__day--other';
        if (isSelected) dayClass += ' lyt-datepicker__day--selected';
        if (isDisabled) dayClass += ' lyt-datepicker__day--disabled';
        if (isInRange) dayClass += ' lyt-datepicker__day--in-range';
        if (rangeBoundary === 'start') dayClass += ' lyt-datepicker__day--range-start';
        if (rangeBoundary === 'end') dayClass += ' lyt-datepicker__day--range-end';

        return createVNode('div', {
          class: dayClass,
          onClick: () => !isDisabled && handleDateClick(item),
        }, String(item.day));
      });

      return createVNode('div', { class: 'lyt-datepicker__calendar' }, [
        createVNode('div', { class: 'lyt-datepicker__header' }, headerChildren),
        createVNode('div', { class: 'lyt-datepicker__week' }, weekChildren),
        createVNode('div', { class: 'lyt-datepicker__days' }, dayChildren),
      ]);
    };

    // 渲染时间选择器
    const renderTimePicker = (isEnd: boolean = false) => {
      if (!showTime()) return null;
      
      const hours = isEnd ? currentHoursEnd() : currentHours();
      const minutes = isEnd ? currentMinutesEnd() : currentMinutes();
      const seconds = isEnd ? currentSecondsEnd() : currentSeconds();
      
      const hoursOptions = Array.from({ length: 24 }, (_, i) => 
        createVNode('option', { value: i, selected: hours === i }, String(i).padStart(2, '0'))
      );
      
      const minuteOptions = Array.from({ length: 60 }, (_, i) => 
        createVNode('option', { value: i, selected: minutes === i }, String(i).padStart(2, '0'))
      );
      
      const secondOptions = Array.from({ length: 60 }, (_, i) => 
        createVNode('option', { value: i, selected: seconds === i }, String(i).padStart(2, '0'))
      );

      return createVNode('div', { class: 'lyt-datepicker__time' }, [
        createVNode('select', { 
          class: 'lyt-datepicker__time-select',
          onchange: (e: Event) => {
            const target = e.target as HTMLSelectElement;
            if (isEnd) {
              currentHoursEnd.set(parseInt(target.value));
            } else {
              currentHours.set(parseInt(target.value));
            }
          }
        }, hoursOptions),
        createVNode('span', { class: 'lyt-datepicker__time-separator' }, ':'),
        createVNode('select', { 
          class: 'lyt-datepicker__time-select',
          onchange: (e: Event) => {
            const target = e.target as HTMLSelectElement;
            if (isEnd) {
              currentMinutesEnd.set(parseInt(target.value));
            } else {
              currentMinutes.set(parseInt(target.value));
            }
          }
        }, minuteOptions),
        createVNode('span', { class: 'lyt-datepicker__time-separator' }, ':'),
        createVNode('select', { 
          class: 'lyt-datepicker__time-select',
          onchange: (e: Event) => {
            const target = e.target as HTMLSelectElement;
            if (isEnd) {
              currentSecondsEnd.set(parseInt(target.value));
            } else {
              currentSeconds.set(parseInt(target.value));
            }
          }
        }, secondOptions),
      ]);
    };

    return () => {
      let displayValue = '';
      if (props.type.includes('range') && Array.isArray(props.modelValue)) {
        displayValue = props.modelValue.join(' 至 ');
      } else if (typeof props.modelValue === 'string') {
        displayValue = props.modelValue;
      }
      
      const children: any[] = [
        // 输入框
        createVNode('div', {
          class: 'lyt-datepicker__trigger',
          onClick: toggleOpen,
        }, [
          createVNode('span', { class: 'lyt-datepicker__value' }, displayValue || props.placeholder),
          props.clearable && displayValue
            ? createVNode('span', { class: 'lyt-datepicker__clear', onClick: clear }, '✕')
            : createVNode('span', { style: 'display: none;' }, ''),
          createVNode('span', { class: 'lyt-datepicker__icon' }, '📅'),
        ]),
      ];

      // 日历面板
      if (isOpen()) {
        const panelChildren: any[] = [];
        
        // 快捷选项
        if (props.shortcuts && props.shortcuts.length > 0) {
          const shortcutChildren = props.shortcuts.map((shortcut: any) =>
            createVNode('div', { 
              class: 'lyt-datepicker__shortcut',
              onClick: () => handleShortcutClick(shortcut),
            }, shortcut.text)
          );
          panelChildren.push(createVNode('div', { class: 'lyt-datepicker__shortcuts' }, shortcutChildren));
        }
        
        // 日历
        const calendarWrapper: any[] = [];
        
        if (props.type.includes('range')) {
          calendarWrapper.push(renderCalendar(currentYear(), currentMonth()));
          calendarWrapper.push(renderCalendar(currentYear(), currentMonthEnd()), true);
        } else {
          calendarWrapper.push(renderCalendar(currentYear(), currentMonth()));
        }
        
        panelChildren.push(createVNode('div', { class: 'lyt-datepicker__calendars' }, calendarWrapper));
        
        // 时间选择
        if ((props.type === 'datetime' || props.type === 'datetimerange')) {
          const timeWrapper: any[] = [];
          timeWrapper.push(createVNode('button', { 
            class: 'lyt-datepicker__time-toggle', 
            onClick: toggleTimeSelect,
          }, showTime() ? '隐藏时间' : '选择时间'));
          
          if (showTime()) {
            if (props.type.includes('range')) {
              timeWrapper.push(renderTimePicker(false));
              timeWrapper.push(renderTimePicker(true));
            } else {
              timeWrapper.push(renderTimePicker(false));
            }
            timeWrapper.push(createVNode('button', { 
              class: 'lyt-datepicker__confirm',
              onClick: confirmSelection,
            }, '确定'));
          }
          
          panelChildren.push(createVNode('div', { class: 'lyt-datepicker__time-wrapper' }, timeWrapper));
        }

        children.push(
          createVNode('div', { class: 'lyt-datepicker__panel' }, panelChildren)
        );
      }

      return createVNode('div', { class: getPickerClass() }, children);
    };
  },
});

export default DatePicker;
