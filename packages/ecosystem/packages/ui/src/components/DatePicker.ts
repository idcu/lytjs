/**
 * @lytjs/ui - DatePicker 组件
 *
 * 日期选择器组件，支持范围选择、时间选择、禁用日期、快捷选项，自研日期处理逻辑（零依赖）
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

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

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export type DatePickerType = 'date' | 'datetime' | 'daterange' | 'datetimerange';

export interface DatePickerShortcut {
  text: string;
  value: Date | Date[];
  onClick?: () => void;
}

export interface DatePickerSetupProps {
  modelValue: string | Date | (string | Date)[] | null;
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  format: string;
  type: DatePickerType;
  disabledDate: ((date: Date) => boolean) | undefined;
  shortcuts: DatePickerShortcut[];
  class: string;
  onChange: ((value: string | Date | (string | Date)[] | null) => void) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

export interface DatePickerSlots {
  default?: () => VNode[];
  footer?: () => VNode[];
}

export const DatePicker = defineComponent({
  name: 'LytDatePicker',

  props: {
    modelValue: { type: [String, Date, Array], default: null },
    placeholder: { type: String, default: '选择日期' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    format: { type: String, default: 'YYYY-MM-DD' },
    type: { type: String, default: 'date' },
    disabledDate: { type: Function, default: undefined },
    shortcuts: { type: Array, default: (): DatePickerShortcut[] => [] },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: DatePickerSetupProps, { slots }: { slots: DatePickerSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const isOpen = signal(false);
    const currentYear = signal(new Date().getFullYear());
    const currentMonth = signal(new Date().getMonth());
    const selectDate = signal<Date | null>(null);
    const rangeStart = signal<Date | null>(null);
    const rangeEnd = signal<Date | null>(null);
    const showTime = signal(false);
    const currentHours = signal(0);
    const currentMinutes = signal(0);
    const currentSeconds = signal(0);

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    const getCalendarDays = (): (Date | null)[] => {
      const year = currentYear();
      const month = currentMonth();
      const firstDay = getFirstDayOfMonth(year, month);
      const daysInMonth = getDaysInMonth(year, month);
      
      const days: (Date | null)[] = [];
      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }
      return days;
    };

    const getMonthLabel = (): string => {
      return `${currentYear()}年${String(currentMonth() + 1).padStart(2, '0')}月`;
    };

    const prevMonth = () => {
      if (currentMonth() === 0) {
        currentMonth.set(11);
        currentYear.set(currentYear() - 1);
      } else {
        currentMonth.set(currentMonth() - 1);
      }
    };

    const nextMonth = () => {
      if (currentMonth() === 11) {
        currentMonth.set(0);
        currentYear.set(currentYear() + 1);
      } else {
        currentMonth.set(currentMonth() + 1);
      }
    };

    const handleSelectDate = (date: Date) => {
      if (props.disabledDate?.(date)) return;
      
      selectDate.set(date);
      currentHours.set(date.getHours());
      currentMinutes.set(date.getMinutes());
      currentSeconds.set(date.getSeconds());

      if (props.type === 'date') {
        const result = formatDate(date, props.format);
        emit('update:modelValue', result);
        emit('change', result);
        props.onChange?.(result);
        if (props.type !== 'datetime') {
          isOpen.set(false);
        }
      } else if (props.type === 'datetime') {
        showTime.set(true);
      } else {
        if (!rangeStart()) {
          rangeStart.set(date);
        } else if (!rangeEnd()) {
          rangeEnd.set(date);
          const start = rangeStart()!;
          const end = rangeEnd()!;
          const result = [formatDate(start, props.format), formatDate(end, props.format)];
          emit('update:modelValue', result);
          emit('change', result);
          props.onChange?.(result);
        } else {
          rangeStart.set(date);
          rangeEnd.set(null);
        }
      }
    };

    const handleTimeChange = () => {
      const date = selectDate();
      if (!date) return;

      const newDate = new Date(date);
      newDate.setHours(currentHours());
      newDate.setMinutes(currentMinutes());
      newDate.setSeconds(currentSeconds());

      const result = formatDate(newDate, props.format);
      emit('update:modelValue', result);
      emit('change', result);
      props.onChange?.(result);
      isOpen.set(false);
    };

    const handleClear = (e: Event) => {
      e.stopPropagation();
      selectDate.set(null);
      rangeStart.set(null);
      rangeEnd.set(null);
      emit('update:modelValue', null);
      emit('change', null);
      props.onChange?.(null);
    };

    const handleShortcutClick = (shortcut: DatePickerShortcut) => {
      if (shortcut.onClick) {
        shortcut.onClick();
      } else if (shortcut.value instanceof Date) {
        handleSelectDate(shortcut.value);
      } else if (Array.isArray(shortcut.value)) {
        rangeStart.set(shortcut.value[0]);
        rangeEnd.set(shortcut.value[1]);
      }
    };

    const toggleDropdown = () => {
      if (props.disabled) return;
      isOpen.set(!isOpen());
      if (isOpen()) {
        emit('open');
        props.onOpen?.();
      } else {
        emit('close');
        props.onClose?.();
      }
    };

    const isDateSelected = (date: Date): boolean => {
      if (selectDate() && isSameDay(date, selectDate()!)) return true;
      if (rangeStart() && isSameDay(date, rangeStart()!)) return true;
      if (rangeEnd() && isSameDay(date, rangeEnd()!)) return true;
      return false;
    };

    const isInRange = (date: Date): boolean => {
      if (!rangeStart() || !rangeEnd()) return false;
      const start = rangeStart()!;
      const end = rangeEnd()!;
      return date > start && date < end;
    };

    const isToday = (date: Date): boolean => {
      return isSameDay(date, new Date());
    };

    const isDisabled = (date: Date): boolean => {
      return props.disabledDate?.(date) ?? false;
    };

    const getDisplayValue = (): string => {
      if (props.type === 'daterange' || props.type === 'datetimerange') {
        if (rangeStart() && rangeEnd()) {
          return `${formatDate(rangeStart()!, props.format)} - ${formatDate(rangeEnd()!, props.format)}`;
        }
        return '';
      }
      return selectDate() ? formatDate(selectDate()!, props.format) : '';
    };

    return () => {
      const pickerClass = [
        'lyt-date-picker',
        isOpen() ? 'lyt-date-picker--open' : '',
        props.disabled ? 'lyt-date-picker--disabled' : '',
        props.class,
      ].filter(Boolean).join(' ');

      const calendarDays = getCalendarDays();
      const displayValue = getDisplayValue();

      const calendarContent: VNode[] = [];

      const header: VNode[] = [
        createVNode('button', {
          class: 'lyt-date-picker__nav-btn',
          onClick: prevMonth,
        }, ['◀']),
        createVNode('span', { class: 'lyt-date-picker__month-label' }, [getMonthLabel()]),
        createVNode('button', {
          class: 'lyt-date-picker__nav-btn',
          onClick: nextMonth,
        }, ['▶']),
      ];
      calendarContent.push(createVNode('div', { class: 'lyt-date-picker__header' }, [header]));

      const weekHeader: VNode[] = weekDays.map(day => 
        createVNode('span', { class: 'lyt-date-picker__weekday' }, [day])
      );
      calendarContent.push(createVNode('div', { class: 'lyt-date-picker__week-header' }, [weekHeader]));

      const dayButtons: VNode[] = calendarDays.map((date, index) => {
        if (!date) {
          return createVNode('span', { key: `empty-${index}`, class: 'lyt-date-picker__day lyt-date-picker__day--empty' }, [' ']);
        }

        const selected = isDateSelected(date);
        const inRange = isInRange(date);
        const today = isToday(date);
        const disabled = isDisabled(date);

        return createVNode('button', {
          key: date.toISOString(),
          class: [
            'lyt-date-picker__day',
            selected ? 'lyt-date-picker__day--selected' : '',
            inRange ? 'lyt-date-picker__day--in-range' : '',
            today ? 'lyt-date-picker__day--today' : '',
            disabled ? 'lyt-date-picker__day--disabled' : '',
          ].filter(Boolean).join(' '),
          disabled: disabled,
          onClick: () => handleSelectDate(date),
        }, [String(date.getDate())]);
      });
      calendarContent.push(createVNode('div', { class: 'lyt-date-picker__days' }, [dayButtons]));

      if (showTime() || props.type === 'datetime') {
        showTime.set(true);
        const timeControls: VNode[] = [
          createVNode('input', {
            type: 'number',
            class: 'lyt-date-picker__time-input',
            value: currentHours(),
            min: 0,
            max: 23,
            onInput: (e: Event) => currentHours.set(Number((e.target as HTMLInputElement).value)),
          }),
          createVNode('span', {}, [':']),
          createVNode('input', {
            type: 'number',
            class: 'lyt-date-picker__time-input',
            value: currentMinutes(),
            min: 0,
            max: 59,
            onInput: (e: Event) => currentMinutes.set(Number((e.target as HTMLInputElement).value)),
          }),
          createVNode('span', {}, [':']),
          createVNode('input', {
            type: 'number',
            class: 'lyt-date-picker__time-input',
            value: currentSeconds(),
            min: 0,
            max: 59,
            onInput: (e: Event) => currentSeconds.set(Number((e.target as HTMLInputElement).value)),
          }),
        ];
        calendarContent.push(createVNode('div', { class: 'lyt-date-picker__time' }, [
          timeControls,
          createVNode('button', {
            class: 'lyt-date-picker__confirm-btn',
            onClick: handleTimeChange,
          }, ['确定']),
        ]));
      }

      const footerContent: VNode[] = [];
      
      if (props.shortcuts.length > 0) {
        const shortcuts: VNode[] = props.shortcuts.map((shortcut: DatePickerShortcut) =>
          createVNode('button', {
            class: 'lyt-date-picker__shortcut',
            onClick: () => handleShortcutClick(shortcut),
          }, [shortcut.text])
        );
        footerContent.push(createVNode('div', { class: 'lyt-date-picker__shortcuts' }, [shortcuts]));
      }

      if (slots.footer) {
        footerContent.push(slots.footer());
      }

      if (footerContent.length > 0) {
        calendarContent.push(createVNode('div', { class: 'lyt-date-picker__footer' }, [footerContent]));
      }

      return createVNode('div', { class: pickerClass }, [
        createVNode('div', { class: 'lyt-date-picker__trigger', onClick: toggleDropdown }, [
          createVNode('span', {
            class: ['lyt-date-picker__input', !displayValue ? 'lyt-date-picker__input--placeholder' : ''].filter(Boolean).join(' '),
          }, [displayValue || props.placeholder]),
          props.clearable && displayValue && createVNode('span', {
            class: 'lyt-date-picker__clear',
            onClick: handleClear,
          }, ['×']),
        ]),
        isOpen() && createVNode('div', { class: 'lyt-date-picker__dropdown' }, [
          createVNode('div', { class: 'lyt-date-picker__calendar' }, [calendarContent]),
        ]),
      ]);
    };
  },
});

export type { DatePickerProps, DatePickerSlots, DatePickerShortcut, DatePickerType } from './types';
