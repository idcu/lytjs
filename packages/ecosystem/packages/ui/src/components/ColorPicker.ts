/**
 * @lytjs/ui - ColorPicker 组件
 *
 * 颜色选择器组件，取色器、预设色、hex/rgb转换功能，零第三方依赖
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

// 预设颜色
const DEFAULT_PRESETS = [
  '#ff4500', '#ff6600', '#ff8c00', '#ff9900',
  '#ffcc00', '#ffff00', '#9acd32', '#32cd32',
  '#3cb371', '#00fa9a', '#00ced1', '#1e90ff',
  '#4169e1', '#8a2be2', '#da70d6', '#ff1493'
];

/**
 * ColorPicker 组件
 */
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

  setup(props: any, { slots, emit }: any) {
    const isDropdownVisible = signal(false);
    const currentHue = signal(200);
    const currentSaturation = signal(80);
    const currentLightness = signal(50);
    const currentAlpha = signal(100);
    const localHistory = signal<string[]>([...(props.history || [])]);
    const colorInputValue = signal(props.modelValue);

    // 初始化颜色值
    const parseColor = () => {
      // 解析输入的颜色
      updateHslFromHex(props.modelValue);
    };

    // 从 HEX 转换为 HSL
    const hexToHsl = (hex: string) => {
      let r = 0, g = 0, b = 0;
      
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
      }
      
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
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
      } catch (e) {
        // 保持原样
      }
    };

    // 从 HSL 转换为 RGB
    const hslToRgb = (h: number, s: number, l: number) => {
      s /= 100; l /= 100;
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [
        Math.round(f(0) * 255),
        Math.round(f(8) * 255),
        Math.round(f(4) * 255)
      ];
    };

    // RGB 转 HEX
    const rgbToHex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };

    // 计算当前颜色
    const getCurrentColor = () => {
      const [r, g, b] = hslToRgb(currentHue.value, currentSaturation.value, currentLightness.value);
      if (props.showAlpha) {
        return `rgba(${r}, ${g}, ${b}, ${currentAlpha.value / 100})`;
      }
      return rgbToHex(r, g, b);
    };

    // 添加历史记录
    const addToHistory = (color: string) => {
      const history = [...localHistory.value];
      const index = history.indexOf(color);
      if (index > -1) history.splice(index, 1);
      history.unshift(color);
      if (history.length > 10) history.pop();
      localHistory.set(history);
    };

    // 点击颜色块
    const handleColorClick = (color: string) => {
      emit('update:modelValue', color);
      if (props.onChange) props.onChange(color);
      addToHistory(color);
      isDropdownVisible.set(false);
      colorInputValue.set(color);
    };

    // 点击预设颜色
    const handlePresetClick = (color: string) => {
      updateHslFromHex(color);
      handleColorClick(color);
    };

    // 清除颜色
    const clearColor = () => {
      emit('update:modelValue', '');
      if (props.onClear) props.onClear();
      isDropdownVisible.set(false);
    };

    // 切换下拉
    const toggleDropdown = () => {
      if (!props.showClear || isDropdownVisible.value) {
        isDropdownVisible.set(!isDropdownVisible.value);
      }
    };

    // 处理颜色输入
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

    // 调色板选择器
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
        const color = getCurrentColor();
        colorInputValue.set(color);
      } else if (type === 'alpha') {
        const newAlpha = Math.round((x / rect.width) * 100);
        currentAlpha.set(newAlpha);
        const color = getCurrentColor();
        colorInputValue.set(color);
      } else if (type === 'saturation') {
        let y = event.clientY - rect.top;
        y = Math.max(0, Math.min(rect.height, y));
        const newSat = Math.round((x / rect.width) * 100);
        const newLight = Math.round(100 - (y / rect.height) * 100);
        currentSaturation.set(newSat);
        currentLightness.set(newLight);
        const color = getCurrentColor();
        colorInputValue.set(color);
      }
    };

    // 格式化颜色显示
    const formatColor = (color: string) => {
      if (!color) return;
      return color.toUpperCase();
    };

    const getColorPickerClass = () => {
      const classes = ['lyt-color-picker'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const pickerDropdown = isDropdownVisible.value ? createVNode('div', { class: 'lyt-color-picker-dropdown' }, [
        // 颜色选择区
        createVNode('div', { class: 'lyt-color-picker-panel' }, [
          createVNode('div', {
            class: 'lyt-color-picker-saturation',
            style: {
              background: `linear-gradient(to top, rgb(0, 0, 0), transparent),
                          linear-gradient(to right, rgb(255, 255, 255), hsl(${currentHue.value}, 100%, 50%))`
            },
            onMousedown: (e: MouseEvent) => handlePickerClick(e, 'saturation'),
            onMousemove: (e: MouseEvent) => handlePickerMouseMove(e, 'saturation'),
            onMouseup: handlePickerMouseUp,
            onMouseleave: handlePickerMouseUp
          }, [
            createVNode('div', {
              class: 'lyt-color-picker-pointer',
              style: {
                left: `${currentSaturation.value}%`,
                top: `${100 - currentLightness.value}%`
              }
            })
          ]),
          // 色相滑块
          createVNode('div', { class: 'lyt-color-picker-hue' }, [
            createVNode('div', {
              class: 'lyt-color-picker-hue-slider',
              onMousedown: (e: MouseEvent) => handlePickerClick(e, 'hue'),
              onMousemove: (e: MouseEvent) => handlePickerMouseMove(e, 'hue'),
              onMouseup: handlePickerMouseUp,
              onMouseleave: handlePickerMouseUp
            }, [
              createVNode('div', {
                class: 'lyt-color-picker-pointer',
                style: { left: `${(currentHue.value / 360) * 100}%` }
              })
            ])
          ]),
          // 透明度滑块
          props.showAlpha ? createVNode('div', { class: 'lyt-color-picker-alpha' }, [
            createVNode('div', {
              class: 'lyt-color-picker-alpha-slider',
              style: {
                background: `linear-gradient(to right, transparent, ${hslToRgb(currentHue.value, currentSaturation.value, currentLightness.value).map(v => `rgb(${v})`)})`
              },
              onMousedown: (e: MouseEvent) => handlePickerClick(e, 'alpha'),
              onMousemove: (e: MouseEvent) => handlePickerMouseMove(e, 'alpha'),
              onMouseup: handlePickerMouseUp,
              onMouseleave: handlePickerMouseUp
            }, [
              createVNode('div', {
                class: 'lyt-color-picker-pointer',
                style: { left: `${currentAlpha.value}%` }
              })
            ])
          ]) : null,
        ]),
        // 颜色输入区
        createVNode('div', { class: 'lyt-color-picker-input' }, [
          createVNode('input', {
            type: 'text',
            value: colorInputValue.value,
            onInput: handleColorInput,
            onChange: handleColorChange,
            placeholder: '请输入颜色'
          }),
          createVNode('span', {
            class: 'lyt-color-picker-preview',
            style: { backgroundColor: getCurrentColor() }
          }),
          createVNode('button', {
            class: 'lyt-color-picker-confirm',
            onClick: () => handleColorClick(getCurrentColor())
          }, '确认')
        ]),
        // 预设颜色
        props.showPreset ? createVNode('div', { class: 'lyt-color-picker-presets' }, [
          createVNode('div', { class: 'lyt-color-picker-title' }, '预设颜色'),
          createVNode('div', { class: 'lyt-color-picker-palette' }, [
            ...(props.presets || DEFAULT_PRESETS).map((color, index) =>
              createVNode('span', {
                class: 'lyt-color-picker-color',
                key: index,
                style: { backgroundColor: color },
                onClick: () => handlePresetClick(color)
              })
            )
          ])
        ]) : null,
        // 历史颜色
        props.showHistory && localHistory.value.length > 0 ? createVNode('div', { class: 'lyt-color-picker-history' }, [
          createVNode('div', { class: 'lyt-color-picker-title' }, '历史颜色'),
          createVNode('div', { class: 'lyt-color-picker-palette' }, [
            ...localHistory.value.map((color, index) =>
              createVNode('span', {
                class: 'lyt-color-picker-color',
                key: index,
                style: { backgroundColor: color },
                onClick: () => handleColorClick(color)
              })
            )
          ])
        ]) : null
      ]) : null;

      return createVNode('div', { class: getColorPickerClass() }, [
        createVNode('div', { class: 'lyt-color-picker-trigger', onClick: toggleDropdown }, [
          createVNode('div', {
            class: 'lyt-color-picker-display',
            style: { backgroundColor: props.modelValue || 'transparent' }
          }),
          props.showClear && props.modelValue ? createVNode('span', {
            class: 'lyt-color-picker-clear',
            onClick: clearColor
          }, '×') : null,
          createVNode('span', { class: 'lyt-color-picker-arrow' }, '▼')
        ]),
        pickerDropdown
      ]);
    };
  },
});

export default ColorPicker;
