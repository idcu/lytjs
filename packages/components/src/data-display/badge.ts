/**
 * Badge 徽标
 * Props: count, maxCount, dot, showZero, type, offset
 */

import { defineComponent } from '@lytjs/component'

export const Badge = defineComponent({
  name: 'LytBadge',

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
    offset: {
      type: Array as () => [number, number],
      default: undefined,
    },
  },

  setup(props, { slots }) {
    const displayCount = () => {
      if (props.dot) return ''
      if (props.count > props.maxCount) return `${props.maxCount}+`
      return String(props.count)
    }

    const showBadge = () => {
      if (props.dot) return true
      if (props.count === 0) return props.showZero
      return true
    }

    const badgeStyle = () => {
      const style: Record<string, string> = {}
      if (props.offset) {
        style.top = `${props.offset[0]}px`
        style.right = `${props.offset[1]}px`
      }
      return style
    }

    return { displayCount, showBadge, badgeStyle, slots }
  },

  template: `
    <span class="lyt-badge">
      <slot></slot>
      <sup
        class="lyt-badge__count lyt-badge__count--{type} {dot ? 'lyt-badge__count--dot' : ''} {showBadge() ? '' : 'lyt-badge__count--hidden'}"
        :style="badgeStyle()"
        v-if="showBadge()"
      >{{ dot ? '' : displayCount() }}</sup>
    </span>
  `,

  styles: `
    .lyt-badge {
      position: relative;
      display: inline-flex;
      vertical-align: middle;
    }
    .lyt-badge__count {
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
      background-color: var(--lyt-color-danger);
      border-radius: 9px;
      transform: translateX(50%);
      white-space: nowrap;
      box-sizing: border-box;
      z-index: 1;
    }
    .lyt-badge__count--hidden { display: none; }
    .lyt-badge__count--dot {
      min-width: 8px;
      width: 8px;
      height: 8px;
      padding: 0;
      border-radius: 50%;
      top: -4px;
      right: -4px;
    }
    .lyt-badge__count--primary { background-color: var(--lyt-color-primary); }
    .lyt-badge__count--success { background-color: var(--lyt-color-success); }
    .lyt-badge__count--warning { background-color: var(--lyt-color-warning); }
    .lyt-badge__count--danger { background-color: var(--lyt-color-danger); }
    .lyt-badge__count--info { background-color: var(--lyt-color-info); }
    .lyt-badge__count--default { background-color: var(--lyt-color-info); }
  `,
})
