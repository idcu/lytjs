/**
 * Drawer 抽屉
 * Props: visible, placement(left/right/top/bottom), title, closable, mask, maskClosable, width, height, zIndex
 * Events: open, close, afterOpen, afterClose
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Drawer = defineComponent({
  name: 'LytDrawer',

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    placement: {
      type: String,
      default: 'right',
      validator: (v: string) => ['left', 'right', 'top', 'bottom'].includes(v),
    },
    title: {
      type: String,
      default: '',
    },
    closable: {
      type: Boolean,
      default: true,
    },
    mask: {
      type: Boolean,
      default: true,
    },
    maskClosable: {
      type: Boolean,
      default: true,
    },
    width: {
      type: String,
      default: '378px',
    },
    height: {
      type: String,
      default: '378px',
    },
    zIndex: {
      type: Number,
      default: 2000,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isVisible: false,
      isAnimating: false,
    });

    const open = () => {
      state.isVisible = true;
      requestAnimationFrame(() => {
        state.isAnimating = true;
      });
      document.body.style.overflow = 'hidden';
      emit('open');
    };

    const close = () => {
      state.isAnimating = false;
      setTimeout(() => {
        state.isVisible = false;
        document.body.style.overflow = '';
        emit('afterClose');
      }, 300);
      emit('close');
    };

    const handleMaskClick = () => {
      if (props.maskClosable) {
        close();
      }
    };

    const handleClose = () => {
      close();
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isVisible) {
        close();
      }
    };

    const contentStyle = () => {
      const style: Record<string, string> = { zIndex: String(props.zIndex) };
      if (props.placement === 'left' || props.placement === 'right') {
        style.width = props.width;
      } else {
        style.height = props.height;
      }
      return style;
    };

    watch(() => props.visible, (val: any) => {
      if (val) open();
      else close();
    });

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    });

    return { state, handleMaskClick, handleClose, contentStyle, slots };
  },

  template: `
    <div class="lyt-drawer" v-if="state.isVisible">
      <div
        class="lyt-drawer__mask {state.isAnimating ? 'lyt-drawer__mask--visible' : ''}"
        v-if="mask"
        @click="handleMaskClick"
      ></div>
      <div
        class="lyt-drawer__content lyt-drawer__content--{placement} {state.isAnimating ? 'lyt-drawer__content--open' : ''}"
        :style="contentStyle()"
      >
        <div class="lyt-drawer__header" v-if="title || closable">
          <span class="lyt-drawer__title">{{ title }}</span>
          <span class="lyt-drawer__close" v-if="closable" @click="handleClose">&times;</span>
        </div>
        <div class="lyt-drawer__body">
          <slot></slot>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-drawer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2000;
      pointer-events: none;
    }
    .lyt-drawer__mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.45);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: auto;
    }
    .lyt-drawer__mask--visible { opacity: 1; }
    .lyt-drawer__content {
      position: absolute;
      background-color: var(--lyt-color-card);
      box-shadow: var(--lyt-shadow-lg);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .lyt-drawer__content--right {
      top: 0;
      right: 0;
      height: 100%;
      transform: translateX(100%);
    }
    .lyt-drawer__content--right.lyt-drawer__content--open {
      transform: translateX(0);
    }
    .lyt-drawer__content--left {
      top: 0;
      left: 0;
      height: 100%;
      transform: translateX(-100%);
    }
    .lyt-drawer__content--left.lyt-drawer__content--open {
      transform: translateX(0);
    }
    .lyt-drawer__content--top {
      top: 0;
      left: 0;
      width: 100%;
      transform: translateY(-100%);
    }
    .lyt-drawer__content--top.lyt-drawer__content--open {
      transform: translateY(0);
    }
    .lyt-drawer__content--bottom {
      bottom: 0;
      left: 0;
      width: 100%;
      transform: translateY(100%);
    }
    .lyt-drawer__content--bottom.lyt-drawer__content--open {
      transform: translateY(0);
    }
    .lyt-drawer__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--lyt-color-border);
      flex-shrink: 0;
    }
    .lyt-drawer__title {
      font-size: var(--lyt-font-size-lg);
      font-weight: 600;
      color: var(--lyt-color-fg);
    }
    .lyt-drawer__close {
      cursor: pointer;
      font-size: var(--lyt-font-size-xl);
      color: var(--lyt-color-info);
      line-height: 1;
      transition: color 0.3s;
      padding: 4px;
    }
    .lyt-drawer__close:hover { color: var(--lyt-color-muted); }
    .lyt-drawer__body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
  `,
});
