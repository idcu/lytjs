/**
 * Card 卡片容器
 * Props: title, bordered, shadow(never/small/medium/always), hoverable, loading, size(small/default/large)
 * Slots: default, header, extra, cover, actions
 */

import { defineComponent } from '@lytjs/component';

export const Card = defineComponent({
  name: 'LytCard',

  props: {
    title: {
      type: String,
      default: '',
    },
    bordered: {
      type: Boolean,
      default: true,
    },
    shadow: {
      type: String,
      default: 'never',
      validator: (v: string) => ['never', 'small', 'medium', 'always'].includes(v),
    },
    hoverable: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default', 'large'].includes(v),
    },
  },

  setup(props, { slots }) {
    const hasHeader = () => {
      return props.title || slots.header || slots.extra;
    };

    const hasCover = () => {
      return !!slots.cover;
    };

    const hasActions = () => {
      return !!slots.actions;
    };

    return { hasHeader, hasCover, hasActions, slots };
  },

  template: `
    <div class="lyt-card lyt-card--{size} lyt-card--shadow-{shadow} {bordered ? 'lyt-card--bordered' : ''} {hoverable ? 'lyt-card--hoverable' : ''}">
      <div class="lyt-card__cover" v-if="hasCover() && !loading">
        <slot name="cover"></slot>
      </div>
      <div class="lyt-card__header" v-if="hasHeader() && !loading">
        <div class="lyt-card__header-content">
          <slot name="header">
            <span class="lyt-card__title">{{ title }}</span>
          </slot>
        </div>
        <div class="lyt-card__extra" v-if="slots.extra">
          <slot name="extra"></slot>
        </div>
      </div>
      <div class="lyt-card__body {loading ? 'lyt-card__body--loading' : ''}">
        <div class="lyt-card__loading" v-if="loading">
          <div class="lyt-card__loading-spinner">
            <svg viewBox="0 0 1024 1024" class="lyt-card__loading-icon" width="24" height="24">
              <path d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32zm-448-192a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H96a32 32 0 0 1-32-32zm640 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736a32 32 0 0 1-32-32z"/>
            </svg>
          </div>
          <span class="lyt-card__loading-text">加载中...</span>
        </div>
        <slot v-else></slot>
      </div>
      <div class="lyt-card__actions" v-if="hasActions() && !loading">
        <slot name="actions"></slot>
      </div>
    </div>
  `,

  styles: `
    .lyt-card {
      box-sizing: border-box;
      background-color: var(--lyt-color-card);
      border-radius: var(--lyt-radius-sm);
      transition: all 0.3s;
      overflow: hidden;
    }
    .lyt-card--bordered {
      border: 1px solid var(--lyt-color-border);
    }
    .lyt-card--shadow-small {
      box-shadow: var(--lyt-shadow-sm);
    }
    .lyt-card--shadow-medium {
      box-shadow: var(--lyt-shadow-md);
    }
    .lyt-card--shadow-always {
      box-shadow: var(--lyt-shadow-md);
    }
    .lyt-card--hoverable:hover {
      box-shadow: var(--lyt-shadow-lg);
      transform: translateY(-2px);
      cursor: pointer;
    }
    .lyt-card--small .lyt-card__header { padding: 10px 16px; }
    .lyt-card--small .lyt-card__body { padding: 12px 16px; }
    .lyt-card--large .lyt-card__header { padding: 18px 24px; }
    .lyt-card--large .lyt-card__body { padding: 20px 24px; }
    .lyt-card__cover {
      overflow: hidden;
    }
    .lyt-card__cover img {
      width: 100%;
      display: block;
    }
    .lyt-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--lyt-color-border);
    }
    .lyt-card__header-content {
      flex: 1;
      overflow: hidden;
    }
    .lyt-card__title {
      font-size: var(--lyt-font-size-lg);
      font-weight: 600;
      color: var(--lyt-color-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lyt-card__extra {
      flex-shrink: 0;
      margin-left: 16px;
    }
    .lyt-card__body {
      padding: 16px 20px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
    .lyt-card__body--loading {
      min-height: 100px;
    }
    .lyt-card__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px 0;
    }
    .lyt-card__loading-spinner {
      display: inline-flex;
      align-items: center;
    }
    .lyt-card__loading-icon {
      animation: lyt-spin 1s linear infinite;
      color: var(--lyt-color-primary);
    }
    .lyt-card__loading-text {
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-info);
    }
    @keyframes lyt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .lyt-card__actions {
      display: flex;
      align-items: center;
      border-top: 1px solid var(--lyt-color-border);
    }
    .lyt-card__actions > * {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 0;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      cursor: pointer;
      transition: color 0.3s;
      border-right: 1px solid var(--lyt-color-border);
    }
    .lyt-card__actions > *:last-child {
      border-right: none;
    }
    .lyt-card__actions > *:hover {
      color: var(--lyt-color-primary);
    }
  `,
});
