/**
 * Tooltip 文字提示
 * Props: content, placement(top/bottom/left/right), trigger(hover/click/focus), delay
 * Features: 箭头指向, 延迟显示
 */

import { defineComponent, onUnmounted } from '@lytjs/component'
import { reactive } from '@lytjs/reactivity'

export const Tooltip = defineComponent({
  name: 'LytTooltip',

  props: {
    content: {
      type: String,
      default: '',
    },
    placement: {
      type: String,
      default: 'top',
      validator: (v: string) => ['top', 'bottom', 'left', 'right'].includes(v),
    },
    trigger: {
      type: String,
      default: 'hover',
      validator: (v: string) => ['hover', 'click', 'focus'].includes(v),
    },
    delay: {
      type: Number,
      default: 0,
    },
  },

  setup(props, { slots }) {
    const state = reactive({
      visible: false,
    })

    let delayTimer: ReturnType<typeof setTimeout> | null = null

    const show = () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (props.delay > 0) {
        delayTimer = setTimeout(() => {
          state.visible = true
        }, props.delay)
      } else {
        state.visible = true
      }
    }

    const hide = () => {
      if (delayTimer) clearTimeout(delayTimer)
      state.visible = false
    }

    const toggle = () => {
      if (state.visible) hide()
      else show()
    }

    const handleMouseEnter = () => {
      if (props.trigger === 'hover') show()
    }

    const handleMouseLeave = () => {
      if (props.trigger === 'hover') hide()
    }

    const handleClick = () => {
      if (props.trigger === 'click') toggle()
    }

    const handleFocus = () => {
      if (props.trigger === 'focus') show()
    }

    const handleBlur = () => {
      if (props.trigger === 'focus') hide()
    }

    onUnmounted(() => {
      if (delayTimer) clearTimeout(delayTimer)
    })

    return {
      state, handleMouseEnter, handleMouseLeave,
      handleClick, handleFocus, handleBlur, slots,
    }
  },

  template: `
    <div
      class="lyt-tooltip"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
    >
      <div
        class="lyt-tooltip__trigger"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <slot></slot>
      </div>
      <div class="lyt-tooltip__popper lyt-tooltip__popper--{placement} {state.visible ? 'lyt-tooltip__popper--visible' : ''}" v-if="state.visible">
        <div class="lyt-tooltip__arrow"></div>
        <div class="lyt-tooltip__content">{{ content }}</div>
      </div>
    </div>
  `,

  styles: `
    .lyt-tooltip {
      display: inline-block;
      position: relative;
    }
    .lyt-tooltip__trigger {
      display: inline-block;
    }
    .lyt-tooltip__popper {
      position: absolute;
      z-index: 2000;
      padding: 8px 12px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-bg);
      background-color: var(--lyt-color-fg);
      border-radius: var(--lyt-radius-sm);
      max-width: 320px;
      word-wrap: break-word;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .lyt-tooltip__popper--visible { opacity: 1; }
    .lyt-tooltip__popper--top {
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
    }
    .lyt-tooltip__popper--bottom {
      top: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
    }
    .lyt-tooltip__popper--left {
      right: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
    }
    .lyt-tooltip__popper--right {
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
    }
    .lyt-tooltip__arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    }
    .lyt-tooltip__popper--top .lyt-tooltip__arrow {
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: var(--lyt-color-fg);
    }
    .lyt-tooltip__popper--bottom .lyt-tooltip__arrow {
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: var(--lyt-color-fg);
    }
    .lyt-tooltip__popper--left .lyt-tooltip__arrow {
      right: -12px;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: var(--lyt-color-fg);
    }
    .lyt-tooltip__popper--right .lyt-tooltip__arrow {
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      border-right-color: var(--lyt-color-fg);
    }
  `,
})
