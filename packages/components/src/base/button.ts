/**
 * Button 按钮
 * Props: type(primary/success/warning/danger/default), size(small/medium/large), disabled, loading, block, icon
 * Events: click
 * Slots: default, icon
 *
 * A11y: 使用原生 <button> 元素，添加 aria-disabled、aria-busy 属性
 */

import { defineComponent } from '@lytjs/component';

export const Button = defineComponent({
  name: 'LytButton',

  props: {
    type: {
      type: String,
      default: 'default',
      validator: (v: string) => ['default', 'primary', 'success', 'warning', 'danger'].includes(v),
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    block: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: '',
    },
    /** 无障碍标签，当按钮内容不足以描述时使用 */
    ariaLabel: {
      type: String,
      default: '',
    },
    /** 是否展开弹出层 */
    ariaExpanded: {
      type: Boolean,
      default: undefined,
    },
    /** 弹出层类型 */
    ariaHaspopup: {
      type: String,
      default: '',
    },
    /** 关联的弹出层 ID */
    ariaControls: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const handleClick = (e: Event) => {
      if (props.disabled || props.loading) return;
      emit('click', e);
    };

    return { props, handleClick, slots };
  },

  template: `
    <button
      class="lyt-btn lyt-btn--{type} lyt-btn--{size} {block ? 'lyt-btn--block' : ''} {disabled || loading ? 'lyt-btn--disabled' : ''}"
      :disabled="disabled || loading"
      :aria-disabled="disabled || loading ? 'true' : undefined"
      :aria-busy="loading ? 'true' : undefined"
      :aria-label="ariaLabel || undefined"
      :aria-expanded="ariaExpanded !== undefined ? (ariaExpanded ? 'true' : 'false') : undefined"
      :aria-haspopup="ariaHaspopup || undefined"
      :aria-controls="ariaControls || undefined"
      @click="handleClick"
    >
      <span v-if="loading" class="lyt-btn__loading" aria-hidden="true">
        <svg viewBox="0 0 1024 1024" class="lyt-btn__loading-icon" width="1em" height="1em">
          <path d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32zm-448-192a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H96a32 32 0 0 1-32-32zm640 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736a32 32 0 0 1-32-32z"/>
        </svg>
      </span>
      <slot name="icon"></slot>
      <slot></slot>
    </button>
  `,

  styles: `
    .lyt-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: var(--lyt-font-size-base);
      line-height: 1.5;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-muted);
      cursor: pointer;
      transition: all 0.3s;
      box-sizing: border-box;
      outline: none;
      white-space: nowrap;
      user-select: none;
    }
    .lyt-btn:hover { border-color: var(--lyt-color-primary); color: var(--lyt-color-primary); }
    .lyt-btn:active { border-color: var(--lyt-color-primary); color: var(--lyt-color-primary); }
    .lyt-btn--primary { background-color: var(--lyt-color-primary); border-color: var(--lyt-color-primary); color: #fff; }
    .lyt-btn--primary:hover { background-color: var(--lyt-color-primary); border-color: var(--lyt-color-primary); color: #fff; opacity: 0.85; }
    .lyt-btn--success { background-color: var(--lyt-color-success); border-color: var(--lyt-color-success); color: #fff; }
    .lyt-btn--success:hover { background-color: var(--lyt-color-success); border-color: var(--lyt-color-success); color: #fff; opacity: 0.85; }
    .lyt-btn--warning { background-color: var(--lyt-color-warning); border-color: var(--lyt-color-warning); color: #fff; }
    .lyt-btn--warning:hover { background-color: var(--lyt-color-warning); border-color: var(--lyt-color-warning); color: #fff; opacity: 0.85; }
    .lyt-btn--danger { background-color: var(--lyt-color-danger); border-color: var(--lyt-color-danger); color: #fff; }
    .lyt-btn--danger:hover { background-color: var(--lyt-color-danger); border-color: var(--lyt-color-danger); color: #fff; opacity: 0.85; }
    .lyt-btn--small { padding: 5px 11px; font-size: var(--lyt-font-size-sm); border-radius: var(--lyt-radius-sm); }
    .lyt-btn--large { padding: 12px 20px; font-size: var(--lyt-font-size-lg); border-radius: var(--lyt-radius-sm); }
    .lyt-btn--block { display: flex; width: 100%; }
    .lyt-btn--disabled { opacity: 0.6; cursor: not-allowed; pointer-events: none; }
    .lyt-btn__loading { display: inline-flex; align-items: center; }
    .lyt-btn__loading-icon { animation: lyt-spin 1s linear infinite; }
    @keyframes lyt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `,
});
