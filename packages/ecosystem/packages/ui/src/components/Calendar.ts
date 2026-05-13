/**
 * @lytjs/ui - Calendar 组件
 *
 * 日历组件，支持月/周视图、事件标记、日期禁用功能，原生实现日期渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Calendar 事件数据结构
 */
interface CalendarEvent {
  title: string;
  start: Date;
  end?: Date;
  color?: string;
  data?: any;
}

/**
 * Calendar 组件
 */
export const Calendar = defineComponent({
  name: 'LytCalendar',

  props: {
    modelValue: { type: [String, Date], default: () => new Date() },
    view: { type: String, default: 'month', validator: (v: string) => ['month', 'week', 'day'].includes(v) },
    events: { type: Array, default: () => [] },
    disabledDates: { type: Function, default: undefined },
    firstDayOfWeek: { type: Number, default: 0 },
    weekNames: { type: Array, default: () => ['日', '一', '二', '三', '四', '五', '六'] },
    monthNames: { type: Array, default: () => ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'] },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onEventClick: { type: Function, default: undefined },
    onDateClick: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const currentDate = signal<Date>(
      props.modelValue instanceof Date ? props.modelValue : new Date(props.modelValue)
    );
    const currentView = signal<string>(props.view);

    // 获取月份天数
    const getDaysInMonth = (year: number, month: number): number => {
      return new Date(year, month + 1, 0).getDate();
    };

    // 获取月份第一天是星期几
    const getFirstDayOfMonth = (year: number, month: number): number => {
      return new Date(year, month, 1).getDay();
    };

    // 格式化日期
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 检查是否是同一天
    const isSameDay = (d1: Date, d2: Date): boolean => {
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
    };

    // 检查日期是否被禁用
    const isDisabled = (date: Date): boolean => {
      if (!props.disabledDates) return false;
      return props.disabledDates(date);
    };

    // 获取指定日期的事件
    const getEventsForDate = (date: Date): CalendarEvent[] => {
      return props.events.filter((event: CalendarEvent) => {
        const eventDate = new Date(event.start);
        return isSameDay(date, eventDate);
      });
    };

    // 切换到上个月
    const prevMonth = () => {
      const date = new Date(currentDate.value);
      date.setMonth(date.getMonth() - 1);
      currentDate.set(date);
      emitChange(date);
    };

    // 切换到下个月
    const nextMonth = () => {
      const date = new Date(currentDate.value);
      date.setMonth(date.getMonth() + 1);
      currentDate.set(date);
      emitChange(date);
    };

    // 切换到今天
    const goToToday = () => {
      const today = new Date();
      currentDate.set(today);
      emitChange(today);
    };

    // 选择日期
    const selectDate = (date: Date) => {
      if (isDisabled(date)) return;
      currentDate.set(date);
      emitChange(date);
      if (props.onDateClick) {
        props.onDateClick(date);
      }
    };

    // 触发变更事件
    const emitChange = (date: Date) => {
      const formatted = formatDate(date);
      emit('update:modelValue', formatted);
      if (props.onChange) {
        props.onChange(date);
      }
    };

    // 点击事件
    const handleEventClick = (event: CalendarEvent, e: Event) => {
      e.stopPropagation();
      if (props.onEventClick) {
        props.onEventClick(event);
      }
    };

    // 渲染月视图
    const renderMonthView = () => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      const today = new Date();
      
      const firstDay = getFirstDayOfMonth(year, month);
      const daysInMonth = getDaysInMonth(year, month);
      const daysInPrevMonth = getDaysInMonth(year, month - 1);
      
      const weeks: any[] = [];
      let currentWeek: any[] = [];

      // 上个月的日期
      for (let i = props.firstDayOfWeek; i < firstDay; i++) {
        const day = daysInPrevMonth - (firstDay - i - 1);
        const date = new Date(year, month - 1, day);
        currentWeek.push(renderDayCell(date, false, false, false));
      }

      // 当月的日期
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDay(date, today);
        const isSelected = isSameDay(date, currentDate.value);
        const disabled = isDisabled(date);

        currentWeek.push(renderDayCell(date, true, isToday, isSelected, disabled));

        if (currentWeek.length === 7) {
          weeks.push(createVNode('div', { class: 'lyt-calendar-week' }, currentWeek));
          currentWeek = [];
        }
      }

      // 下个月的日期
      if (currentWeek.length > 0) {
        let nextDay = 1;
        while (currentWeek.length < 7) {
          const date = new Date(year, month + 1, nextDay);
          currentWeek.push(renderDayCell(date, false, false, false));
          nextDay++;
        }
        weeks.push(createVNode('div', { class: 'lyt-calendar-week' }, currentWeek));
      }

      return createVNode('div', { class: 'lyt-calendar-month' }, weeks);
    };

    // 渲染日期单元格
    const renderDayCell = (
      date: Date, 
      isCurrentMonth: boolean, 
      isToday: boolean, 
      isSelected: boolean, 
      isDisabled: boolean = false
    ) => {
      const day = date.getDate();
      const events = getEventsForDate(date);
      
      let classes = ['lyt-calendar-day'];
      if (!isCurrentMonth) classes.push('lyt-calendar-day-other');
      if (isToday) classes.push('lyt-calendar-day-today');
      if (isSelected) classes.push('lyt-calendar-day-selected');
      if (isDisabled) classes.push('lyt-calendar-day-disabled');

      const eventNodes = events.map((event: CalendarEvent, index: number) => {
        const color = event.color || '#3b82f6';
        return createVNode(
          'div',
          {
            class: 'lyt-calendar-event',
            style: { backgroundColor: color },
            onClick: (e: Event) => handleEventClick(event, e)
          },
          event.title
        );
      });

      return createVNode(
        'div',
        {
          class: classes.join(' '),
          onClick: () => selectDate(date)
        },
        [
          createVNode('div', { class: 'lyt-calendar-day-number' }, day),
          ...eventNodes
        ]
      );
    };

    // 渲染周视图
    const renderWeekView = () => {
      return createVNode(
        'div',
        { class: 'lyt-calendar-week-view' },
        '周视图（开发中）'
      );
    };

    // 渲染日视图
    const renderDayView = () => {
      return createVNode(
        'div',
        { class: 'lyt-calendar-day-view' },
        '日视图（开发中）'
      );
    };

    // 生成类名
    const getCalendarClass = () => {
      const classes = ['lyt-calendar', `lyt-calendar-${currentView.value}`];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const current = currentDate.value;
      const headerChildren = [
        createVNode('button', { class: 'lyt-calendar-nav-btn', onClick: prevMonth }, '‹'),
        createVNode('button', { class: 'lyt-calendar-today-btn', onClick: goToToday }, '今天'),
        createVNode('div', { class: 'lyt-calendar-title' }, 
          `${current.getFullYear()}年 ${props.monthNames[current.getMonth()]}`
        ),
        createVNode('button', { class: 'lyt-calendar-nav-btn', onClick: nextMonth }, '›')
      ];

      const weekHeaderChildren = props.weekNames.map((name: string) => 
        createVNode('div', { class: 'lyt-calendar-weekday' }, name)
      );

      let viewContent;
      switch (currentView.value) {
        case 'week':
          viewContent = renderWeekView();
          break;
        case 'day':
          viewContent = renderDayView();
          break;
        case 'month':
        default:
          viewContent = renderMonthView();
      }

      return createVNode(
        'div',
        { class: getCalendarClass() },
        [
          createVNode('div', { class: 'lyt-calendar-header' }, headerChildren),
          createVNode('div', { class: 'lyt-calendar-weekdays' }, weekHeaderChildren),
          viewContent
        ]
      );
    };
  },
});

export default Calendar;
export type { CalendarEvent };
