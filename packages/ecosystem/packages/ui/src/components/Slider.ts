/**
 * @lytjs/ui - Slider 组件
 *
 * 滑块组件，用于在给定范围内选择一个值
 */

import type { SliderProps, SliderSlots, SliderSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, computed, watch } from '@lytjs/reactivity';
import { getSliderA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export const Slider = defineComponent({
  name: 'LytSlider',

  props: {
    modelValue: { type: Number, default: 0 },
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
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaRequired: { type: Boolean, default: false },
    ariaInvalid: { type: Boolean, default: false },
    tabIndex: { type: Number, default: undefined },
    onChange: { type: Function, default: undefined },
    onInput: { type: Function, default: undefined },
    onKeydown: { type: Function, default: undefined },
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

    watch(
      () => _props.modelValue,
      () => {
        initValues();
      },
    );

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

    const clampValue = (value: number) => {
      return Math.max(_props.min, Math.min(_props.max, value));
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (_props.disabled) return;

      let newValue: number;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          newValue = clampValue(state.firstValue - _props.step);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          newValue = clampValue(state.firstValue + _props.step);
          break;
        case 'Home':
          event.preventDefault();
          newValue = _props.min;
          break;
        case 'End':
          event.preventDefault();
          newValue = _props.max;
          break;
        default:
          _props.onKeydown?.(event);
          return;
      }

      if (newValue !== state.firstValue) {
        state.firstValue = newValue;
        state.showTooltip = true;

        if (!_props.range) {
          emit('update:modelValue', state.firstValue);
          emit('input', state.firstValue);
          // ★ 2026-10-04：`emit` 本身就会去 props 里找 `onInput` 并调用（见 component/src/emit.ts）⇒ 紧随其后的直接调用是**重复触发**，已删。
        }

        setTimeout(() => {
          state.showTooltip = false;
        }, 1500);
      }

      _props.onKeydown?.(event);
    };

    const handleMouseDown = (_event: MouseEvent) => {
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

        const newModelValue: number | number[] = _props.range
          ? [state.firstValue, state.secondValue]
          : state.firstValue;
        emit('update:modelValue', newModelValue);
        emit('input', newModelValue);
        // ★ 2026-10-13：删掉紧随其后的 `_props.onInput?.(newModelValue)` ——
        //   `emit` 本身就会去 props 里找 `onInput` 并调用（见 component/src/emit.ts）
        //   ⇒ 直接调用是**重复触发**（实测回调被调用 2 次）。
        //   同一修法此前只加在 `handleKeydown` 一处，漏了本处与 `handleMouseUp`
        //   ⇒ keel 坑 `parallel-impl-only-one-fixed`（平行实现只修一处）。
      } else {
        state.firstValue = newValue;
        emit('update:modelValue', state.firstValue);
        emit('input', state.firstValue);
      }
    };

    const handleMouseUp = () => {
      if (!state.dragging) return;
      state.dragging = false;
      state.showTooltip = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // ★ 2026-10-13：同 `handleMouseMove` —— `emit('change')` 已会调用 props.onChange，
      //   紧随其后的直接调用是重复触发（实测 change 回调被调用 2 次）。
      if (_props.range) {
        emit('change', [state.firstValue, state.secondValue]);
      } else {
        emit('change', state.firstValue);
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
        stops.push(
          createVNode(
            'div',
            {
              class: 'lyt-slider__stop',
              style: _props.vertical ? { bottom: `${percent}%` } : { left: `${percent}%` },
            },
            [],
          ),
        );
      }

      return stops;
    };

    return () => {
      const firstPct = firstPercent.value;
      const secondPct = secondPercent.value;
      const children: VNode[] = [];

      const runwayChildren: VNode[] = [];

      runwayChildren.push(
        createVNode(
          'div',
          {
            class: 'lyt-slider__bar',
            style: _props.range
              ? _props.vertical
                ? { bottom: `${firstPct}%`, height: `${secondPct - firstPct}%` }
                : { left: `${firstPct}%`, width: `${secondPct - firstPct}%` }
              : _props.vertical
                ? { bottom: '0%', height: `${firstPct}%` }
                : { left: '0%', width: `${firstPct}%` },
          },
          [],
        ),
      );

      const stops = getStops();
      runwayChildren.push(...stops);

      if (_props.range) {
        const tooltip1 = _props.showTooltip
          ? createVNode('div', { class: 'lyt-slider__tooltip' }, [
              createVNode('span', {}, formatValue(state.firstValue)),
            ])
          : null;
        const tooltip2 = _props.showTooltip
          ? createVNode('div', { class: 'lyt-slider__tooltip' }, [
              createVNode('span', {}, formatValue(state.secondValue)),
            ])
          : null;

        // ★ 2026-10-13：**把手必须恒渲染** —— 此前 `showTooltip=false` 时整个
        //   `.lyt-slider__button` 都不被推入 ⇒ 滑块失去把手、失去焦点与键盘入口
        //   （`showTooltip` 只该控制提示气泡，不该控制把手本体）。实测断言变红。
        runwayChildren.push(
          createVNode(
            'div',
            mergeA11yProps(
              getSliderA11yProps({
                ariaLabel: _props.ariaLabel || 'Left value',
                disabled: _props.disabled,
                value: state.firstValue,
                min: _props.min,
                max: _props.max,
              }),
              {
                class: 'lyt-slider__button',
                style: _props.vertical ? { bottom: `${firstPct}%` } : { left: `${firstPct}%` },
                onKeydown: handleKeydown,
              },
            ),
            tooltip1 ? [tooltip1] : [],
          ),
        );

        // ★ 同上：右把手恒渲染，仅气泡内容受 `showTooltip` 控制。
        runwayChildren.push(
          createVNode(
            'div',
            mergeA11yProps(
              getSliderA11yProps({
                ariaLabel: 'Right value',
                disabled: _props.disabled,
                value: state.secondValue,
                min: _props.min,
                max: _props.max,
              }),
              {
                class: 'lyt-slider__button',
                style: _props.vertical ? { bottom: `${secondPct}%` } : { left: `${secondPct}%` },
                onKeydown: handleKeydown,
              },
            ),
            tooltip2 ? [tooltip2] : [],
          ),
        );
      } else {
        const tooltip = _props.showTooltip
          ? createVNode('div', { class: 'lyt-slider__tooltip' }, [
              createVNode('span', {}, formatValue(state.firstValue)),
            ])
          : null;

        // ★ 同上：单值模式把手恒渲染，仅气泡内容受 `showTooltip` 控制。
        runwayChildren.push(
          createVNode(
            'div',
            mergeA11yProps(
              getSliderA11yProps({
                ariaLabel: _props.ariaLabel || 'Value',
                ariaDescribedBy: _props.ariaDescribedBy,
                ariaRequired: _props.ariaRequired,
                ariaInvalid: _props.ariaInvalid,
                disabled: _props.disabled,
                tabIndex: _props.tabIndex,
                value: state.firstValue,
                min: _props.min,
                max: _props.max,
              }),
              {
                class: 'lyt-slider__button',
                style: _props.vertical ? { bottom: `${firstPct}%` } : { left: `${firstPct}%` },
                onKeydown: handleKeydown,
              },
            ),
            tooltip ? [tooltip] : [],
          ),
        );
      }

      children.push(
        createVNode(
          'div',
          {
            class: 'lyt-slider__runway',
            onMousedown: handleMouseDown,
          },
          runwayChildren,
        ),
      );

      // ★ 2026-10-04：`showInputControls` 声明了却从未使用 ⇒ 无法关闭数字输入框。
      //   语义沿用 Element-Plus 的 `show-input-controls`（是否显示数字输入框）。
      if (_props.showInput && _props.showInputControls && !_props.range) {
        children.push(
          createVNode(
            'div',
            {
              class: 'lyt-slider__input',
            },
            [
              createVNode('input', {
                type: 'number',
                class: `lyt-input lyt-input--${_props.inputSize}`,
                // ★ 2026-10-04：`label` 声明了却从未使用 ⇒ 数字输入框没有可访问名称。
                'aria-label': (_props.label as string | undefined) || undefined,
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
            ],
          ),
        );
      }

      // ★ 2026-10-13：**移除根元素上的 `onKeydown: handleKeydown`** —— 把手（`.lyt-slider__button`）
      //   也挂了同一个 `handleKeydown`，且它在根元素内部 ⇒ 在把手上的按键会先由把手处理、
      //   再冒泡到根元素**再处理一次**，导致一次 ArrowRight 前进 **2 个 step**（实测 [15,20]）。
      //   根元素本身没有 `tabindex`（不可聚焦），故移除它不损失任何键盘入口；
      //   数字输入框里的方向键也不再被误劫持去改滑块值。
      return createVNode(
        'div',
        {
          class: getSliderClass(),
          style: getSliderStyle(),
          id: _props.id,
        },
        children,
      );
    };
  },
});

export type { SliderProps, SliderSlots };
