/**
 * @lytjs/ui - TimePicker 组件
 *
 * 时间选择器组件，支持任意时间点、范围选择、自定义格式
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface TimePickerSetupProps {
  modelValue: string | [string, string] | null;
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  format: string;
  isRange: boolean;
  step: string;
  minTime: string;
  maxTime: string;
  class: string;
  onChange: ((value: string | [string, string] | null) => void) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

export interface TimePickerSlots {
  default?: () => VNode[];
}

export const TimePicker = defineComponent({
  name: 'LytTimePicker',

  props: {
    modelValue: { type: [String, Array], default: null },
    placeholder: { type: String, default: '选择时间' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    format: { type: String, default: 'HH:mm:ss' },
    isRange: { type: Boolean, default: false },
    step: { type: String, default: '00:01:00' },
    minTime: { type: String, default: '' },
    maxTime: { type: String, default: '' },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: TimePickerSetupProps, { slots }: { slots: TimePickerSlots }) {
    const isOpen = signal(false);
    const hours = signal(0);
    const minutes = signal(0);
    const seconds = signal(0);
    const rangeStartHour = signal(0);
    const rangeStartMinute = signal(0);
    const rangeStartSecond = signal(0);
    const rangeEndHour = signal(0);
    const rangeEndMinute = signal(0);
    const rangeEndSecond = signal(0);
    const selectPart = signal<'hour' | 'minute' | 'second'>('hour');

    const parseTime = (timeStr: string): { hours: number; minutes: number; seconds: number } => {
      const parts = timeStr.split(':').map(Number);
      return {
        hours: parts[0] || 0,
        minutes: parts[1] || 0,
        seconds: parts[2] || 0,
      };
    };

    const formatTime = (h: number, m: number, s: number): string => {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const toggleDropdown = () => {
      if (props.disabled) return;
      isOpen.set(!isOpen());
      if (isOpen()) {
        props.onOpen?.();
      } else {
        props.onClose?.();
      }
    };

    const handleSelectTime = () => {
      if (props.isRange) {
        const result: [string, string] = [
          formatTime(rangeStartHour(), rangeStartMinute(), rangeStartSecond()),
          formatTime(rangeEndHour(), rangeEndMinute(), rangeEndSecond()),
        ];
        props.onChange?.(result);
      } else {
        const result = formatTime(hours(), minutes(), seconds());
        props.onChange?.(result);
      }
      isOpen.set(false);
    };

    const handleClear = (e: Event) => {
      e.stopPropagation();
      props.onChange?.(null);
    };

    const getDisplayValue = (): string => {
      if (props.isRange && Array.isArray(props.modelValue)) {
        return `${props.modelValue[0]} - ${props.modelValue[1]}`;
      }
      return props.modelValue as string || '';
    };

    return () => {
      const pickerClass = [
        'lyt-time-picker',
        isOpen() ? 'lyt-time-picker--open' : '',
        props.disabled ? 'lyt-time-picker--disabled' : '',
        props.class,
      ].filter(Boolean).join(' ');

      const displayValue = getDisplayValue();

      const hourOptions: VNode[] = [];
      for (let i = 0; i < 24; i++) {
        hourOptions.push(createVNode('option', { value: i }, [String(i).padStart(2, '0')]));
      }

      const minuteSecondOptions: VNode[] = [];
      for (let i = 0; i < 60; i++) {
        minuteSecondOptions.push(createVNode('option', { value: i }, [String(i).padStart(2, '0')]));
      }

      return createVNode('div', { class: pickerClass }, [
        createVNode('div', { class: 'lyt-time-picker__trigger', onClick: toggleDropdown }, [
          createVNode('span', {
            class: ['lyt-time-picker__input', !displayValue ? 'lyt-time-picker__input--placeholder' : ''].filter(Boolean).join(' '),
          }, [displayValue || props.placeholder]),
          props.clearable && displayValue && createVNode('span', {
            class: 'lyt-time-picker__clear',
            onClick: handleClear,
          }, ['×']),
        ]),
        isOpen() && createVNode('div', { class: 'lyt-time-picker__dropdown' }, [
          createVNode('div', { class: 'lyt-time-picker__panel' }, [
            props.isRange ? createVNode('div', { class: 'lyt-time-picker__range' }, [
              createVNode('div', { class: 'lyt-time-picker__select-group' }, [
                createVNode('select', {
                  class: 'lyt-time-picker__select',
                  value: rangeStartHour(),
                  onChange: (e: Event) => rangeStartHour.set(Number((e.target as HTMLSelectElement).value)),
                }, [hourOptions]),
                createVNode('span', {}, [':']),
                createVNode('select', {
                  class: 'lyt-time-picker__select',
                  value: rangeStartMinute(),
                  onChange: (e: Event) => rangeStartMinute.set(Number((e.target as HTMLSelectElement).value)),
                }, [minuteSecondOptions]),
                createVNode('span', {}, [':']),
                createVNode('select', {
                  class: 'lyt-time-picker__select',
                  value: rangeStartSecond(),
                  onChange: (e: Event) => rangeStartSecond.set(Number((e.target as HTMLSelectElement).value)),
                }, [minuteSecondOptions]),
              ]),
              createVNode('span', { class: 'lyt-time-picker__separator' }, ['-']),
              createVNode('div', { class: 'lyt-time-picker__select-group' }, [
                createVNode('select', {
                  class: 'lyt-time-picker__select',
                  value: rangeEndHour(),
                  onChange: (e: Event) => rangeEndHour.set(Number((e.target as HTMLSelectElement).value)),
                }, [hourOptions]),
                createVNode('span', {}, [':']),
                createVNode('select', {
                  class: 'lyt-time-picker__select',
                  value: rangeEndMinute(),
                  onChange: (e: Event) => rangeEndMinute.set(Number((e.target as HTMLSelectElement).value)),
                }, [minuteSecondOptions]),
                createVNode('span', {}, [':']),
                createVNode('select', {
                  class: 'lyt-time-picker__select',
                  value: rangeEndSecond(),
                  onChange: (e: Event) => rangeEndSecond.set(Number((e.target as HTMLSelectElement).value)),
                }, [minuteSecondOptions]),
              ]),
            ]) : createVNode('div', { class: 'lyt-time-picker__select-group' }, [
              createVNode('select', {
                class: 'lyt-time-picker__select',
                value: hours(),
                onChange: (e: Event) => hours.set(Number((e.target as HTMLSelectElement).value)),
              }, [hourOptions]),
              createVNode('span', {}, [':']),
              createVNode('select', {
                class: 'lyt-time-picker__select',
                value: minutes(),
                onChange: (e: Event) => minutes.set(Number((e.target as HTMLSelectElement).value)),
              }, [minuteSecondOptions]),
              createVNode('span', {}, [':']),
              createVNode('select', {
                class: 'lyt-time-picker__select',
                value: seconds(),
                onChange: (e: Event) => seconds.set(Number((e.target as HTMLSelectElement).value)),
              }, [minuteSecondOptions]),
            ]),
          ]),
          createVNode('div', { class: 'lyt-time-picker__footer' }, [
            createVNode('button', {
              class: 'lyt-time-picker__confirm-btn',
              onClick: handleSelectTime,
            }, ['确定']),
          ]),
        ]),
      ]);
    };
  },
});

export type { TimePickerProps, TimePickerSlots } from './types';
