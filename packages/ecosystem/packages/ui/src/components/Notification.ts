/**
 * @lytjs/ui - Notification 组件
 *
 * 通知组件，支持多位置弹出、停留时长、手动关闭、堆叠管理功能，适配主题切换
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { NotificationSetupProps } from './types';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  duration: number;
  position: string;
  showClose: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

class NotificationManager {
  static notifications = signal<NotificationItem[]>([]);
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
    const notification: NotificationItem = {
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

const getIcon = (type: string): string => {
  const icons: Record<string, string> = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ',
  };
  return icons[type] || icons['info'] || 'ℹ';
};

export const Notification = defineComponent({
  name: 'LytNotification',

  props: {
    position: { type: String, default: 'top-right' },
    class: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>) {
    const p = props as NotificationSetupProps;

    const getContainerClass = () => {
      const classes = ['lyt-notification-container', `lyt-notification-container--${p.position}`];
      if (p.class) classes.push(p.class as string);
      return classes.join(' ');
    };

    return () => {
      const notifications = NotificationManager.notifications();

      const children: VNode[] = notifications.map((notification) => {
        const notificationClass = [
          'lyt-notification',
          `lyt-notification--${notification.type}`,
          `lyt-notification--${notification.position}`,
        ].join(' ');

        const itemChildren: VNode[] = [
          createVNode('span', {
            class: 'lyt-notification__icon',
          }, [createVNode('span', {}, getIcon(notification.type))]),
        ];

        const contentChildren: VNode[] = [
          createVNode('div', { class: 'lyt-notification__title' }, [createVNode('span', {}, String(notification.title))]),
        ];

        if (notification.message) {
          contentChildren.push(createVNode('div', { class: 'lyt-notification__message' }, [createVNode('span', {}, String(notification.message))]));
        }

        itemChildren.push(createVNode('div', { class: 'lyt-notification__content' }, contentChildren));

        if (notification.showClose) {
          itemChildren.push(createVNode('button', {
            class: 'lyt-notification__close',
            onClick: () => NotificationManager.close(notification.id),
          }, [createVNode('span', {}, '×')]));
        }

        return createVNode('div', {
          class: notificationClass,
          key: notification.id,
        }, itemChildren);
      });

      return createVNode('div', { class: getContainerClass() }, children);
    };
  },
});

(Notification as Record<string, unknown>).open = NotificationManager.open.bind(NotificationManager);
(Notification as Record<string, unknown>).success = NotificationManager.success.bind(NotificationManager);
(Notification as Record<string, unknown>).warning = NotificationManager.warning.bind(NotificationManager);
(Notification as Record<string, unknown>).error = NotificationManager.error.bind(NotificationManager);
(Notification as Record<string, unknown>).info = NotificationManager.info.bind(NotificationManager);
(Notification as Record<string, unknown>).close = NotificationManager.close.bind(NotificationManager);
(Notification as Record<string, unknown>).closeAll = NotificationManager.closeAll.bind(NotificationManager);

export default Notification;
export { NotificationManager };
export type { NotificationProps, NotificationSlots, NotificationSetupProps } from './types';
