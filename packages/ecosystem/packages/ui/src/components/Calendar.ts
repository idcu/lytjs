/**
 * @lytjs/ui - Calendar 组件
 *
 * 日历组件，支持月/周视图、事件标记、日期禁用功能，原生实现日期渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { CalendarSetupProps } from './types';

interface CalendarEvent {
  title: string;
  start: Date;
  end?: Date;
  color?: string;
  data?: unknown;
}

export const Calendar = defineComponent({
  name: 'LytCalendar',

  props: {
    modelValue: {
      type: [String, Date] as unknown as StringConstructor,
      default: (): Date => new Date(),
    },
    view: { type: String, default: 'month' },
    events: { type: Array, default: (): CalendarEvent[] => [] },
    disabledDates: { type: Function, default: undefined },
    firstDayOfWeek: { type: Number, default: 0 },
    weekNames: { type: Array, default: (): string[] => ['日', '一', '二', '三', '四', '五', '六'] },
    monthNames: {
      type: Array,
      default: (): string[] => [
        '一月',
        '二月',
        '三月',
        '四月',
        '五月',
        '六月',
        '七月',
        '八月',
        '九月',
        '十月',
        '十一月',
        '十二月',
      ],
    },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onEventClick: { type: Function, default: undefined },
    onDateClick: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as CalendarSetupProps;
    const currentDate = signal<Date>(p.modelValue instanceof Date ? p.modelValue : new Date());
    const currentView = signal<string>(p.view);

    const getDaysInMonth = (year: number, month: number): number => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number): number => {
      return new Date(year, month, 1).getDay();
    };

    const isSameDay = (d1: Date, d2: Date): boolean => {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    };

    const isDisabledDate = (date: Date): boolean => {
      if (!p.disabledDates) return false;
      return p.disabledDates(date);
    };

    const getEventsForDate = (date: Date): CalendarEvent[] => {
      return (p.events as CalendarEvent[]).filter((event: CalendarEvent) => {
        const eventDate = new Date(event.start);
        return isSameDay(date, eventDate);
      });
    };

    const prevMonth = () => {
      const date = new Date(currentDate());
      date.setMonth(date.getMonth() - 1);
      currentDate.set(date);
      emitChange(date);
    };

    const nextMonth = () => {
      const date = new Date(currentDate());
      date.setMonth(date.getMonth() + 1);
      currentDate.set(date);
      emitChange(date);
    };

    const goToToday = () => {
      const today = new Date();
      currentDate.set(today);
      emitChange(today);
    };

    const selectDate = (date: Date) => {
      if (isDisabledDate(date)) return;
      currentDate.set(date);
      emitChange(date);
      if (p.onDateClick) {
        p.onDateClick(date);
      }
    };

    const emitChange = (date: Date) => {
      if (p.onChange) {
        p.onChange(date);
      }
    };

    const handleEventClick = (event: CalendarEvent, e: Event) => {
      e.stopPropagation();
      if (p.onEventClick) {
        p.onEventClick(event);
      }
    };

    const renderDayCell = (
      date: Date,
      isCurrentMonth: boolean,
      isToday: boolean,
      isSelected: boolean,
      disabled: boolean = false,
    ): VNode => {
      const events = getEventsForDate(date);

      const classes = [
        'lyt-calendar-day',
        !isCurrentMonth ? 'lyt-calendar-day-other' : '',
        isToday ? 'lyt-calendar-day-today' : '',
        isSelected ? 'lyt-calendar-day-selected' : '',
        disabled ? 'lyt-calendar-day-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ');

      const eventNodes: VNode[] = events.map((event: CalendarEvent) => {
        const color = event.color || '#3b82f6';
        return createVNode(
          'div',
          {
            class: 'lyt-calendar-event',
            style: { backgroundColor: color },
            onClick: (e: Event) => handleEventClick(event, e),
          },
          [createVNode('span', {}, String(event.title))],
        );
      });

      const cellChildren: VNode[] = [
        createVNode('div', { class: 'lyt-calendar-day-number' }, [
          createVNode('span', {}, String(date.getDate())),
        ]),
        ...eventNodes,
      ];

      return createVNode(
        'div',
        {
          class: classes,
          onClick: () => selectDate(date),
        },
        cellChildren,
      );
    };

    const renderMonthView = (): VNode => {
      const year = currentDate().getFullYear();
      const month = currentDate().getMonth();
      const today = new Date();

      const firstDay = getFirstDayOfMonth(year, month);
      const daysInMonth = getDaysInMonth(year, month);
      const daysInPrevMonth = getDaysInMonth(year, month - 1);

      const weeks: VNode[] = [];
      let currentWeek: VNode[] = [];

      for (let i = p.firstDayOfWeek; i < firstDay; i++) {
        const day = daysInPrevMonth - (firstDay - i - 1);
        const date = new Date(year, month - 1, day);
        currentWeek.push(renderDayCell(date, false, false, false, false));
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDay(date, today);
        const isSelected = isSameDay(date, currentDate());
        const disabled = isDisabledDate(date);

        currentWeek.push(renderDayCell(date, true, isToday, isSelected, disabled));

        if (currentWeek.length === 7) {
          weeks.push(createVNode('div', { class: 'lyt-calendar-week' }, currentWeek));
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        let nextDay = 1;
        while (currentWeek.length < 7) {
          const date = new Date(year, month + 1, nextDay);
          currentWeek.push(renderDayCell(date, false, false, false, false));
          nextDay++;
        }
        weeks.push(createVNode('div', { class: 'lyt-calendar-week' }, currentWeek));
      }

      return createVNode('div', { class: 'lyt-calendar-month' }, weeks);
    };

    const renderWeekView = (): VNode => {
      return createVNode('div', { class: 'lyt-calendar-week-view' }, [
        createVNode('span', {}, '周视图（开发中）'),
      ]);
    };

    const renderDayView = (): VNode => {
      return createVNode('div', { class: 'lyt-calendar-day-view' }, [
        createVNode('span', {}, '日视图（开发中）'),
      ]);
    };

    return () => {
      const current = currentDate();
      const headerChildren: VNode[] = [
        createVNode('button', { class: 'lyt-calendar-nav-btn', onClick: prevMonth }, [
          createVNode('span', {}, '‹'),
        ]),
        createVNode('button', { class: 'lyt-calendar-today-btn', onClick: goToToday }, [
          createVNode('span', {}, '今天'),
        ]),
        createVNode('div', { class: 'lyt-calendar-title' }, [
          createVNode(
            'span',
            {},
            `${current.getFullYear()}年 ${(p.monthNames as string[])[current.getMonth()]}`,
          ),
        ]),
        createVNode('button', { class: 'lyt-calendar-nav-btn', onClick: nextMonth }, [
          createVNode('span', {}, '›'),
        ]),
      ];

      const weekHeaderChildren: VNode[] = (p.weekNames as string[]).map((name: string) =>
        createVNode('div', { class: 'lyt-calendar-weekday' }, [createVNode('span', {}, name)]),
      );

      let viewContent: VNode;
      switch (currentView()) {
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
        {
          class: ['lyt-calendar', `lyt-calendar-${currentView()}`, p.class as string]
            .filter(Boolean)
            .join(' '),
        },
        [
          createVNode('div', { class: 'lyt-calendar-header' }, headerChildren),
          createVNode('div', { class: 'lyt-calendar-weekdays' }, weekHeaderChildren),
          viewContent,
        ],
      );
    };
  },
});

export default Calendar;
export type { CalendarEvent };
export type { CalendarProps, CalendarSlots, CalendarSetupProps } from './types';
