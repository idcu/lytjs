/**
 * Toast 轻提示
 * Props: message, type(success/error/warning/info), duration, position(top/center/bottom)
 * Methods: show(), success(), error(), warning(), info() (静态方法)
 * Features: 自动消失, 队列显示
 */

import { defineComponent } from '@lytjs/component'

interface ToastInstance {
  id: number
  message: string
  type: string
  position: string
  duration: number
  visible: boolean
  timer: ReturnType<typeof setTimeout> | null
}

let toastId = 0
const toastQueue: ToastInstance[] = []
let toastContainer: HTMLDivElement | null = null

function getContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'lyt-toast-container'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

function removeToast(instance: ToastInstance) {
  instance.visible = false
  const el = document.getElementById(`lyt-toast-${instance.id}`)
  if (el) {
    el.classList.remove('lyt-toast--visible')
    setTimeout(() => {
      el.remove()
      const index = toastQueue.indexOf(instance)
      if (index > -1) toastQueue.splice(index, 1)
      if (toastQueue.length === 0 && toastContainer) {
        toastContainer.remove()
        toastContainer = null
      }
    }, 300)
  }
}

function createToast(options: {
  message: string
  type?: string
  duration?: number
  position?: string
}): ToastInstance {
  const id = ++toastId
  const instance: ToastInstance = {
    id,
    message: options.message,
    type: options.type || 'info',
    position: options.position || 'top',
    duration: options.duration !== undefined ? options.duration : 3000,
    visible: true,
    timer: null,
  }

  const container = getContainer()
  const el = document.createElement('div')
  el.id = `lyt-toast-${id}`
  el.className = `lyt-toast lyt-toast--${instance.type} lyt-toast--${instance.position}`

  const iconMap: Record<string, string> = {
    success: '&#10003;',
    error: '&#10007;',
    warning: '&#9888;',
    info: '&#8505;',
  }

  el.innerHTML = `
    <span class="lyt-toast__icon">${iconMap[instance.type] || ''}</span>
    <span class="lyt-toast__message">${instance.message}</span>
  `

  container.appendChild(el)

  requestAnimationFrame(() => {
    el.classList.add('lyt-toast--visible')
  })

  if (instance.duration > 0) {
    instance.timer = setTimeout(() => {
      removeToast(instance)
    }, instance.duration)
  }

  toastQueue.push(instance)
  return instance
}

export const Toast = defineComponent({
  name: 'LytToast',

  props: {
    message: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'info',
      validator: (v: string) => ['success', 'error', 'warning', 'info'].includes(v),
    },
    duration: {
      type: Number,
      default: 3000,
    },
    position: {
      type: String,
      default: 'top',
      validator: (v: string) => ['top', 'center', 'bottom'].includes(v),
    },
  },

  setup(props) {
    const show = (options?: { message?: string; type?: string; duration?: number; position?: string }) => {
      return createToast({
        message: options?.message || props.message,
        type: options?.type || props.type,
        duration: options?.duration !== undefined ? options.duration : props.duration,
        position: options?.position || props.position,
      })
    }

    const success = (message: string, duration?: number) => show({ message, type: 'success', duration })
    const error = (message: string, duration?: number) => show({ message, type: 'error', duration })
    const warning = (message: string, duration?: number) => show({ message, type: 'warning', duration })
    const info = (message: string, duration?: number) => show({ message, type: 'info', duration })

    return { show, success, error, warning, info }
  },

  template: `<div></div>`,

  styles: `
    .lyt-toast-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 3000;
      display: flex;
      flex-direction: column;
    }
    .lyt-toast-container.lyt-toast-container--top { align-items: center; padding-top: 20px; }
    .lyt-toast-container.lyt-toast-container--center { align-items: center; justify-content: center; }
    .lyt-toast-container.lyt-toast-container--bottom { align-items: center; justify-content: flex-end; padding-bottom: 20px; }
    .lyt-toast {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: var(--lyt-radius-sm);
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-info);
      font-size: var(--lyt-font-size-base);
      box-shadow: var(--lyt-shadow-md);
      margin-bottom: 10px;
      opacity: 0;
      transform: translateY(-100%);
      transition: all 0.3s;
      pointer-events: auto;
    }
    .lyt-toast--visible { opacity: 1; transform: translateY(0); }
    .lyt-toast--center { transform: scale(0.8); }
    .lyt-toast--center.lyt-toast--visible { transform: scale(1); }
    .lyt-toast--bottom { transform: translateY(100%); }
    .lyt-toast--bottom.lyt-toast--visible { transform: translateY(0); }
    .lyt-toast--success { background-color: var(--lyt-color-bg); color: var(--lyt-color-success); }
    .lyt-toast--error { background-color: var(--lyt-color-bg); color: var(--lyt-color-danger); }
    .lyt-toast--warning { background-color: var(--lyt-color-bg); color: var(--lyt-color-warning); }
    .lyt-toast--info { background-color: var(--lyt-color-bg); color: var(--lyt-color-info); }
    .lyt-toast__icon { font-size: var(--lyt-font-size-lg); }
    .lyt-toast__message { line-height: 1.4; }
  `,
})

// 静态方法挂载
Toast.show = (options: { message: string; type?: string; duration?: number; position?: string }) =>
  createToast(options)
Toast.success = (message: string, duration?: number) =>
  createToast({ message, type: 'success', duration })
Toast.error = (message: string, duration?: number) =>
  createToast({ message, type: 'error', duration })
Toast.warning = (message: string, duration?: number) =>
  createToast({ message, type: 'warning', duration })
Toast.info = (message: string, duration?: number) =>
  createToast({ message, type: 'info', duration })
Toast.closeAll = () => {
  toastQueue.forEach((instance) => {
    if (instance.timer) clearTimeout(instance.timer)
    removeToast(instance)
  })
}
