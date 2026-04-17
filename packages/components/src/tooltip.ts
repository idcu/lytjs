/**
 * Popover 弹出提示
 * Props: content, placement, trigger, delay, disabled, maxWidth
 * Events: show, hide
 * Features: 位置(上下左右), 延迟, 触发方式(hover/click), 内容插槽
 */

import { defineComponent } from '@lytjs/component'

export const Popover = defineComponent({
  name: 'LytPopover',

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
      default: 100,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    maxWidth: {
      type: String,
      default: '320px',
    },
    offset: {
      type: Number,
      default: 10,
    },
    visible: {
      type: Boolean,
      default: undefined,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isVisible: false,
    })

    let delayTimer: ReturnType<typeof setTimeout> | null = null

    const show = () => {
      if (props.disabled) return
      if (delayTimer) clearTimeout(delayTimer)
      if (props.delay > 0) {
        delayTimer = setTimeout(() => {
          state.isVisible = true
          emit('show')
        }, props.delay)
      } else {
        state.isVisible = true
        emit('show')
      }
    }

    const hide = () => {
      if (delayTimer) clearTimeout(delayTimer)
      state.isVisible = false
      emit('hide')
    }

    const toggle = () => {
      if (state.isVisible) hide()
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

    const handleDocumentClick = (e: Event) => {
      if (props.trigger === 'click' && state.isVisible) {
        hide()
      }
    }

    watch(() => props.visible, (val) => {
      if (val !== undefined) {
        state.isVisible = val
      }
    })

    onMounted(() => {
      if (props.trigger === 'click') {
        document.addEventListener('click', handleDocumentClick)
      }
    })

    onUnmounted(() => {
      if (delayTimer) clearTimeout(delayTimer)
      document.removeEventListener('click', handleDocumentClick)
    })

    const popperStyle = () => ({
      maxWidth: props.maxWidth,
    })

    return {
      state, handleMouseEnter, handleMouseLeave,
      handleClick, handleFocus, handleBlur, popperStyle, slots,
    }
  },

  template: `
    <div
      class="lyt-popover"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
    >
      <div
        class="lyt-popover__trigger"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <slot></slot>
      </div>
      <div
        class="lyt-popover__popper lyt-popover__popper--{placement} {state.isVisible ? 'lyt-popover__popper--visible' : ''}"
        v-if="state.isVisible"
        :style="popperStyle()"
      >
        <div class="lyt-popover__arrow"></div>
        <div class="lyt-popover__content">
          <slot name="content">{{ content }}</slot>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-popover {
      display: inline-block;
      position: relative;
    }
    .lyt-popover__trigger {
      display: inline-block;
    }
    .lyt-popover__popper {
      position: absolute;
      z-index: 2000;
      padding: 10px 14px;
      font-size: 13px;
      color: #303133;
      background-color: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 6px;
      box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
      word-wrap: break-word;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: auto;
    }
    .lyt-popover__popper--visible { opacity: 1; }
    .lyt-popover__popper--top {
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
    }
    .lyt-popover__popper--bottom {
      top: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
    }
    .lyt-popover__popper--left {
      right: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
    }
    .lyt-popover__popper--right {
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
    }
    .lyt-popover__arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    }
    .lyt-popover__popper--top .lyt-popover__arrow {
      bottom: -13px;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: #fff;
    }
    .lyt-popover__popper--bottom .lyt-popover__arrow {
      top: -13px;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: #fff;
    }
    .lyt-popover__popper--left .lyt-popover__arrow {
      right: -13px;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: #fff;
    }
    .lyt-popover__popper--right .lyt-popover__arrow {
      left: -13px;
      top: 50%;
      transform: translateY(-50%);
      border-right-color: #fff;
    }
    .lyt-popover__content { line-height: 1.5; }
  `,
})
