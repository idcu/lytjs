/**
 * ColorPicker 颜色选择器
 * Props: value, format(hex/rgb/hsl), disabled, size(small/default/large), showAlpha, presetColors
 * Events: change, open, close
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const ColorPicker = defineComponent({
  name: 'LytColorPicker',

  props: {
    value: {
      type: String,
      default: '#1677ff',
    },
    format: {
      type: String,
      default: 'hex',
      validator: (v: string) => ['hex', 'rgb', 'hsl'].includes(v),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default', 'large'].includes(v),
    },
    showAlpha: {
      type: Boolean,
      default: false,
    },
    presetColors: {
      type: Array as () => string[],
      default: () => [
        '#1677ff', '#52c41a', '#faad14', '#ff4d4f',
        '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
        '#000000', '#ffffff', '#999999', '#333333',
      ],
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isOpen: false,
      hue: 0,
      saturation: 100,
      brightness: 100,
      alpha: 100,
      hexInput: props.value,
    });

    const hexToHsb = (hex: string) => {
      hex = hex.replace('#', '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      if (max !== min) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
      }
      const s = max === 0 ? 0 : (d / max) * 100;
      const v = max * 100;
      return { h: Math.round(h), s: Math.round(s), b: Math.round(v) };
    };

    const hsbToHex = (h: number, s: number, b: number) => {
      s /= 100;
      b /= 100;
      const k = (n: number) => (n + h / 60) % 6;
      const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
      const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
      return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
    };

    const formatColor = (hex: string) => {
      if (props.format === 'hex') return hex;
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      if (props.format === 'rgb') {
        if (props.showAlpha) {
          return `rgba(${r}, ${g}, ${b}, ${(state.alpha / 100).toFixed(2)})`;
        }
        return `rgb(${r}, ${g}, ${b})`;
      }
      return hex;
    };

    const currentColor = () => {
      return hsbToHex(state.hue, state.saturation, state.brightness);
    };

    const togglePanel = () => {
      if (props.disabled) return;
      state.isOpen = !state.isOpen;
      if (state.isOpen) emit('open');
      else emit('close');
    };

    const closePanel = () => {
      state.isOpen = false;
      emit('close');
    };

    const handlePresetClick = (color: string) => {
      const hsb = hexToHsb(color);
      state.hue = hsb.h;
      state.saturation = hsb.s;
      state.brightness = hsb.b;
      state.hexInput = color;
      emit('change', formatColor(color));
    };

    const handleHexInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      state.hexInput = target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(target.value)) {
        const hsb = hexToHsb(target.value);
        state.hue = hsb.h;
        state.saturation = hsb.s;
        state.brightness = hsb.b;
        emit('change', formatColor(target.value));
      }
    };

    const handleClickOutside = () => {
      if (state.isOpen) closePanel();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.value, (val: any) => {
      const hsb = hexToHsb(val);
      state.hue = hsb.h;
      state.saturation = hsb.s;
      state.brightness = hsb.b;
      state.hexInput = val;
    });

    onMounted(() => {
      const hsb = hexToHsb(props.value);
      state.hue = hsb.h;
      state.saturation = hsb.s;
      state.brightness = hsb.b;
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      state, currentColor, formatColor, togglePanel, closePanel,
      handlePresetClick, handleHexInput,
    };
  },

  template: `
    <div class="lyt-color-picker lyt-color-picker--{size} {disabled ? 'lyt-color-picker--disabled' : ''} {state.isOpen ? 'lyt-color-picker--open' : ''}">
      <div class="lyt-color-picker__trigger" @click="togglePanel">
        <span class="lyt-color-picker__preview" :style="{ backgroundColor: currentColor() }"></span>
        <span class="lyt-color-picker__value">{{ formatColor(currentColor()) }}</span>
      </div>
      <div class="lyt-color-picker__panel" v-if="state.isOpen" @click="$event.stopPropagation()">
        <div class="lyt-color-picker__saturation" :style="{ backgroundColor: 'hsl(' + state.hue + ', 100%, 50%)' }">
          <div class="lyt-color-picker__saturation-thumb" :style="{ left: state.saturation + '%', top: (100 - state.brightness) + '%' }"></div>
        </div>
        <div class="lyt-color-picker__controls">
          <div class="lyt-color-picker__hue">
            <div class="lyt-color-picker__hue-thumb" :style="{ left: (state.hue / 360 * 100) + '%' }"></div>
          </div>
          <div class="lyt-color-picker__alpha" v-if="showAlpha">
            <div class="lyt-color-picker__alpha-thumb" :style="{ left: state.alpha + '%' }"></div>
          </div>
        </div>
        <div class="lyt-color-picker__input-row">
          <input class="lyt-color-picker__hex-input" :value="state.hexInput" @input="handleHexInput" placeholder="#000000" />
        </div>
        <div class="lyt-color-picker__presets" v-if="presetColors.length > 0">
          <div
            v-for="color in presetColors"
            class="lyt-color-picker__preset"
            :style="{ backgroundColor: color }"
            @click="handlePresetClick(color)"
          ></div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-color-picker {
      display: inline-block;
      position: relative;
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-color-picker__trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      background-color: var(--lyt-color-bg);
      cursor: pointer;
      transition: border-color 0.3s;
      height: 36px;
      box-sizing: border-box;
    }
    .lyt-color-picker--open .lyt-color-picker__trigger { border-color: var(--lyt-color-primary); }
    .lyt-color-picker--disabled .lyt-color-picker__trigger { opacity: 0.6; cursor: not-allowed; }
    .lyt-color-picker--small .lyt-color-picker__trigger { height: 28px; padding: 3px 8px; }
    .lyt-color-picker--large .lyt-color-picker__trigger { height: 44px; padding: 6px 16px; }
    .lyt-color-picker__preview {
      width: 20px;
      height: 20px;
      border-radius: var(--lyt-radius-sm);
      border: 1px solid var(--lyt-color-border);
      flex-shrink: 0;
    }
    .lyt-color-picker__value {
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-muted);
      font-family: monospace;
    }
    .lyt-color-picker__panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 240px;
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: var(--lyt-shadow-md);
      z-index: 1000;
      padding: 12px;
      animation: lyt-dropdown-fade-in 0.15s ease-in-out;
    }
    @keyframes lyt-dropdown-fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .lyt-color-picker__saturation {
      width: 100%;
      height: 160px;
      border-radius: var(--lyt-radius-sm);
      position: relative;
      cursor: crosshair;
      background-image: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent);
    }
    .lyt-color-picker__saturation-thumb {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .lyt-color-picker__controls {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lyt-color-picker__hue {
      width: 100%;
      height: 10px;
      border-radius: 5px;
      background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
      position: relative;
      cursor: pointer;
    }
    .lyt-color-picker__hue-thumb {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .lyt-color-picker__alpha {
      width: 100%;
      height: 10px;
      border-radius: 5px;
      background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      position: relative;
      cursor: pointer;
    }
    .lyt-color-picker__alpha-thumb {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .lyt-color-picker__input-row {
      margin-top: 8px;
    }
    .lyt-color-picker__hex-input {
      width: 100%;
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      font-size: var(--lyt-font-size-sm);
      font-family: monospace;
      color: var(--lyt-color-muted);
      outline: none;
      box-sizing: border-box;
    }
    .lyt-color-picker__hex-input:focus { border-color: var(--lyt-color-primary); }
    .lyt-color-picker__presets {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .lyt-color-picker__preset {
      width: 20px;
      height: 20px;
      border-radius: var(--lyt-radius-sm);
      border: 1px solid var(--lyt-color-border);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .lyt-color-picker__preset:hover {
      transform: scale(1.2);
    }
  `,
});
