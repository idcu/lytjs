/**
 * Notification 通知提示
 * Props: message, type, duration, position, title, closable
 * Events: close, click
 * Features: 自动消失, 位置(上下左右), 类型(成功/错误/警告/信息), 堆叠管理
 */

import { defineComponent } from '@lytjs/component'

interface NotificationInstance {
  id: number
  message: string
  title: string
  type: string
  position: string
  duration: number
  visible: boolean
  closable: boolean
  timer: ReturnType<typeof setTimeout> | null
  onClose?: () => void
}

let notificationId = 0
const notificationMap = new Map<string, NotificationInstance[]>()
let notificationContainer: HTMLDivElement | null = null

function getPositionKey(position: string): string {
  return position || 'top-right'
}

function getOrCreateContainer(): HTMLDivElement {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div')
    notificationContainer.className = 'lyt-notification-container'
    document.body.appendChild(notificationContainer)
  }
  return notificationContainer
}

function removeNotification(instance: NotificationInstance) {
  instance.visible = false
  const el = document.getElementById(`lyt-notification-${instance.id}`)
  if (el) {
    el.classList.remove('lyt-notification--visible')
    setTimeout(() => {
      el.remove()
      const posKey = getPositionKey(instance.position)
      const list = notificationMap.get(posKey)
      if (list) {
        const idx = list.indexOf(instance)
        if (idx > -1) list.splice(idx, 1)
        if (list.length === 0) notificationMap.delete(posKey)
      }
      // 清理空容器
      if (notificationContainer && notificationContainer.childNodes.length === 0) {
        notificationContainer.remove()
        notificationContainer = null
      }
    }, 300)
  }
  if (instance.onClose) instance.onClose()
}

function createNotification(options: {
  message: string
  title?: string
  type?: string
  duration?: number
  position?: string
  closable?: boolean
  onClose?: () => void
}): NotificationInstance {
  const id = ++notificationId
  const position = options.position || 'top-right'
  const instance: NotificationInstance = {
    id,
    message: options.message,
    title: options.title || '',
    type: options.type || 'info',
    position,
    duration: options.duration !== undefined ? options.duration : 4500,
    visible: true,
    closable: options.closable !== undefined ? options.closable : true,
    timer: null,
    onClose: options.onClose,
  }

  const container = getOrCreateContainer()
  const el = document.createElement('div')
  el.id = `lyt-notification-${id}`
  el.className = `lyt-notification lyt-notification--${instance.type} lyt-notification--${position}`

  const iconMap: Record<string, string> = {
    success: '&#10003;',
    error: '&#10007;',
    warning: '&#9888;',
    info: '&#8505;',
  }

  el.innerHTML = `
    <div class="lyt-notification__content">
      <span class="lyt-notification__icon">${iconMap[instance.type] || ''}</span>
      <div class="lyt-notification__body">
        <div class="lyt-notification__title" v-if="${instance.title}">${instance.title}</div>
        <div class="lyt-notification__message">${instance.message}</div>
      </div>
      <span class="lyt-notification__close" v-if="${instance.closable}">&times;</span>
    </div>
  `

  // 绑定关闭按钮
  const closeBtn = el.querySelector('.lyt-notification__close') as HTMLElement
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (instance.timer) clearTimeout(instance.timer)
      removeNotification(instance)
    })
  }

  container.appendChild(el)

  // 添加到 map
  const posKey = getPositionKey(position)
  let list = notificationMap.get(posKey)
  if (!list) {
    list = []
    notificationMap.set(posKey, list)
  }
  list.push(instance)

  requestAnimationFrame(() => {
    el.classList.add('lyt-notification--visible')
  })

  if (instance.duration > 0) {
    instance.timer = setTimeout(() => {
      removeNotification(instance)
    }, instance.duration)
  }

  return instance
}

export const Notification = defineComponent({
  name: 'LytNotification',

  props: {
    message: {
      type: String,
      default: '',
    },
    title: {
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
      default: 4500,
    },
    position: {
      type: String,
      default: 'top-right',
      validator: (v: string) => ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top', 'bottom'].includes(v),
    },
    closable: {
      type: Boolean,
      default: true,
    },
  },

  setup(props) {
    const show = (options?: { message?: string; title?: string; type?: string; duration?: number; position?: string; closable?: boolean }) => {
      return createNotification({
        message: options?.message || props.message,
        title: options?.title !== undefined ? options.title : props.title,
        type: options?.type || props.type,
        duration: options?.duration !== undefined ? options.duration : props.duration,
        position: options?.position || props.position,
        closable: options?.closable !== undefined ? options.closable : props.closable,
      })
    }

    const success = (message: string, title?: string, duration?: number) =>
      show({ message, title: title || '成功', type: 'success', duration })
    const error = (message: string, title?: string, duration?: number) =>
      show({ message, title: title || '错误', type: 'error', duration })
    const warning = (message: string, title?: string, duration?: number) =>
      show({ message, title: title || '警告', type: 'warning', duration })
    const info = (message: string, title?: string, duration?: number) =>
      show({ message, title: title || '提示', type: 'info', duration })

    return { show, success, error, warning, info }
  },

  template: `<div></div>`,

  styles: `
    .lyt-notification-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 3000;
    }
    .lyt-notification {
      position: fixed;
      display: flex;
      align-items: flex-start;
      width: 330px;
      padding: 14px 16px;
      border-radius: 6px;
      background-color: #fff;
      box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      opacity: 0;
      transition: all 0.3s;
      box-sizing: border-box;
    }
    .lyt-notification--visible { opacity: 1; }
    .lyt-notification--top-right { top: 16px; right: 16px; }
    .lyt-notification--top-left { top: 16px; left: 16px; }
    .lyt-notification--bottom-right { bottom: 16px; right: 16px; }
    .lyt-notification--bottom-left { bottom: 16px; left: 16px; }
    .lyt-notification--top { top: 16px; left: 50%; transform: translateX(-50%); }
    .lyt-notification--bottom { bottom: 16px; left: 50%; transform: translateX(-50%); }
    .lyt-notification__content { display: flex; align-items: flex-start; gap: 10px; width: 100%; }
    .lyt-notification__icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .lyt-notification--success .lyt-notification__icon { color: #67c23a; }
    .lyt-notification--error .lyt-notification__icon { color: #f56c6c; }
    .lyt-notification--warning .lyt-notification__icon { color: #e6a23c; }
    .lyt-notification--info .lyt-notification__icon { color: #909399; }
    .lyt-notification__body { flex: 1; min-width: 0; }
    .lyt-notification__title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 4px; line-height: 1.4; }
    .lyt-notification__message { font-size: 13px; color: #606266; line-height: 1.5; }
    .lyt-notification__close {
      cursor: pointer; font-size: 18px; color: #909399; flex-shrink: 0;
      transition: color 0.2s; line-height: 1; padding: 2px;
    }
    .lyt-notification__close:hover { color: #606266; }
    .lyt-notification--success { border-left: 4px solid #67c23a; }
    .lyt-notification--error { border-left: 4px solid #f56c6c; }
    .lyt-notification--warning { border-left: 4px solid #e6a23c; }
    .lyt-notification--info { border-left: 4px solid #909399; }
  `,
})

// 静态方法
Notification.show = (options: any) => createNotification(options)
Notification.success = (message: string, title?: string, duration?: number) =>
  createNotification({ message, title: title || '成功', type: 'success', duration })
Notification.error = (message: string, title?: string, duration?: number) =>
  createNotification({ message, title: title || '错误', type: 'error', duration })
Notification.warning = (message: string, title?: string, duration?: number) =>
  createNotification({ message, title: title || '警告', type: 'warning', duration })
Notification.info = (message: string, title?: string, duration?: number) =>
  createNotification({ message, title: title || '提示', type: 'info', duration })
Notification.closeAll = () => {
  for (const [, list] of notificationMap) {
    list.forEach((instance) => {
      if (instance.timer) clearTimeout(instance.timer)
      removeNotification(instance)
    })
  }
  notificationMap.clear()
}
