/**
 * @lytjs/ui - Message 组件
 *
 * 消息提示组件，用于展示操作反馈信息
 */

export type MessageType = 'success' | 'warning' | 'info' | 'error';

export interface MessageOptions {
  message: string;
  type?: MessageType;
  duration?: number;
  showClose?: boolean;
  onClose?: () => void;
}

export interface MessageInstance {
  id: number;
  close: () => void;
}

let messageId = 0;
const instances: Map<number, { el: HTMLElement; close: () => void }> = new Map();

function createMessage(options: MessageOptions): MessageInstance {
  const id = ++messageId;
  const { message, type = 'info', duration = 3000, showClose = false, onClose } = options;

  const container = document.createElement('div');
  container.className = 'lyt-message-container';

  const iconMap: Record<MessageType, string> = {
    success: '✓',
    warning: '⚠',
    info: 'ℹ',
    error: '✕',
  };

  const icon = iconMap[type];
  const iconClass = `lyt-message__icon lyt-message__icon--${type}`;

  let closeBtn = '';
  if (showClose) {
    closeBtn = '<span class="lyt-message__close">×</span>';
  }

  container.innerHTML = `
    <div class="lyt-message lyt-message--${type}">
      <span class="${iconClass}">${icon}</span>
      <span class="lyt-message__content">${message}</span>
      ${closeBtn}
    </div>
  `;

  document.body.appendChild(container);

  const close = () => {
    const instance = instances.get(id);
    if (instance) {
      instance.el.classList.add('lyt-message--fade-out');
      setTimeout(() => {
        document.body.removeChild(container);
        instances.delete(id);
        onClose?.();
      }, 300);
    }
  };

  instances.set(id, { el: container, close });

  const closeEl = container.querySelector('.lyt-message__close');
  if (closeEl) {
    closeEl.addEventListener('click', close);
  }

  if (duration > 0) {
    setTimeout(close, duration);
  }

  return {
    id,
    close,
  };
}

export const Message = {
  success(message: string, options?: Partial<MessageOptions>): MessageInstance {
    return createMessage({ message, type: 'success', ...options });
  },

  warning(message: string, options?: Partial<MessageOptions>): MessageInstance {
    return createMessage({ message, type: 'warning', ...options });
  },

  info(message: string, options?: Partial<MessageOptions>): MessageInstance {
    return createMessage({ message, type: 'info', ...options });
  },

  error(message: string, options?: Partial<MessageOptions>): MessageInstance {
    return createMessage({ message, type: 'error', ...options });
  },

  close(id: number): void {
    const instance = instances.get(id);
    if (instance) {
      instance.close();
    }
  },

  closeAll(): void {
    instances.forEach((instance) => {
      instance.close();
    });
  },
};

export default Message;
