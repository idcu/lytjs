/**
 * @lytjs/ui - Slider 组件
 *
 * 滑块组件，用于在给定范围内选择一个值
 */

import type { SliderProps, SliderSlots, SliderSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, computed, watch } from '@lytjs/reactivity';

/**
 * Slider 组件
 */
export const Slider = defineComponent({
  name: 'LytSlider',

  props: {
    modelValue: { type: [Number, Array], default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    showInput: { type: Boolean, default: false },
    showInputControls: { type: Boolean, default: true },
    inputSize: { type: String, default: 'default' },
    showStops: { type: Boolean, default: false },
    showTooltip: { type: Boolean, default: true },
    formatTooltip: { type: Function, default: undefined },
    disabled: { type: Boolean, default: false },
    range: { type: Boolean, default: false },
    vertical: { type: Boolean, default: false },
    height: { type: String, default: '' },
    label: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    onChange: { type: Function, default: undefined },
    onInput: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { emit }) {
    const _props = props as SliderSetupProps;
    
    const state = reactive({
      firstValue: 0,
      secondValue: 0,
      dragging: false,
      showTooltip: false,
    });

    const initValues = () => {
      if (_props.range) {
        if (Array.isArray(_props.modelValue)) {
          state.firstValue = _props.modelValue[0] || _props.min;
          state.secondValue = _props.modelValue[1] || _props.max;
        } else {
          state.firstValue = _props.min;
          state.secondValue = _props.max;
        }
      } else {
        if (typeof _props.modelValue === 'number') {
          state.firstValue = _props.modelValue;
        } else {
          state.firstValue = _props.min;
        }
      }
    };

    initValues();

    watch(() => _props.modelValue, () => {
      initValues();
    });

    const formatValue = (value: number) => {
      if (_props.formatTooltip) {
        return _props.formatTooltip(value);
      }
      return String(value);
    };

    const getValueByPercent = (percent: number) => {
      const range = _props.max - _props.min;
      let value = (percent / 100) * range + _props.min;
      
      if (_props.step > 0) {
        value = Math.round(value / _props.step) * _props.step;
      }
      
      value = Math.max(_props.min, Math.min(_props.max, value));
      return value;
    };

    const getPercentByValue = (value: number) => {
      const range = _props.max - _props.min;
      return ((value - _props.min) / range) * 100;
    };

    const firstPercent = computed(() => getPercentByValue(state.firstValue));
    const secondPercent = computed(() => getPercentByValue(state.secondValue));

    const handleMouseDown = (event: MouseEvent) => {
      if (_props.disabled) return;
      state.dragging = true;
      state.showTooltip = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!state.dragging) return;
      
      const slider = document.querySelector('.lyt-slider');
      if (!slider) return;
      
      const rect = slider.getBoundingClientRect();
      let percent;
      
      if (_props.vertical) {
        percent = ((rect.bottom - event.clientY) / rect.height) * 100;
      } else {
        percent = ((event.clientX - rect.left) / rect.width) * 100;
      }
      
      percent = Math.max(0, Math.min(100, percent));
      const newValue = getValueByPercent(percent);
      
      if (_props.range) {
        const diff1 = Math.abs(newValue - state.firstValue);
        const diff2 = Math.abs(newValue - state.secondValue);
        
        if (diff1 < diff2) {
          state.firstValue = Math.min(newValue, state.secondValue);
        } else {
          state.secondValue = Math.max(newValue, state.firstValue);
        }
        
        const newModelValue = [state.firstValue, state.secondValue];
        emit('update:modelValue', newModelValue);
        emit('input', newModelValue);
        _props.onInput?.(newModelValue);
      } else {
        state.firstValue = newValue;
        emit('update:modelValue', state.firstValue);
        emit('input', state.firstValue);
        _props.onInput?.(state.firstValue);
      }
    };

    const handleMouseUp = () => {
      if (!state.dragging) return;
      state.dragging = false;
      state.showTooltip = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (_props.range) {
        const newModelValue = [state.firstValue, state.secondValue];
        emit('change', newModelValue);
        _props.onChange?.(newModelValue);
      } else {
        emit('change', state.firstValue);
        _props.onChange?.(state.firstValue);
      }
    };

    const getSliderClass = () => {
      const classes = ['lyt-slider'];
      if (_props.vertical) classes.push('lyt-slider--vertical');
      if (_props.disabled) classes.push('lyt-slider--disabled');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getSliderStyle = () => {
      const style: Record<string, string> = {};
      if (_props.vertical && _props.height) {
        style.height = _props.height;
      }
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    const getStops = () => {
      if (!_props.showStops) return [];
      
      const stops: VNode[] = [];
      const range = _props.max - _props.min;
      const stepCount = Math.floor(range / _props.step);
      
      for (let i = 0; i <= stepCount; i++) {
        const percent = (i / stepCount) * 100;
        stops.push(createVNode('div', {
          class: 'lyt-slider__stop',
          style: _props.vertical 
            ? { bottom: `${percent}%` }
            : { left: `${percent}%` },
        }));
      }
      
      return stops;
    };

    return () => {
      const children: VNode[] = [];
      
      children.push(createVNode('div', {
        class: 'lyt-slider__runway',
        onMousedown: handleMouseDown,
      }, [
        createVNode('div', {
          class: 'lyt-slider__bar',
          style: _props.range
            ? (_props.vertical
                ? { bottom: `${firstPercent.value}%`, height: `${secondPercent.value - firstPercent.value}%` }
                : { left: `${firstPercent.value}%`, width: `${secondPercent.value - firstPercent.value}%` })
            : (_props.vertical
                ? { bottom: '0%', height: `${firstPercent.value}%` }
                : { left: '0%', width: `${firstPercent.value}%` }),
        }),
        ...getStops(),
        _props.range
          ? [
              createVNode('div', {
                class: 'lyt-slider__button',
                style: _props.vertical
                  ? { bottom: `${firstPercent.value}%` }
                  : { left: `${firstPercent.value}%` },
              }, [
                _props.showTooltip
                  ? createVNode('div', { class: 'lyt-slider__tooltip' }, [formatValue(state.firstValue)])
                  : null,
              ]),
              createVNode('div', {
                class: 'lyt-slider__button',
                style: _props.vertical
                  ? { bottom: `${secondPercent.value}%` }
                  : { left: `${secondPercent.value}%` },
              }, [
                _props.showTooltip
                  ? createVNode('div', { class: 'lyt-slider__tooltip' }, [formatValue(state.secondValue)])
                  : null,
              ]),
            ]
          : createVNode('div', {
              class: 'lyt-slider__button',
              style: _props.vertical
                ? { bottom: `${firstPercent.value}%` }
                : { left: `${firstPercent.value}%` },
            }, [
              _props.showTooltip
                ? createVNode('div', { class: 'lyt-slider__tooltip' }, [formatValue(state.firstValue)])
                : null,
            ]),
      ]));

      if (_props.showInput && !_props.range) {
        children.push(createVNode('div', {
          class: 'lyt-slider__input',
        }, [
          createVNode('input', {
            type: 'number',
            class: `lyt-input lyt-input--${_props.inputSize}`,
            value: state.firstValue,
            min: _props.min,
            max: _props.max,
            step: _props.step,
            disabled: _props.disabled,
            onInput: (e: Event) => {
              const input = e.target as HTMLInputElement;
              const value = parseFloat(input.value);
              if (!isNaN(value)) {
                state.firstValue = Math.max(_props.min, Math.min(_props.max, value));
                emit('update:modelValue', state.firstValue);
              }
            },
          }),
        ]));
      }

      return createVNode('div', {
        class: getSliderClass(),
        style: getSliderStyle(),
      }, children);
    };
  },
});

export type { SliderProps, SliderSlots };
