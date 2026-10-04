/**
 * @lytjs/ui - TimePicker 组件
 *
 * 时间选择器组件，支持任意时间点、范围选择、自定义格式
 */

import { defineComponent, type PropType } from '@lytjs/component';
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

export const TimePicker = defineComponent({
  name: 'LytTimePicker',

  props: {
    modelValue: {
      type: [String, Array] as unknown as PropType<string | [string, string] | null>,
      default: null,
    },
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

  setup(props: Record<string, unknown>) {
    const _props = props as unknown as TimePickerSetupProps;
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

    // ★ 2026-10-04：`minTime` / `maxTime` / `step` 声明了却从未使用
    //   ⇒ 时间范围与步长完全不可约束（检测器报「部分未接线」）。
    //   三者都按**分钟数**比较（`'HH:mm'` 字符串解析成 `h * 60 + m`）。
    /** 把 `'HH:mm'`（或 `'HH:mm:ss'`）解析成分钟数；非法返回 null */
    const parseHHmm = (v: unknown): number | null => {
      if (typeof v !== 'string') return null;
      const m = /^(\d{1,2}):(\d{1,2})/.exec(v.trim());
      if (!m) return null;
      const h = Number(m[1]);
      const min = Number(m[2]);
      if (h > 23 || min > 59) return null;
      return h * 60 + min;
    };
    const minMinutes = (): number | null => parseHHmm(_props.minTime);
    const maxMinutes = (): number | null => parseHHmm(_props.maxTime);
    const stepMinutes = (): number => {
      const raw = Number(_props.step);
      return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    };
    /** 该小时是否落在 [min, max] 区间内（按小时的起点判断） */
    const hourAllowed = (h: number): boolean => {
      const lo = minMinutes();
      const hi = maxMinutes();
      const start = h * 60;
      if (lo !== null && start + 59 < lo) return false;
      if (hi !== null && start > hi) return false;
      return true;
    };
    /** 该分钟在当前小时下是否允许 */
    const minuteAllowed = (h: number, m: number): boolean => {
      const total = h * 60 + m;
      const lo = minMinutes();
      const hi = maxMinutes();
      if (lo !== null && total < lo) return false;
      if (hi !== null && total > hi) return false;
      const st = stepMinutes();
      if (st > 0 && m % st !== 0) return false;
      return true;
    };

    // ★ 2026-10-04：`format` 声明了却从未使用 ⇒ 显示格式写死成 `HH:mm:ss`。
    //   现按格式串里的 `HH` / `mm` / `ss` 逐段替换（默认 `'HH:mm:ss'` 与原先
    //   逐字符一致 ⇒ 零行为变化）；格式串里的其它字符（分隔符、空格等）原样保留。
    //   ⚠️ 只支持两位占位符（`HH` / `mm` / `ss`）—— 单字符形式（`H` / `m` / `s`）
    //   会与 `mm`/`ss` 产生歧义，故不支持。
    const formatTime = (h: number, m: number, s: number): string => {
      const fmt = (_props.format as string | undefined) || 'HH:mm:ss';
      const pad = (n: number): string => String(n).padStart(2, '0');
      return fmt.replace(/HH/g, pad(h)).replace(/mm/g, pad(m)).replace(/ss/g, pad(s));
    };

    const toggleDropdown = () => {
      if (_props.disabled) return;
      isOpen.set(!isOpen());
      if (isOpen()) {
        _props.onOpen?.();
      } else {
        _props.onClose?.();
      }
    };

    const handleSelectTime = () => {
      if (_props.isRange) {
        const result: [string, string] = [
          formatTime(rangeStartHour(), rangeStartMinute(), rangeStartSecond()),
          formatTime(rangeEndHour(), rangeEndMinute(), rangeEndSecond()),
        ];
        _props.onChange?.(result);
      } else {
        const result = formatTime(hours(), minutes(), seconds());
        _props.onChange?.(result);
      }
      isOpen.set(false);
    };

    const handleClear = (e: Event) => {
      e.stopPropagation();
      _props.onChange?.(null);
    };

    /** 把 `'HH:mm:ss'` 拆成 [h, m, s]；不合法时返回 null */
    const splitHHmmss = (v: unknown): [number, number, number] | null => {
      if (typeof v !== 'string') return null;
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v.trim());
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
    };
    /** 按 `format` 格式化一个时间字符串（不合法时原样返回） */
    const formatValue = (v: unknown): string => {
      const parts = splitHHmmss(v);
      return parts ? formatTime(parts[0], parts[1], parts[2]) : (v as string) || '';
    };

    const getDisplayValue = (): string => {
      if (_props.isRange && Array.isArray(_props.modelValue)) {
        // ★ 两端都按 format 格式化（此前原样透传 ⇒ format 只影响 emit、不影响显示）
        return `${formatValue(_props.modelValue[0])} - ${formatValue(_props.modelValue[1])}`;
      }
      // ★ 同上：单值也按 format 显示
      return formatValue(_props.modelValue);
    };

    return () => {
      const pickerClass = [
        'lyt-time-picker',
        isOpen() ? 'lyt-time-picker--open' : '',
        _props.disabled ? 'lyt-time-picker--disabled' : '',
        _props.class,
      ]
        .filter(Boolean)
        .join(' ');

      const displayValue = getDisplayValue();

      const hourOptions: VNode[] = [];
      for (let i = 0; i < 24; i++) {
        if (!hourAllowed(i)) continue; // ★ minTime / maxTime 过滤
        hourOptions.push(createVNode('option', { value: String(i) }, String(i).padStart(2, '0')));
      }

      const minuteSecondOptions: VNode[] = [];
      for (let i = 0; i < 60; i++) {
        // ★ minTime / maxTime / step 过滤（秒与分钟同刻度，故同样按分钟判定）
        if (!minuteAllowed(hours(), i)) continue;
        minuteSecondOptions.push(
          createVNode('option', { value: String(i) }, String(i).padStart(2, '0')),
        );
      }

      const triggerChildren: VNode[] = [
        createVNode(
          'span',
          {
            class: [
              'lyt-time-picker__input',
              !displayValue ? 'lyt-time-picker__input--placeholder' : '',
            ]
              .filter(Boolean)
              .join(' '),
          },
          displayValue || _props.placeholder,
        ),
      ];

      if (_props.clearable && displayValue) {
        triggerChildren.push(
          createVNode(
            'span',
            {
              class: 'lyt-time-picker__clear',
              onClick: handleClear,
            },
            '×',
          ),
        );
      }

      const dropdownContent: VNode[] = [];

      if (_props.isRange) {
        dropdownContent.push(
          createVNode('div', { class: 'lyt-time-picker__range' }, [
            createVNode('div', { class: 'lyt-time-picker__select-group' }, [
              createVNode(
                'select',
                {
                  class: 'lyt-time-picker__select',
                  value: String(rangeStartHour()),
                  onChange: (e: Event) =>
                    rangeStartHour.set(Number((e.target as HTMLSelectElement).value)),
                },
                hourOptions,
              ),
              createVNode('span', {}, ':'),
              createVNode(
                'select',
                {
                  class: 'lyt-time-picker__select',
                  value: String(rangeStartMinute()),
                  onChange: (e: Event) =>
                    rangeStartMinute.set(Number((e.target as HTMLSelectElement).value)),
                },
                minuteSecondOptions,
              ),
              createVNode('span', {}, ':'),
              createVNode(
                'select',
                {
                  class: 'lyt-time-picker__select',
                  value: String(rangeStartSecond()),
                  onChange: (e: Event) =>
                    rangeStartSecond.set(Number((e.target as HTMLSelectElement).value)),
                },
                minuteSecondOptions,
              ),
            ]),
            createVNode('span', { class: 'lyt-time-picker__separator' }, '-'),
            createVNode('div', { class: 'lyt-time-picker__select-group' }, [
              createVNode(
                'select',
                {
                  class: 'lyt-time-picker__select',
                  value: String(rangeEndHour()),
                  onChange: (e: Event) =>
                    rangeEndHour.set(Number((e.target as HTMLSelectElement).value)),
                },
                hourOptions,
              ),
              createVNode('span', {}, ':'),
              createVNode(
                'select',
                {
                  class: 'lyt-time-picker__select',
                  value: String(rangeEndMinute()),
                  onChange: (e: Event) =>
                    rangeEndMinute.set(Number((e.target as HTMLSelectElement).value)),
                },
                minuteSecondOptions,
              ),
              createVNode('span', {}, ':'),
              createVNode(
                'select',
                {
                  class: 'lyt-time-picker__select',
                  value: String(rangeEndSecond()),
                  onChange: (e: Event) =>
                    rangeEndSecond.set(Number((e.target as HTMLSelectElement).value)),
                },
                minuteSecondOptions,
              ),
            ]),
          ]),
        );
      } else {
        dropdownContent.push(
          createVNode('div', { class: 'lyt-time-picker__select-group' }, [
            createVNode(
              'select',
              {
                class: 'lyt-time-picker__select',
                value: String(hours()),
                onChange: (e: Event) => hours.set(Number((e.target as HTMLSelectElement).value)),
              },
              hourOptions,
            ),
            createVNode('span', {}, ':'),
            createVNode(
              'select',
              {
                class: 'lyt-time-picker__select',
                value: String(minutes()),
                onChange: (e: Event) => minutes.set(Number((e.target as HTMLSelectElement).value)),
              },
              minuteSecondOptions,
            ),
            createVNode('span', {}, ':'),
            createVNode(
              'select',
              {
                class: 'lyt-time-picker__select',
                value: String(seconds()),
                onChange: (e: Event) => seconds.set(Number((e.target as HTMLSelectElement).value)),
              },
              minuteSecondOptions,
            ),
          ]),
        );
      }

      const children: VNode[] = [
        createVNode(
          'div',
          { class: 'lyt-time-picker__trigger', onClick: toggleDropdown },
          triggerChildren,
        ),
      ];

      if (isOpen()) {
        children.push(
          createVNode('div', { class: 'lyt-time-picker__dropdown' }, [
            createVNode('div', { class: 'lyt-time-picker__panel' }, dropdownContent),
            createVNode('div', { class: 'lyt-time-picker__footer' }, [
              createVNode(
                'button',
                {
                  class: 'lyt-time-picker__confirm-btn',
                  onClick: handleSelectTime,
                },
                '确定',
              ),
            ]),
          ]),
        );
      }

      return createVNode('div', { class: pickerClass }, children);
    };
  },
});
