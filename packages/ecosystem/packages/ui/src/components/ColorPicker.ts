/**
 * @lytjs/ui - ColorPicker 组件
 *
 * 颜色选择器组件，取色器、预设色、hex/rgb转换功能，零第三方依赖
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { ColorPickerSetupProps } from './types';

const DEFAULT_PRESETS = [
  '#ff4500',
  '#ff6600',
  '#ff8c00',
  '#ff9900',
  '#ffcc00',
  '#ffff00',
  '#9acd32',
  '#32cd32',
  '#3cb371',
  '#00fa9a',
  '#00ced1',
  '#1e90ff',
  '#4169e1',
  '#8a2be2',
  '#da70d6',
  '#ff1493',
];

export const ColorPicker = defineComponent({
  name: 'LytColorPicker',

  props: {
    modelValue: { type: String, default: '#409eff' },
    showAlpha: { type: Boolean, default: false },
    showClear: { type: Boolean, default: true },
    showPreset: { type: Boolean, default: true },
    showHistory: { type: Boolean, default: true },
    presets: { type: Array, default: () => DEFAULT_PRESETS },
    history: { type: Array, default: () => [] },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as ColorPickerSetupProps;
    const isDropdownVisible = signal(false);
    const currentHue = signal(200);
    const currentSaturation = signal(80);
    const currentLightness = signal(50);
    const currentAlpha = signal(100);
    const localHistory = signal<string[]>([...(p.history || [])]);
    const colorInputValue = signal(p.modelValue);

    const hexToHsl = (hex: string) => {
      let r = 0,
        g = 0,
        b = 0;

      if (hex.length === 4) {
        r = parseInt(String(hex[1]) + String(hex[1]), 16);
        g = parseInt(String(hex[2]) + String(hex[2]), 16);
        b = parseInt(String(hex[3]) + String(hex[3]), 16);
      } else if (hex.length === 7) {
        r = parseInt(String(hex[1]) + String(hex[2]), 16);
        g = parseInt(String(hex[3]) + String(hex[4]), 16);
        b = parseInt(String(hex[5]) + String(hex[6]), 16);
      }

      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      let h = 0,
        s = 0,
        l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h *= 60;
      }

      return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const updateHslFromHex = (hex: string) => {
      try {
        const hsl = hexToHsl(hex);
        currentHue.set(hsl.h);
        currentSaturation.set(hsl.s);
        currentLightness.set(hsl.l);
      } catch {
        // 保持原样
      }
    };

    const hslToRgb = (h: number, s: number, l: number): number[] => {
      s /= 100;
      l /= 100;
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
      return (
        '#' +
        [r, g, b]
          .map((x: number) => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          })
          .join('')
      );
    };

    const getCurrentColor = (): string => {
      const rgb = hslToRgb(currentHue(), currentSaturation(), currentLightness());
      const r = rgb[0] ?? 0;
      const g = rgb[1] ?? 0;
      const b = rgb[2] ?? 0;
      if (p.showAlpha) {
        return `rgba(${r}, ${g}, ${b}, ${currentAlpha() / 100})`;
      }
      return rgbToHex(r, g, b);
    };

    const addToHistory = (color: string) => {
      const history = [...localHistory()];
      const index = history.indexOf(color);
      if (index > -1) history.splice(index, 1);
      history.unshift(color);
      if (history.length > 10) history.pop();
      localHistory.set(history);
    };

    const handleColorClick = (color: string) => {
      isDropdownVisible.set(false);
      colorInputValue.set(color);
      addToHistory(color);
    };

    const handlePresetClick = (color: string) => {
      updateHslFromHex(color);
      handleColorClick(color);
    };

    const clearColor = () => {
      isDropdownVisible.set(false);
      if (p.onClear) p.onClear();
    };

    const toggleDropdown = () => {
      if (!p.showClear || isDropdownVisible()) {
        isDropdownVisible.set(!isDropdownVisible());
      }
    };

    const handleColorInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      colorInputValue.set(target.value);
    };

    const handleColorChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const color = target.value;
      if (color) {
        handleColorClick(color);
      }
    };

    let isDragging = false;

    const handlePickerClick = (event: MouseEvent, type: 'saturation' | 'hue' | 'alpha') => {
      isDragging = true;
      handlePickerDrag(event, type);
    };

    const handlePickerMouseMove = (event: MouseEvent, type: 'saturation' | 'hue' | 'alpha') => {
      if (!isDragging) return;
      handlePickerDrag(event, type);
    };

    const handlePickerMouseUp = () => {
      isDragging = false;
    };

    const handlePickerDrag = (event: MouseEvent, type: 'saturation' | 'hue' | 'alpha') => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      let x = event.clientX - rect.left;
      x = Math.max(0, Math.min(rect.width, x));

      if (type === 'hue') {
        const newHue = Math.round((x / rect.width) * 360);
        currentHue.set(newHue);
        colorInputValue.set(getCurrentColor());
      } else if (type === 'alpha') {
        const newAlpha = Math.round((x / rect.width) * 100);
        currentAlpha.set(newAlpha);
        colorInputValue.set(getCurrentColor());
      } else if (type === 'saturation') {
        let y = event.clientY - rect.top;
        y = Math.max(0, Math.min(rect.height, y));
        const newSat = Math.round((x / rect.width) * 100);
        const newLight = Math.round(100 - (y / rect.height) * 100);
        currentSaturation.set(newSat);
        currentLightness.set(newLight);
        colorInputValue.set(getCurrentColor());
      }
    };

    const getColorPickerClass = (): string => {
      const classes = ['lyt-color-picker'];
      if (p.class) classes.push(p.class as string);
      return classes.join(' ');
    };

    return () => {
      const saturationPointer: VNode[] = [];
      saturationPointer.push(
        createVNode('div', {
          class: 'lyt-color-picker-pointer',
          style: {
            left: `${currentSaturation()}%`,
            top: `${100 - currentLightness()}%`,
          },
        }),
      );

      const hueChildren: VNode[] = [];
      hueChildren.push(
        createVNode('div', {
          class: 'lyt-color-picker-pointer',
          style: { left: `${(currentHue() / 360) * 100}%` },
        }),
      );

      const saturationPicker: VNode[] = [];
      saturationPicker.push(
        createVNode(
          'div',
          {
            class: 'lyt-color-picker-saturation',
            style: {
              background: `linear-gradient(to top, rgb(0, 0, 0), transparent),
                      linear-gradient(to right, rgb(255, 255, 255), hsl(${currentHue()}, 100%, 50%))`,
            },
            onMousedown: (e: MouseEvent) => handlePickerClick(e, 'saturation'),
            onMousemove: (e: MouseEvent) => handlePickerMouseMove(e, 'saturation'),
            onMouseup: handlePickerMouseUp,
            onMouseleave: handlePickerMouseUp,
          },
          saturationPointer,
        ),
      );

      const huePicker: VNode[] = [];
      huePicker.push(
        createVNode(
          'div',
          {
            class: 'lyt-color-picker-hue-slider',
            onMousedown: (e: MouseEvent) => handlePickerClick(e, 'hue'),
            onMousemove: (e: MouseEvent) => handlePickerMouseMove(e, 'hue'),
            onMouseup: handlePickerMouseUp,
            onMouseleave: handlePickerMouseUp,
          },
          hueChildren,
        ),
      );

      const alphaChildren: VNode[] = [];
      alphaChildren.push(
        createVNode('div', {
          class: 'lyt-color-picker-pointer',
          style: { left: `${currentAlpha()}%` },
        }),
      );

      const alphaPicker: VNode[] = [];
      alphaPicker.push(
        createVNode(
          'div',
          {
            class: 'lyt-color-picker-alpha-slider',
            style: {
              background: `linear-gradient(to right, transparent, ${hslToRgb(
                currentHue(),
                currentSaturation(),
                currentLightness(),
              )
                .map((v: number) => `rgb(${v})`)
                .join(',')})`,
            },
            onMousedown: (e: MouseEvent) => handlePickerClick(e, 'alpha'),
            onMousemove: (e: MouseEvent) => handlePickerMouseMove(e, 'alpha'),
            onMouseup: handlePickerMouseUp,
            onMouseleave: handlePickerMouseUp,
          },
          alphaChildren,
        ),
      );

      const presetColors: VNode[] = [];
      const presets = (p.presets || DEFAULT_PRESETS) as string[];
      presets.forEach((color: string, index: number) => {
        presetColors.push(
          createVNode('span', {
            class: 'lyt-color-picker-color',
            key: index,
            style: { backgroundColor: color },
            onClick: () => handlePresetClick(color),
          }),
        );
      });

      const historyColors: VNode[] = [];
      const history = localHistory() as string[];
      history.forEach((color: string, index: number) => {
        historyColors.push(
          createVNode('span', {
            class: 'lyt-color-picker-color',
            key: index,
            style: { backgroundColor: color },
            onClick: () => handleColorClick(color),
          }),
        );
      });

      const pickerDropdown: VNode[] = [];

      const panelChildren: VNode[] = [];
      panelChildren.push(
        createVNode(
          'div',
          {
            class: 'lyt-color-picker-saturation',
          },
          saturationPicker,
        ),
      );
      panelChildren.push(createVNode('div', { class: 'lyt-color-picker-hue' }, huePicker));
      if (p.showAlpha) {
        panelChildren.push(createVNode('div', { class: 'lyt-color-picker-alpha' }, alphaPicker));
      }

      pickerDropdown.push(createVNode('div', { class: 'lyt-color-picker-panel' }, panelChildren));

      const inputChildren: VNode[] = [];
      inputChildren.push(
        createVNode('input', {
          type: 'text',
          value: colorInputValue(),
          onInput: handleColorInput,
          onChange: handleColorChange,
          placeholder: '请输入颜色',
        }),
      );
      inputChildren.push(
        createVNode('span', {
          class: 'lyt-color-picker-preview',
          style: { backgroundColor: getCurrentColor() },
        }),
      );
      inputChildren.push(
        createVNode(
          'button',
          {
            class: 'lyt-color-picker-confirm',
            onClick: () => handleColorClick(getCurrentColor()),
          },
          [createVNode('span', {}, '确认')],
        ),
      );

      pickerDropdown.push(createVNode('div', { class: 'lyt-color-picker-input' }, inputChildren));

      if (p.showPreset) {
        const presetChildren: VNode[] = [];
        presetChildren.push(
          createVNode('div', { class: 'lyt-color-picker-title' }, [
            createVNode('span', {}, '预设颜色'),
          ]),
        );
        presetChildren.push(
          createVNode('div', { class: 'lyt-color-picker-palette' }, presetColors),
        );
        pickerDropdown.push(
          createVNode('div', { class: 'lyt-color-picker-presets' }, presetChildren),
        );
      }

      if (p.showHistory && history.length > 0) {
        const historyChildren: VNode[] = [];
        historyChildren.push(
          createVNode('div', { class: 'lyt-color-picker-title' }, [
            createVNode('span', {}, '历史颜色'),
          ]),
        );
        historyChildren.push(
          createVNode('div', { class: 'lyt-color-picker-palette' }, historyColors),
        );
        pickerDropdown.push(
          createVNode('div', { class: 'lyt-color-picker-history' }, historyChildren),
        );
      }

      const triggerChildren: VNode[] = [];
      triggerChildren.push(
        createVNode('div', {
          class: 'lyt-color-picker-display',
          style: { backgroundColor: p.modelValue || 'transparent' },
        }),
      );

      if (p.showClear && p.modelValue) {
        triggerChildren.push(
          createVNode(
            'span',
            {
              class: 'lyt-color-picker-clear',
              onClick: clearColor,
            },
            [createVNode('span', {}, '×')],
          ),
        );
      }

      triggerChildren.push(
        createVNode('span', { class: 'lyt-color-picker-arrow' }, [createVNode('span', {}, '▼')]),
      );

      const trigger: VNode[] = [];
      trigger.push(
        createVNode(
          'div',
          { class: 'lyt-color-picker-trigger', onClick: toggleDropdown },
          triggerChildren,
        ),
      );

      if (isDropdownVisible()) {
        trigger.push(createVNode('div', { class: 'lyt-color-picker-dropdown' }, pickerDropdown));
      }

      return createVNode('div', { class: getColorPickerClass() }, trigger);
    };
  },
});

export default ColorPicker;
export type { ColorPickerProps, ColorPickerSlots, ColorPickerSetupProps } from './types';
