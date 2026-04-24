/**
 * Link 链接
 * Props: href, target, type, underline, disabled
 */

import { defineComponent } from '@lytjs/component'

export const Link = defineComponent({
  name: 'LytLink',

  props: {
    href: {
      type: String,
      default: '',
    },
    target: {
      type: String,
      default: '_self',
    },
    type: {
      type: String,
      default: 'default',
      validator: (v: string) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v),
    },
    underline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { slots }) {
    const handleClick = (e: Event) => {
      if (props.disabled) {
        e.preventDefault()
        return
      }
    }

    return { props, handleClick, slots }
  },

  template: `
    <a
      class="lyt-link lyt-link--{type} {underline ? 'lyt-link--underline' : ''} {disabled ? 'lyt-link--disabled' : ''}"
      :href="disabled ? undefined : href"
      :target="disabled ? undefined : target"
      @click="handleClick"
    >
      <slot></slot>
    </a>
  `,

  styles: `
    .lyt-link {
      display: inline-flex;
      align-items: center;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.3s;
    }
    .lyt-link:hover { color: var(--lyt-color-primary); }
    .lyt-link--underline { text-decoration: underline; }
    .lyt-link--primary { color: var(--lyt-color-primary); }
    .lyt-link--primary:hover { color: var(--lyt-color-primary); opacity: 0.8; }
    .lyt-link--success { color: var(--lyt-color-success); }
    .lyt-link--success:hover { color: var(--lyt-color-success); opacity: 0.8; }
    .lyt-link--warning { color: var(--lyt-color-warning); }
    .lyt-link--warning:hover { color: var(--lyt-color-warning); opacity: 0.8; }
    .lyt-link--danger { color: var(--lyt-color-danger); }
    .lyt-link--danger:hover { color: var(--lyt-color-danger); opacity: 0.8; }
    .lyt-link--info { color: var(--lyt-color-info); }
    .lyt-link--info:hover { color: var(--lyt-color-info); opacity: 0.8; }
    .lyt-link--disabled { color: var(--lyt-color-muted); cursor: not-allowed; pointer-events: none; opacity: 0.5; }
  `,
})
