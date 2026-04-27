/**
 * Descriptions 描述列表
 * Props: title, bordered, column(1-4), size(small/default/large), layout(horizontal/vertical)
 */

import { defineComponent } from '@lytjs/component';

export const Descriptions = defineComponent({
  name: 'LytDescriptions',

  props: {
    title: {
      type: String,
      default: '',
    },
    bordered: {
      type: Boolean,
      default: false,
    },
    column: {
      type: Number,
      default: 3,
      validator: (v: number) => v >= 1 && v <= 4,
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default', 'large'].includes(v),
    },
    layout: {
      type: String,
      default: 'horizontal',
      validator: (v: string) => ['horizontal', 'vertical'].includes(v),
    },
    items: {
      type: Array as () => Array<{
        label: string;
        value: string | number;
        span?: number;
      }>,
      default: () => [],
    },
  },

  setup(props, { slots }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getColSpan = (item: any) => {
      return item.span || 1;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCellStyle = (item: any) => {
      const span = getColSpan(item);
      if (span > 1) {
        return { gridColumn: `span ${span * 2}` };
      }
      return {};
    };

    return { getColSpan, getCellStyle, slots };
  },

  template: `
    <div class="lyt-descriptions lyt-descriptions--{size} lyt-descriptions--{layout} {bordered ? 'lyt-descriptions--bordered' : ''}">
      <div class="lyt-descriptions__title" v-if="title">{{ title }}</div>
      <div class="lyt-descriptions__body">
        <div class="lyt-descriptions__row" :style="{ gridTemplateColumns: 'repeat(' + (column * 2) + ', 1fr)' }">
          <slot>
            <template v-for="item in items">
              <div
                class="lyt-descriptions__label"
                :style="getCellStyle(item)"
              >{{ item.label }}</div>
              <div
                class="lyt-descriptions__item"
                :style="getCellStyle(item)"
              >{{ item.value }}</div>
            </template>
          </slot>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-descriptions {
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
    .lyt-descriptions__title {
      font-size: var(--lyt-font-size-lg);
      font-weight: 600;
      color: var(--lyt-color-fg);
      margin-bottom: 16px;
    }
    .lyt-descriptions__body {
      width: 100%;
    }
    .lyt-descriptions__row {
      display: grid;
      width: 100%;
      gap: 0;
    }
    .lyt-descriptions__label {
      padding: 12px 16px;
      color: var(--lyt-color-info);
      font-weight: 500;
      background-color: var(--lyt-color-bg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lyt-descriptions__item {
      padding: 12px 16px;
      color: var(--lyt-color-muted);
      word-break: break-word;
    }
    .lyt-descriptions--small .lyt-descriptions__label,
    .lyt-descriptions--small .lyt-descriptions__item {
      padding: 8px 12px;
      font-size: var(--lyt-font-size-sm);
    }
    .lyt-descriptions--large .lyt-descriptions__label,
    .lyt-descriptions--large .lyt-descriptions__item {
      padding: 16px 20px;
      font-size: var(--lyt-font-size-lg);
    }
    .lyt-descriptions--bordered .lyt-descriptions__label,
    .lyt-descriptions--bordered .lyt-descriptions__item {
      border: 1px solid var(--lyt-color-border);
    }
    .lyt-descriptions--bordered .lyt-descriptions__label {
      background-color: var(--lyt-color-bg);
    }
    .lyt-descriptions--vertical .lyt-descriptions__row {
      grid-template-columns: 1fr;
    }
    .lyt-descriptions--vertical .lyt-descriptions__label,
    .lyt-descriptions--vertical .lyt-descriptions__item {
      display: block;
    }
  `,
});
