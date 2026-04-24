/**
 * Modal 对话框
 * Props: visible, title, content, confirmText, cancelText, closable, maskClosable, width
 * Events: confirm, cancel, close
 * Methods: open(), close()
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component'
import { reactive, watch } from '@lytjs/reactivity'

export const Modal = defineComponent({
  name: 'LytModal',

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    confirmText: {
      type: String,
      default: '确定',
    },
    cancelText: {
      type: String,
      default: '取消',
    },
    closable: {
      type: Boolean,
      default: true,
    },
    maskClosable: {
      type: Boolean,
      default: true,
    },
    width: {
      type: String,
      default: '520px',
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isVisible: props.visible,
      isAnimating: false,
    })

    const open = () => {
      state.isVisible = true
      state.isAnimating = true
      document.body.style.overflow = 'hidden'
      emit('update:visible', true)
    }

    const close = () => {
      state.isAnimating = false
      setTimeout(() => {
        state.isVisible = false
        document.body.style.overflow = ''
        emit('update:visible', false)
        emit('close')
      }, 300)
    }

    const handleConfirm = () => {
      emit('confirm')
      close()
    }

    const handleCancel = () => {
      emit('cancel')
      close()
    }

    const handleMaskClick = () => {
      if (props.maskClosable) {
        close()
      }
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isVisible) {
        close()
      }
    }

    watch(() => props.visible, (val: any) => {
      if (val) open()
      else close()
    })

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    })

    return { state, open, close, handleConfirm, handleCancel, handleMaskClick, slots }
  },

  template: `
    <div class="lyt-modal" v-if="state.isVisible">
      <div class="lyt-modal__mask {state.isAnimating ? 'lyt-modal__mask--visible' : ''}" @click="handleMaskClick"></div>
      <div class="lyt-modal__wrapper {state.isAnimating ? 'lyt-modal__wrapper--visible' : ''}">
        <div class="lyt-modal__dialog" :style="{ width: width }">
          <div class="lyt-modal__header" v-if="title || closable">
            <span class="lyt-modal__title">{{ title }}</span>
            <span class="lyt-modal__close" v-if="closable" @click="close">&times;</span>
          </div>
          <div class="lyt-modal__body">
            <slot>{{ content }}</slot>
          </div>
          <div class="lyt-modal__footer">
            <button class="lyt-btn" @click="handleCancel">{{ cancelText }}</button>
            <button class="lyt-btn lyt-btn--primary" @click="handleConfirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2000;
    }
    .lyt-modal__mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .lyt-modal__mask--visible { opacity: 1; }
    .lyt-modal__wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-modal__dialog {
      background-color: var(--lyt-color-card);
      border-radius: var(--lyt-radius-sm);
      box-shadow: var(--lyt-shadow-lg);
      max-width: 90vw;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      transform: scale(0.8);
      opacity: 0;
      transition: all 0.3s;
    }
    .lyt-modal__wrapper--visible .lyt-modal__dialog {
      transform: scale(1);
      opacity: 1;
    }
    .lyt-modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--lyt-color-border);
    }
    .lyt-modal__title {
      font-size: var(--lyt-font-size-lg);
      font-weight: 600;
      color: var(--lyt-color-fg);
    }
    .lyt-modal__close {
      cursor: pointer;
      font-size: var(--lyt-font-size-xl);
      color: var(--lyt-color-info);
      line-height: 1;
      transition: color 0.3s;
    }
    .lyt-modal__close:hover { color: var(--lyt-color-muted); }
    .lyt-modal__body {
      padding: 20px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      overflow-y: auto;
      flex: 1;
    }
    .lyt-modal__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 20px;
      border-top: 1px solid var(--lyt-color-border);
    }
  `,
})
