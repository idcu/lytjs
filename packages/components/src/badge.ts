/**
 * CountBadge 计数徽标
 * Props: count, maxCount, dot, showZero, type, position, offset, status
 * Events: click
 * Features: 计数, 最大计数, 圆点模式, 位置(右上), 类型(成功/警告/错误/信息)
 */

import { defineComponent } from '@lytjs/component'

export const CountBadge = defineComponent({
  name: 'LytCountBadge',

  props: {
    count: {
      type: Number,
      default: 0,
    },
    maxCount: {
      type: Number,
      default: 99,
    },
    dot: {
      type: Boolean,
      default: false,
    },
    showZero: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'danger',
      validator: (v: string) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v),
    },
    position: {
      type: String,
      default: 'top-right',
      validator: (v: string) => ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(v),
    },
    offset: {
      type: Array as () => [number, number],
      default: undefined,
    },
    status: {
      type: String,
      default: '',
      validator: (v: string) => ['', 'success', 'processing', 'default', 'error', 'warning'].includes(v),
    },
    show: {
      type: Boolean,
      default: true,
    },
    text: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    /** 显示文本 */
    const displayCount = () => {
      if (props.dot) return ''
      if (props.text) return props.text
      if (props.count > props.maxCount) return `${props.maxCount}+`
      return String(props.count)
    }

    /** 是否显示徽标 */
    const showBadge = () => {
      if (!props.show) return false
      if (props.dot) return true
      if (props.count === 0 && !props.showZero && !props.text) return false
      return true
    }

    /** 是否为状态点模式 */
    const isStatus = () => {
      return !!props.status && !props.dot && props.count === 0 && !props.text
    }

    /** 徽标样式 */
    const badgeStyle = () => {
      const style: Record<string, string> = {}
      if (props.offset) {
        style.top = `${props.offset[0]}px`
        style.right = `${props.offset[1]}px`
      }
      // 位置
      if (props.position === 'top-left') {
        style.right = 'auto'
        style.left = '0'
        style.transform = 'translateX(-50%)'
        if (props.offset) {
          style.left = `${props.offset[1]}px`
          delete style.right
        }
      } else if (props.position === 'bottom-right') {
        style.top = 'auto'
        style.bottom = '0'
        if (props.offset) {
          style.bottom = `${props.offset[0]}px`
          delete style.top
        }
      } else if (props.position === 'bottom-left') {
        style.top = 'auto'
        style.bottom = '0'
        style.right = 'auto'
        style.left = '0'
        style.transform = 'translateX(-50%)'
        if (props.offset) {
          style.bottom = `${props.offset[0]}px`
          style.left = `${props.offset[1]}px`
          delete style.top
          delete style.right
        }
      }
      return style
    }

    /** 点击事件 */
    const handleClick = (e: Event) => {
      emit('click', e)
    }

    return { displayCount, showBadge, isStatus, badgeStyle, handleClick, slots }
  },

  template: `
    <span class="lyt-count-badge {isStatus() ? 'lyt-count-badge--status' : ''}">
      <slot></slot>
      <sup
        class="lyt-count-badge__count lyt-count-badge__count--{type} lyt-count-badge__count--{position} {dot ? 'lyt-count-badge__count--dot' : ''} {isStatus() ? 'lyt-count-badge__count--status-' + status : ''} {showBadge() ? '' : 'lyt-count-badge__count--hidden'}"
        :style="badgeStyle()"
        v-if="showBadge()"
        @click="handleClick"
      >{{ dot ? '' : displayCount() }}</sup>
    </span>
  `,

  styles: `
    .lyt-count-badge {
      position: relative;
      display: inline-flex;
      vertical-align: middle;
    }
    .lyt-count-badge--status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      vertical-align: middle;
      line-height: 1;
    }
    .lyt-count-badge__count {
      position: absolute;
      top: -8px;
      right: -8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 6px;
      font-size: 11px;
      line-height: 18px;
      color: #fff;
      background-color: #f56c6c;
      border-radius: 9px;
      transform: translateX(50%);
      white-space: nowrap;
      box-sizing: border-box;
      z-index: 1;
      transition: all 0.2s;
    }
    .lyt-count-badge__count--hidden { display: none; }
    .lyt-count-badge__count--dot {
      min-width: 8px;
      width: 8px;
      height: 8px;
      padding: 0;
      border-radius: 50%;
      top: -4px;
      right: -4px;
    }
    .lyt-count-badge__count--primary { background-color: #409eff; }
    .lyt-count-badge__count--success { background-color: #67c23a; }
    .lyt-count-badge__count--warning { background-color: #e6a23c; }
    .lyt-count-badge__count--danger { background-color: #f56c6c; }
    .lyt-count-badge__count--info { background-color: #909399; }
    .lyt-count-badge__count--default { background-color: #909399; }
    .lyt-count-badge__count--top-left {
      right: auto;
      left: 0;
      transform: translateX(-50%);
    }
    .lyt-count-badge__count--bottom-right {
      top: auto;
      bottom: 0;
    }
    .lyt-count-badge__count--bottom-left {
      top: auto;
      bottom: 0;
      right: auto;
      left: 0;
      transform: translateX(-50%);
    }
    .lyt-count-badge__count--status-success { background-color: #67c23a; width: 6px; height: 6px; min-width: 6px; border-radius: 50%; padding: 0; position: static; transform: none; }
    .lyt-count-badge__count--status-processing { background-color: #409eff; width: 6px; height: 6px; min-width: 6px; border-radius: 50%; padding: 0; position: static; transform: none; }
    .lyt-count-badge__count--status-default { background-color: #dcdfe6; width: 6px; height: 6px; min-width: 6px; border-radius: 50%; padding: 0; position: static; transform: none; }
    .lyt-count-badge__count--status-error { background-color: #f56c6c; width: 6px; height: 6px; min-width: 6px; border-radius: 50%; padding: 0; position: static; transform: none; }
    .lyt-count-badge__count--status-warning { background-color: #e6a23c; width: 6px; height: 6px; min-width: 6px; border-radius: 50%; padding: 0; position: static; transform: none; }
  `,
})
