/**
 * Timeline 时间线
 * Props: mode(left/alternate/right), pending, reverse
 * Slots: default (TimelineItem 子项)
 */

import { defineComponent } from '@lytjs/component';
import { computed } from '@lytjs/reactivity';

export const Timeline = defineComponent({
  name: 'LytTimeline',

  props: {
    mode: {
      type: String,
      default: 'left',
      validator: (v: string) => ['left', 'alternate', 'right'].includes(v),
    },
    pending: {
      type: Boolean,
      default: false,
    },
    reverse: {
      type: Boolean,
      default: false,
    },
    items: {
      type: Array as () => Array<{
        color?: string;
        dot?: string;
        label?: string;
        content: string;
        time?: string;
      }>,
      default: () => [],
    },
  },

  setup(props, { slots }) {
    const getItems = () => {
      const items = [...props.items];
      if (props.reverse) items.reverse();
      return items;
    };

    const getItemPosition = (index: number) => {
      if (props.mode === 'left') return 'left';
      if (props.mode === 'right') return 'right';
      return index % 2 === 0 ? 'left' : 'right';
    };

    const getDotColor = (item: any) => {
      if (item.color) return item.color;
      return 'var(--lyt-color-primary)';
    };

    return { getItems, getItemPosition, getDotColor, slots };
  },

  template: `
    <div class="lyt-timeline lyt-timeline--{mode} {pending ? 'lyt-timeline--pending' : ''}">
      <slot>
        <div
          v-for="(item, index) in getItems()"
          class="lyt-timeline__item lyt-timeline__item--{getItemPosition(index)}"
        >
          <div class="lyt-timeline__tail" v-if="index < getItems().length - 1 || pending"></div>
          <div class="lyt-timeline__dot" :style="{ borderColor: getDotColor(item), backgroundColor: getDotColor(item) }">
            <span class="lyt-timeline__dot-custom" v-if="item.dot" v-html="item.dot"></span>
          </div>
          <div class="lyt-timeline__content">
            <div class="lyt-timeline__label" v-if="item.label">{{ item.label }}</div>
            <div class="lyt-timeline__time" v-if="item.time">{{ item.time }}</div>
            <div class="lyt-timeline__text">{{ item.content }}</div>
          </div>
        </div>
        <div class="lyt-timeline__item lyt-timeline__item--pending" v-if="pending">
          <div class="lyt-timeline__dot lyt-timeline__dot--pending">
            <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
              <path d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32zm-448-192a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H96a32 32 0 0 1-32-32zm640 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736a32 32 0 0 1-32-32z"/>
            </svg>
          </div>
          <div class="lyt-timeline__content">
            <div class="lyt-timeline__text">进行中...</div>
          </div>
        </div>
      </slot>
    </div>
  `,

  styles: `
    .lyt-timeline {
      box-sizing: border-box;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .lyt-timeline__item {
      display: flex;
      position: relative;
      padding-bottom: 20px;
    }
    .lyt-timeline__item:last-child { padding-bottom: 0; }
    .lyt-timeline__tail {
      position: absolute;
      left: 7px;
      top: 16px;
      height: calc(100% - 6px);
      width: 2px;
      background-color: var(--lyt-color-border);
    }
    .lyt-timeline__dot {
      position: relative;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--lyt-color-primary);
      background-color: var(--lyt-color-bg);
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-timeline__dot-custom {
      font-size: 10px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-timeline__dot--pending {
      border-color: var(--lyt-color-primary);
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-primary);
      animation: lyt-timeline-dot-spin 1s linear infinite;
    }
    @keyframes lyt-timeline-dot-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .lyt-timeline__content {
      flex: 1;
      padding-left: 12px;
      min-width: 0;
    }
    .lyt-timeline__label {
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-info);
      margin-bottom: 4px;
    }
    .lyt-timeline__time {
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-info);
      margin-bottom: 4px;
    }
    .lyt-timeline__text {
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      line-height: 1.6;
    }
    .lyt-timeline--alternate .lyt-timeline__item--left .lyt-timeline__content {
      text-align: left;
      padding-left: 12px;
      padding-right: 40px;
    }
    .lyt-timeline--alternate .lyt-timeline__item--right .lyt-timeline__content {
      text-align: right;
      padding-left: 40px;
      padding-right: 12px;
      order: -1;
    }
    .lyt-timeline--alternate .lyt-timeline__item--right .lyt-timeline__tail {
      left: auto;
      right: 7px;
    }
    .lyt-timeline--alternate .lyt-timeline__item--right .lyt-timeline__dot {
      order: 1;
    }
    .lyt-timeline--right .lyt-timeline__content {
      text-align: right;
      padding-left: 40px;
      padding-right: 12px;
      order: -1;
    }
    .lyt-timeline--right .lyt-timeline__tail {
      left: auto;
      right: 7px;
    }
    .lyt-timeline--right .lyt-timeline__dot {
      order: 1;
    }
  `,
});
