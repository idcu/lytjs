/**
 * @lytjs/ui - Notification 组件
 *
 * 通知组件，支持多位置弹出、停留时长、手动关闭、堆叠管理功能，适配主题切换
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

// 通知管理器
class NotificationManager {
  static notifications = signal<Array<{ id: number; type: string; title: string; message: string; duration: number; position: string; showClose: boolean; onClose?: () => void; onOpen?: () => void }>>([]);
  static nextId = 1;

  static open(options: {
    type?: string;
    title: string;
    message?: string;
    duration?: number;
    position?: string;
    showClose?: boolean;
    onClose?: () => void;
    onOpen?: () => void;
  }) {
    const id = this.nextId++;
    const notification = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message || '',
      duration: options.duration !== undefined ? options.duration : 4500,
      position: options.position || 'top-right',
      showClose: options.showClose !== undefined ? options.showClose : true,
      onClose: options.onClose,
      onOpen: options.onOpen,
    };

    this.notifications.set([...this.notifications(), notification]);
    
    if (notification.onOpen) {
      notification.onOpen();
    }

    // 自动关闭
    if (notification.duration > 0) {
      setTimeout(() => {
        this.close(id);
      }, notification.duration);
    }

    return id;
  }

  static close(id: number) {
    const notification = this.notifications().find(n => n.id === id);
    if (notification && notification.onClose) {
      notification.onClose();
    }
    this.notifications.set(this.notifications().filter(n => n.id !== id));
  }

  static success(options: string | { title: string; message?: string; duration?: number; position?: string; showClose?: boolean; onClose?: () => void; onOpen?: () => void }) {
    if (typeof options === 'string') {
      return this.open({ type: 'success', title: options, message: '' });
    }
    return this.open({ ...options, type: 'success' });
  }

  static warning(options: string | { title: string; message?: string; duration?: number; position?: string; showClose?: boolean; onClose?: () => void; onOpen?: () => void }) {
    if (typeof options === 'string') {
      return this.open({ type: 'warning', title: options, message: '' });
    }
    return this.open({ ...options, type: 'warning' });
  }

  static error(options: string | { title: string; message?: string; duration?: number; position?: string; showClose?: boolean; onClose?: () => void; onOpen?: () => void }) {
    if (typeof options === 'string') {
      return this.open({ type: 'error', title: options, message: '' });
    }
    return this.open({ ...options, type: 'error' });
  }

  static info(options: string | { title: string; message?: string; duration?: number; position?: string; showClose?: boolean; onClose?: () => void; onOpen?: () => void }) {
    if (typeof options === 'string') {
      return this.open({ type: 'info', title: options, message: '' });
    }
    return this.open({ ...options, type: 'info' });
  }

  static closeAll() {
    const current = this.notifications();
    current.forEach(n => {
      if (n.onClose) n.onClose();
    });
    this.notifications.set([]);
  }
}

// 获取图标
const getIcon = (type: string) => {
  const icons: Record<string, string> = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ',
  };
  return icons[type] || icons.info;
};

// 通知组件
export const Notification = defineComponent({
  name: 'LytNotification',

  props: {
    position: { type: String, default: 'top-right' },
    class: { type: String, default: '' },
  },

  setup(props: any) {
    // 生成容器类名
    const getContainerClass = () => {
      const classes = ['lyt-notification-container', `lyt-notification-container--${props.position}`];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const notifications = NotificationManager.notifications();
      
      const children = notifications.map((notification) => {
        const notificationClass = [
          'lyt-notification',
          `lyt-notification--${notification.type}`,
          `lyt-notification--${notification.position}`,
        ].join(' ');

        return createVNode('div', { 
          class: notificationClass,
          key: notification.id,
        }, [
          // 图标
          createVNode('span', { 
            class: 'lyt-notification__icon' 
          }, getIcon(notification.type)),
          
          // 内容
          createVNode('div', { class: 'lyt-notification__content' }, [
            createVNode('div', { class: 'lyt-notification__title' }, notification.title),
            notification.message ? createVNode('div', { class: 'lyt-notification__message' }, notification.message) : null,
          ]),
          
          // 关闭按钮
          notification.showClose ? createVNode('button', { 
            class: 'lyt-notification__close',
            onClick: () => NotificationManager.close(notification.id),
          }, '×') : null,
        ]);
      });

      return createVNode('div', { class: getContainerClass() }, children);
    };
  },
});

// 导出快捷方法
Notification.open = NotificationManager.open.bind(NotificationManager);
Notification.success = NotificationManager.success.bind(NotificationManager);
Notification.warning = NotificationManager.warning.bind(NotificationManager);
Notification.error = NotificationManager.error.bind(NotificationManager);
Notification.info = NotificationManager.info.bind(NotificationManager);
Notification.close = NotificationManager.close.bind(NotificationManager);
Notification.closeAll = NotificationManager.closeAll.bind(NotificationManager);

export default Notification;
export { NotificationManager };
