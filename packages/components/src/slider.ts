/**
 * Slider 滑动条
 * Props: modelValue, min, max, step, showInput, showStops, showTooltip, disabled, range, marks, vertical, height
 * Events: change, input, update:modelValue
 */

import { defineComponent } from '@lytjs/component'
import { reactive, watch, computed } from '@lytjs/reactivity'

export const Slider = defineComponent({
  name: 'LytSlider',

  props: {
    modelValue: {
      type: [Number, Array] as any,
      default: 0,
    },
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 100,
    },
    step: {
      type: Number,
      default: 1,
    },
    showInput: {
      type: Boolean,
      default: false,
    },
    showStops: {
      type: Boolean,
      default: false,
    },
    showTooltip: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    range: {
      type: Boolean,
      default: false,
    },
    vertical: {
      type: Boolean,
      default: false,
    },
    height: {
      type: String,
      default: '100px',
    },
    marks: {
      type: Object,
      default: () => ({}),
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      firstValue: props.range ? (Array.isArray(props.modelValue) ? props.modelValue[0] : 0) : props.modelValue,
      secondValue: props.range ? (Array.isArray(props.modelValue) ? props.modelValue[1] : 0) : 0,
      dragging: false,
      showTooltip: false,
    })

    const getValue = () => {
      return props.range ? [state.firstValue, state.secondValue] : state.firstValue
    }

    const getPosition = (value: number) => {
      return ((value - props.min) / (props.max - props.min)) * 100
    }

    const getValueFromPosition = (position: number) => {
      const value = props.min + (position / 100) * (props.max - props.min)
      if (props.step > 0) {
        const steps = Math.round((value - props.min) / props.step)
        return props.min + steps * props.step
      }
      return value
    }

    const formatValue = (value: number) => {
      return value
    }

    const handleDragStart = (isFirst = true) => {
      if (props.disabled) return
      state.dragging = true
      state.showTooltip = true
    }

    const handleDrag = (e: PointerEvent, isFirst = true) => {
      if (!state.dragging || props.disabled) return

      const slider = (e.currentTarget as HTMLElement).closest('.lyt-slider') as HTMLElement
      if (!slider) return

      const rect = slider.getBoundingClientRect()
      let position = 0

      if (props.vertical) {
        position = ((rect.bottom - e.clientY) / rect.height) * 100
      } else {
        position = ((e.clientX - rect.left) / rect.width) * 100
      }

      position = Math.max(0, Math.min(100, position))

      let newValue = getValueFromPosition(position)
      newValue = Math.max(props.min, Math.min(props.max, newValue))

      if (props.range) {
        if (isFirst) {
          state.firstValue = Math.min(newValue, state.secondValue)
        } else {
          state.secondValue = Math.max(newValue, state.firstValue)
        }
      } else {
        state.firstValue = newValue
      }

      emit('input', getValue())
      emit('update:modelValue', getValue())
    }

    const handleDragEnd = () => {
      state.dragging = false
      state.showTooltip = false
      emit('change', getValue())
    }

    const handleMouseEnter = () => {
      if (props.showTooltip) {
        state.showTooltip = true
      }
    }

    const handleMouseLeave = () => {
      if (!state.dragging) {
        state.showTooltip = false
      }
    }

    const handleInputChange = (e: Event, isFirst = true) => {
      const target = e.target as HTMLInputElement
      let value = parseFloat(target.value)

      if (isNaN(value)) return

      value = Math.max(props.min, Math.min(props.max, value))

      if (props.step > 0) {
        const steps = Math.round((value - props.min) / props.step)
        value = props.min + steps * props.step
      }

      if (props.range) {
        if (isFirst) {
          state.firstValue = Math.min(value, state.secondValue)
        } else {
          state.secondValue = Math.max(value, state.firstValue)
        }
      } else {
        state.firstValue = value
      }

      emit('change', getValue())
      emit('update:modelValue', getValue())
    }

    const getStops = () => {
      if (!props.showStops || props.step <= 0) return []
      const stops = []
      for (let i = props.min; i <= props.max; i += props.step) {
        stops.push(i)
      }
      return stops
    }

    const getMarkKeys = () => {
      return Object.keys(props.marks).map(Number).sort((a, b) => a - b)
    }

    const isMarkActive = (markValue: number) => {
      if (props.range) {
        return markValue >= state.firstValue && markValue <= state.secondValue
      }
      return markValue <= state.firstValue
    }

    const isStopActive = (stopValue: number) => {
      if (props.range) {
        return stopValue >= state.firstValue && stopValue <= state.secondValue
      }
      return stopValue <= state.firstValue
    }

    watch(() => props.modelValue, (val) => {
      if (props.range) {
        if (Array.isArray(val)) {
          state.firstValue = val[0]
          state.secondValue = val[1]
        }
      } else {
        state.firstValue = val as number
      }
    })

    return {
      props, state, getValue, getPosition, formatValue,
      handleDragStart, handleDrag, handleDragEnd,
      handleMouseEnter, handleMouseLeave, handleInputChange,
      getStops, getMarkKeys, isMarkActive, isStopActive,
      slots,
    }
  },

  template: `
    <div 
      class="lyt-slider {vertical ? 'lyt-slider--vertical' : ''} {disabled ? 'lyt-slider--disabled' : ''}"
      :style="{ height: vertical ? height : 'auto' }"
      @pointerdown="handleDragStart(true)"
      @pointermove="handleDrag($event, true)"
      @pointerup="handleDragEnd"
      @pointerleave="handleDragEnd"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div class="lyt-slider__runway">
        <div 
          class="lyt-slider__bar"
          :style="vertical 
            ? { bottom: props.range ? getPosition(state.firstValue) + '%' : '0%', height: props.range ? (getPosition(state.secondValue) - getPosition(state.firstValue)) + '%' : getPosition(state.firstValue) + '%' } 
            : { left: props.range ? getPosition(state.firstValue) + '%' : '0%', width: props.range ? (getPosition(state.secondValue) - getPosition(state.firstValue)) + '%' : getPosition(state.firstValue) + '%' }"
        ></div>
        <div
          v-if="showStops"
          v-for="stop in getStops()"
          :key="stop"
          class="lyt-slider__stop {isStopActive(stop) ? 'lyt-slider__stop--active' : ''}"
          :style="vertical ? { bottom: getPosition(stop) + '%' } : { left: getPosition(stop) + '%' }"
        ></div>
        <div 
          v-if="props.range"
          class="lyt-slider__button"
          :style="vertical ? { bottom: getPosition(state.firstValue) + '%' } : { left: getPosition(state.firstValue) + '%' }"
        >
          <div 
            v-if="showTooltip && state.showTooltip"
            class="lyt-slider__tooltip"
          >
            {{ formatValue(state.firstValue) }}
          </div>
        </div>
        <div 
          class="lyt-slider__button"
          :style="vertical ? { bottom: getPosition(props.range ? state.secondValue : state.firstValue) + '%' } : { left: getPosition(props.range ? state.secondValue : state.firstValue) + '%' }"
        >
          <div 
            v-if="showTooltip && state.showTooltip"
            class="lyt-slider__tooltip"
          >
            {{ formatValue(props.range ? state.secondValue : state.firstValue) }}
          </div>
        </div>
        <div v-if="getMarkKeys().length > 0" class="lyt-slider__marks">
          <div
            v-for="mark in getMarkKeys()"
            :key="mark"
            class="lyt-slider__mark {isMarkActive(mark) ? 'lyt-slider__mark--active' : ''}"
            :style="vertical ? { bottom: getPosition(mark) + '%' } : { left: getPosition(mark) + '%' }"
          >
            {{ marks[mark] }}
          </div>
        </div>
      </div>
      <div v-if="showInput" class="lyt-slider__input-wrapper">
        <input
          v-if="props.range"
          type="number"
          class="lyt-slider__input"
          :value="state.firstValue"
          :min="props.min"
          :max="props.max"
          :step="props.step"
          :disabled="disabled"
          @change="handleInputChange($event, true)"
        />
        <span v-if="props.range" class="lyt-slider__input-separator">-</span>
        <input
          type="number"
          class="lyt-slider__input"
          :value="props.range ? state.secondValue : state.firstValue"
          :min="props.min"
          :max="props.max"
          :step="props.step"
          :disabled="disabled"
          @change="handleInputChange($event, false)"
        />
      </div>
    </div>
  `,

  styles: `
    .lyt-slider {
      display: inline-flex;
      align-items: center;
      gap: 15px;
      width: 100%;
      box-sizing: border-box;
    }
    .lyt-slider--vertical {
      flex-direction: column;
      height: auto;
    }
    .lyt-slider--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-slider__runway {
      position: relative;
      flex: 1;
      width: 100%;
      height: 6px;
      background-color: var(--lyt-color-border);
      border-radius: 3px;
      cursor: pointer;
      user-select: none;
    }
    .lyt-slider--vertical .lyt-slider__runway {
      width: 6px;
      height: 100%;
      flex: none;
    }
    .lyt-slider__bar {
      position: absolute;
      height: 6px;
      background-color: var(--lyt-color-primary);
      border-radius: 3px;
      top: 0;
      left: 0;
      transition: width 0.2s, left 0.2s;
    }
    .lyt-slider--vertical .lyt-slider__bar {
      width: 6px;
      height: auto;
      left: 0;
      bottom: 0;
      transition: height 0.2s, bottom 0.2s;
    }
    .lyt-slider__button {
      position: absolute;
      width: 16px;
      height: 16px;
      top: 50%;
      transform: translate(-50%, -50%);
      background-color: #fff;
      border: 2px solid var(--lyt-color-primary);
      border-radius: 50%;
      cursor: grab;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 10;
    }
    .lyt-slider--vertical .lyt-slider__button {
      left: 50%;
      top: auto;
      bottom: 0;
      transform: translate(-50%, 50%);
    }
    .lyt-slider__button:hover {
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
    }
    .lyt-slider--vertical .lyt-slider__button:hover {
      transform: translate(-50%, 50%) scale(1.1);
    }
    .lyt-slider__tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 10px;
      background-color: var(--lyt-color-text);
      color: #fff;
      font-size: 12px;
      border-radius: 4px;
      white-space: nowrap;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .lyt-slider__tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--lyt-color-text);
    }
    .lyt-slider--vertical .lyt-slider__tooltip {
      left: 100%;
      bottom: 50%;
      transform: translateY(50%);
      margin-bottom: 0;
      margin-left: 8px;
    }
    .lyt-slider--vertical .lyt-slider__tooltip::after {
      top: 50%;
      left: auto;
      right: 100%;
      transform: translateY(-50%);
      border-top-color: transparent;
      border-right-color: var(--lyt-color-text);
    }
    .lyt-slider__stop {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 4px;
      background-color: var(--lyt-color-border);
      border-radius: 50%;
      cursor: pointer;
      z-index: 5;
    }
    .lyt-slider--vertical .lyt-slider__stop {
      left: 50%;
      top: auto;
      bottom: 0;
      transform: translate(-50%, 50%);
    }
    .lyt-slider__stop--active {
      background-color: var(--lyt-color-primary);
    }
    .lyt-slider__marks {
      position: absolute;
      top: 14px;
      left: 0;
      width: 100%;
      font-size: 12px;
    }
    .lyt-slider--vertical .lyt-slider__marks {
      top: 0;
      left: 14px;
      width: auto;
      height: 100%;
    }
    .lyt-slider__mark {
      position: absolute;
      transform: translateX(-50%);
      color: var(--lyt-color-muted);
      cursor: pointer;
    }
    .lyt-slider--vertical .lyt-slider__mark {
      transform: translateY(50%);
    }
    .lyt-slider__mark--active {
      color: var(--lyt-color-text);
    }
    .lyt-slider__input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lyt-slider__input {
      width: 60px;
      height: 32px;
      padding: 0 8px;
      font-size: 14px;
      border: 1px solid var(--lyt-color-border);
      border-radius: 4px;
      outline: none;
      text-align: center;
    }
    .lyt-slider__input:focus {
      border-color: var(--lyt-color-primary);
    }
    .lyt-slider__input:disabled {
      background-color: var(--lyt-color-bg);
      cursor: not-allowed;
    }
    .lyt-slider__input-separator {
      color: var(--lyt-color-muted);
      font-size: 14px;
    }
  `,
})
