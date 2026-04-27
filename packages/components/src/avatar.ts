/**
 * Avatar 头像组件
 * Props: size (small/medium/large), shape (circle/square), src, alt, text
 * Events: click
 * Slots: default
 */

import { defineComponent } from '@lytjs/component'

export const Avatar = defineComponent({
  name: 'LytAvatar',

  props: {
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    shape: {
      type: String,
      default: 'circle',
      validator: (v: string) => ['circle', 'square'].includes(v),
    },
    src: {
      type: String,
      default: '',
    },
    alt: {
      type: String,
      default: 'avatar',
    },
    text: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const handleClick = (e: Event) => {
      emit('click', e)
    }

    return { props, handleClick, slots }
  },

  template: `
    <div
      class="lyt-avatar lyt-avatar--{{ size }} lyt-avatar--{{ shape }}"
      @click="handleClick"
    >
      <slot v-if="slots.default"></slot>
      <img v-else-if="props.src" :src="props.src" :alt="props.alt" class="lyt-avatar__image" />
      <span v-else-if="props.text" class="lyt-avatar__text">{{ props.text }}</span>
      <span v-else class="lyt-avatar__default">
        <svg viewBox="0 0 1024 1024" class="lyt-avatar__icon" width="1em" height="1em">
          <path d="M512 512a192 192 0 1 0 0-384 192 192 0 0 0 0 384z m0 64a256 256 0 1 0-256 256h512a256 256 0 1 0-256-256z" />
        </svg>
      </span>
    </div>
  `,

  styles: `
    .lyt-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background-color: var(--lyt-color-primary-light);
      color: var(--lyt-color-primary);
      user-select: none;
    }
    .lyt-avatar--small {
      width: 24px;
      height: 24px;
      font-size: 12px;
    }
    .lyt-avatar--medium {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }
    .lyt-avatar--large {
      width: 40px;
      height: 40px;
      font-size: 16px;
    }
    .lyt-avatar--circle {
      border-radius: 50%;
    }
    .lyt-avatar--square {
      border-radius: var(--lyt-radius-sm);
    }
    .lyt-avatar__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .lyt-avatar__text {
      font-weight: 500;
    }
    .lyt-avatar__default {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-avatar__icon {
      fill: currentColor;
    }
  `,
})
