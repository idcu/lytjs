/**
 * Dialog 对话框
 * Props: visible, title, width, closable, maskClosable, closeOnEsc, showFooter, confirmText, cancelText, fullscreen
 * Events: open, close, confirm, cancel, update:visible
 * Features: 标题, 内容插槽, 底部插槽, 遮罩关闭, 关闭按钮, 淡入淡出动画
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component'
import { reactive, watch } from '@lytjs/reactivity'

export const Dialog = defineComponent({
  name: 'LytDialog',

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    width: {
      type: String,
      default: '520px',
    },
    closable: {
      type: Boolean,
      default: true,
    },
    maskClosable: {
      type: Boolean,
      default: true,
    },
    closeOnEsc: {
      type: Boolean,
      default: true,
    },
    showFooter: {
      type: Boolean,
      default: true,
    },
    confirmText: {
      type: String,
      default: '确定',
    },
    cancelText: {
      type: String,
      default: '取消',
    },
    fullscreen: {
      type: Boolean,
      default: false,
    },
    zIndex: {
      type: Number,
      default: 2000,
    },
    top: {
      type: String,
      default: '15vh',
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isVisible: false,
      isAnimating: false,
    })

    const open = () => {
      state.isVisible = true
      state.isAnimating = true
      document.body.style.overflow = 'hidden'
      emit('open')
      emit('update:visible', true)
    }

    const close = () => {
      state.isAnimating = false
      setTimeout(() => {
        state.isVisible = false
        document.body.style.overflow = ''
        emit('close')
        emit('update:visible', false)
      }, 300)
    }

    const handleConfirm = () => {
      emit('confirm')
    }

    const handleCancel = () => {
      emit('cancel')
      close()
    }

    const handleMaskClick = () => {
      if (props.maskClosable) close()
    }

    const handleClose = () => {
      close()
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.closeOnEsc && state.isVisible) {
        close()
      }
    }

    watch(() => props.visible, (val: any) => {
      if (val) open()
      else if (state.isVisible) close()
    })

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    })

    const dialogStyle = () => {
      const style: Record<string, string> = {
        zIndex: String(props.zIndex),
      }
      if (!props.fullscreen) {
        style.width = props.width
        style.top = props.top
      }
      return style
    }

    return {
      state, open, close, handleConfirm, handleCancel,
      handleMaskClick, handleClose, dialogStyle, slots,
    }
  },

  template: `
    <div class="lyt-dialog" v-if="state.isVisible" :style="{ zIndex: zIndex }">
      <div
        class="lyt-dialog__mask {state.isAnimating ? 'lyt-dialog__mask--visible' : ''}"
        @click="handleMaskClick"
      ></div>
      <div class="lyt-dialog__wrapper {state.isAnimating ? 'lyt-dialog__wrapper--visible' : ''}">
        <div
          class="lyt-dialog__dialog {fullscreen ? 'lyt-dialog__dialog--fullscreen' : ''}"
          :style="dialogStyle()"
        >
          <div class="lyt-dialog__header" v-if="title || closable">
            <span class="lyt-dialog__title">{{ title }}</span>
            <span class="lyt-dialog__close" v-if="closable" @click="handleClose">&times;</span>
          </div>
          <div class="lyt-dialog__body">
            <slot></slot>
          </div>
          <div class="lyt-dialog__footer" v-if="showFooter">
            <slot name="footer">
              <button class="lyt-dialog__btn lyt-dialog__btn--cancel" @click="handleCancel">{{ cancelText }}</button>
              <button class="lyt-dialog__btn lyt-dialog__btn--confirm" @click="handleConfirm">{{ confirmText }}</button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-dialog {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .lyt-dialog__mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .lyt-dialog__mask--visible { opacity: 1; }
    .lyt-dialog__wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      overflow: auto;
      padding: 20px;
    }
    .lyt-dialog__dialog {
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.15);
      max-width: 90vw;
      display: flex;
      flex-direction: column;
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
      transition: all 0.3s;
    }
    .lyt-dialog__wrapper--visible .lyt-dialog__dialog {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .lyt-dialog__dialog--fullscreen {
      width: 100vw !important;
      height: 100vh;
      max-width: 100vw;
      border-radius: 0;
      margin: 0;
    }
    .lyt-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid #e4e7ed;
    }
    .lyt-dialog__title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      line-height: 1.5;
    }
    .lyt-dialog__close {
      cursor: pointer;
      font-size: 22px;
      color: #909399;
      line-height: 1;
      transition: color 0.2s;
      padding: 4px;
    }
    .lyt-dialog__close:hover { color: #606266; }
    .lyt-dialog__body {
      padding: 24px;
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
      overflow-y: auto;
      flex: 1;
    }
    .lyt-dialog__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 24px;
      border-top: 1px solid #e4e7ed;
    }
    .lyt-dialog__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      font-size: 14px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #dcdfe6;
      background-color: #fff;
      color: #606266;
    }
    .lyt-dialog__btn:hover { border-color: #409eff; color: #409eff; }
    .lyt-dialog__btn--confirm {
      background-color: #409eff;
      border-color: #409eff;
      color: #fff;
    }
    .lyt-dialog__btn--confirm:hover { background-color: #66b1ff; border-color: #66b1ff; color: #fff; }
  `,
})
