/**
 * Result 结果页
 * Props: status(success/error/info/warning/404/403/500), title, subTitle, icon
 * Slots: default, extra, icon
 */

import { defineComponent } from '@lytjs/component';

export const Result = defineComponent({
  name: 'LytResult',

  props: {
    status: {
      type: String,
      default: 'info',
      validator: (v: string) => ['success', 'error', 'info', 'warning', '404', '403', '500'].includes(v),
    },
    title: {
      type: String,
      default: '',
    },
    subTitle: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
  },

  setup(props, { slots }) {
    const defaultTitle = () => {
      const titles: Record<string, string> = {
        success: '操作成功',
        error: '操作失败',
        info: '信息提示',
        warning: '警告提示',
        '404': '404',
        '403': '403',
        '500': '500',
      };
      return titles[props.status] || '信息提示';
    };

    const defaultSubTitle = () => {
      const subtitles: Record<string, string> = {
        success: '您的操作已成功完成',
        error: '操作过程中发生了错误',
        info: '这是一条提示信息',
        warning: '请注意以下事项',
        '404': '抱歉，您访问的页面不存在',
        '403': '抱歉，您无权访问此页面',
        '500': '抱歉，服务器出了点问题',
      };
      return subtitles[props.status] || '';
    };

    const defaultIcon = () => {
      const icons: Record<string, string> = {
        success: '&#10003;',
        error: '&#10007;',
        info: '&#8505;',
        warning: '&#9888;',
        '404': '&#404;',
        '403': '&#403;',
        '500': '&#500;',
      };
      return icons[props.status] || '&#8505;';
    };

    return { defaultTitle, defaultSubTitle, defaultIcon, slots };
  },

  template: `
    <div class="lyt-result lyt-result--{status}">
      <div class="lyt-result__icon">
        <slot name="icon">
          <span class="lyt-result__icon-inner" v-if="icon">{{ icon }}</span>
          <span class="lyt-result__icon-default" v-else v-html="defaultIcon()"></span>
        </slot>
      </div>
      <div class="lyt-result__title">{{ title || defaultTitle() }}</div>
      <div class="lyt-result__subtitle" v-if="subTitle || defaultSubTitle()">{{ subTitle || defaultSubTitle() }}</div>
      <div class="lyt-result__content">
        <slot></slot>
      </div>
      <div class="lyt-result__extra" v-if="slots.extra">
        <slot name="extra"></slot>
      </div>
    </div>
  `,

  styles: `
    .lyt-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 32px;
      text-align: center;
      box-sizing: border-box;
    }
    .lyt-result__icon {
      margin-bottom: 24px;
    }
    .lyt-result__icon-inner {
      font-size: 72px;
      line-height: 1;
    }
    .lyt-result__icon-default {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      font-size: 36px;
      font-weight: 700;
      border-radius: 50%;
    }
    .lyt-result--success .lyt-result__icon-default {
      color: #fff;
      background-color: var(--lyt-color-success);
    }
    .lyt-result--error .lyt-result__icon-default {
      color: #fff;
      background-color: var(--lyt-color-danger);
    }
    .lyt-result--info .lyt-result__icon-default {
      color: #fff;
      background-color: var(--lyt-color-info);
    }
    .lyt-result--warning .lyt-result__icon-default {
      color: #fff;
      background-color: var(--lyt-color-warning);
    }
    .lyt-result--404 .lyt-result__icon-default,
    .lyt-result--403 .lyt-result__icon-default,
    .lyt-result--500 .lyt-result__icon-default {
      color: var(--lyt-color-muted);
      background-color: var(--lyt-color-bg);
      border: 2px solid var(--lyt-color-border);
    }
    .lyt-result__title {
      font-size: 24px;
      font-weight: 600;
      color: var(--lyt-color-fg);
      margin-bottom: 8px;
    }
    .lyt-result__subtitle {
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-info);
      margin-bottom: 24px;
    }
    .lyt-result__content {
      margin-bottom: 24px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
    .lyt-result__extra {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  `,
});
