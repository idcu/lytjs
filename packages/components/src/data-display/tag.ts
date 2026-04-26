/**
 * Tag 标签
 * Props: type, closable, color, size
 * Events: close
 */

import { defineComponent } from '@lytjs/component';
import { reactive } from '@lytjs/reactivity';

export const Tag = defineComponent({
  name: 'LytTag',

  props: {
    type: {
      type: String,
      default: 'default',
      validator: (v: string) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v),
    },
    closable: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      visible: true,
    });

    const handleClose = (e: Event) => {
      e.stopPropagation();
      state.visible = false;
      emit('close');
    };

    const tagStyle = () => {
      if (props.color) {
        return {
          backgroundColor: props.color + '15',
          borderColor: props.color,
          color: props.color,
        };
      }
      return {};
    };

    const hasCustomColor = () => !!props.color;

    return { state, handleClose, tagStyle, hasCustomColor, slots };
  },

  template: `
    <span
      class="lyt-tag lyt-tag--{type} lyt-tag--{size} {hasCustomColor() ? 'lyt-tag--custom' : ''}"
      :style="tagStyle()"
      v-if="state.visible"
    >
      <slot></slot>
      <span class="lyt-tag__close" v-if="closable" @click="handleClose">&times;</span>
    </span>
  `,

  styles: `
    .lyt-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: var(--lyt-font-size-sm);
      line-height: 1;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-primary);
      box-sizing: border-box;
      white-space: nowrap;
      transition: all 0.3s;
    }
    .lyt-tag--small { padding: 2px 6px; font-size: 11px; }
    .lyt-tag--large { padding: 6px 14px; font-size: var(--lyt-font-size-base); }
    .lyt-tag--default { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-info); }
    .lyt-tag--primary { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-primary); }
    .lyt-tag--success { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-success); }
    .lyt-tag--warning { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-warning); }
    .lyt-tag--danger { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-danger); }
    .lyt-tag--info { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); color: var(--lyt-color-info); }
    .lyt-tag--custom { border-color: transparent; }
    .lyt-tag__close {
      cursor: pointer;
      font-size: var(--lyt-font-size-base);
      color: inherit;
      opacity: 0.6;
      border-radius: 50%;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-tag__close:hover { opacity: 1; background-color: rgba(0, 0, 0, 0.1); }
  `,
});
