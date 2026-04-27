/**
 * Spin 加载中
 * Props: spinning, size(small/default/large), tip, delay
 */

import { defineComponent, onUnmounted } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Spin = defineComponent({
  name: 'LytSpin',

  props: {
    spinning: {
      type: Boolean,
      default: true,
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default', 'large'].includes(v),
    },
    tip: {
      type: String,
      default: '',
    },
    delay: {
      type: Number,
      default: 0,
    },
  },

  setup(props, { slots }) {
    const state = reactive({
      visible: props.spinning,
    });

    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    watch(() => props.spinning, (val: any) => {
      if (delayTimer) clearTimeout(delayTimer);
      if (val) {
        if (props.delay > 0) {
          delayTimer = setTimeout(() => {
            state.visible = true;
          }, props.delay);
        } else {
          state.visible = true;
        }
      } else {
        state.visible = false;
      }
    });

    onUnmounted(() => {
      if (delayTimer) clearTimeout(delayTimer);
    });

    return { state, slots };
  },

  template: `
    <div class="lyt-spin {state.visible ? 'lyt-spin--spinning' : ''}">
      <div class="lyt-spin__loading" v-if="state.visible">
        <div class="lyt-spin__icon lyt-spin__icon--{size}">
          <svg viewBox="0 0 1024 1024" class="lyt-spin__svg">
            <path d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32zm-448-192a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H96a32 32 0 0 1-32-32zm640 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736a32 32 0 0 1-32-32z"/>
          </svg>
        </div>
        <div class="lyt-spin__tip" v-if="tip">{{ tip }}</div>
      </div>
      <div class="lyt-spin__content {state.visible ? 'lyt-spin__content--hidden' : ''}">
        <slot></slot>
      </div>
    </div>
  `,

  styles: `
    .lyt-spin {
      display: inline-block;
      position: relative;
    }
    .lyt-spin__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      background-color: rgba(255, 255, 255, 0.7);
    }
    .lyt-spin__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-spin__icon--small { width: 20px; height: 20px; }
    .lyt-spin__icon--default { width: 32px; height: 32px; }
    .lyt-spin__icon--large { width: 48px; height: 48px; }
    .lyt-spin__svg {
      width: 100%;
      height: 100%;
      animation: lyt-spin-rotate 1s linear infinite;
      color: var(--lyt-color-primary);
    }
    @keyframes lyt-spin-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .lyt-spin__tip {
      margin-top: 8px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
    .lyt-spin__content {
      transition: opacity 0.3s;
    }
    .lyt-spin__content--hidden { opacity: 0.5; user-select: none; }
  `,
});
