/**
 * Alert 警告
 * Props: type(success/warning/error/info), title, closable, showIcon
 * Events: close
 */

import { defineComponent } from '@lytjs/component'

export const Alert = defineComponent({
  name: 'LytAlert',

  props: {
    type: {
      type: String,
      default: 'info',
      validator: (v: string) => ['success', 'warning', 'error', 'info'].includes(v),
    },
    title: {
      type: String,
      default: '',
    },
    closable: {
      type: Boolean,
      default: false,
    },
    showIcon: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      visible: true,
    })

    const handleClose = () => {
      state.visible = false
      emit('close')
    }

    const iconMap: Record<string, string> = {
      success: '&#10003;',
      warning: '&#9888;',
      error: '&#10007;',
      info: '&#8505;',
    }

    return { state, handleClose, iconMap, slots }
  },

  template: `
    <div class="lyt-alert lyt-alert--{type}" v-if="state.visible">
      <span class="lyt-alert__icon" v-if="showIcon">
        <span v-html="iconMap[type]"></span>
      </span>
      <div class="lyt-alert__content">
        <span class="lyt-alert__title" v-if="title">{{ title }}</span>
        <slot></slot>
      </div>
      <span class="lyt-alert__close" v-if="closable" @click="handleClose">&times;</span>
    </div>
  `,

  styles: `
    .lyt-alert {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-radius: var(--lyt-radius-sm);
      font-size: var(--lyt-font-size-base);
      line-height: 1.5;
      box-sizing: border-box;
      position: relative;
      transition: opacity 0.3s;
    }
    .lyt-alert--info { background-color: var(--lyt-color-bg); color: var(--lyt-color-info); border: 1px solid var(--lyt-color-border); }
    .lyt-alert--success { background-color: var(--lyt-color-bg); color: var(--lyt-color-success); border: 1px solid var(--lyt-color-border); }
    .lyt-alert--warning { background-color: var(--lyt-color-bg); color: var(--lyt-color-warning); border: 1px solid var(--lyt-color-border); }
    .lyt-alert--error { background-color: var(--lyt-color-bg); color: var(--lyt-color-danger); border: 1px solid var(--lyt-color-border); }
    .lyt-alert__icon {
      display: inline-flex;
      align-items: center;
      margin-right: 8px;
      font-size: var(--lyt-font-size-lg);
      flex-shrink: 0;
    }
    .lyt-alert__content {
      flex: 1;
    }
    .lyt-alert__title {
      display: block;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .lyt-alert__close {
      position: absolute;
      top: 12px;
      right: 12px;
      cursor: pointer;
      font-size: var(--lyt-font-size-xl);
      color: inherit;
      opacity: 0.6;
      transition: opacity 0.3s;
    }
    .lyt-alert__close:hover { opacity: 1; }
  `,
})
