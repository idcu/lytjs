/**
 * Skeleton 骨架屏
 * Props: active, loading, rows(1-10), avatar, paragraph, title, round
 */

import { defineComponent } from '@lytjs/component';

export const Skeleton = defineComponent({
  name: 'LytSkeleton',

  props: {
    active: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: true,
    },
    rows: {
      type: Number,
      default: 3,
      validator: (v: number) => v >= 1 && v <= 10,
    },
    avatar: {
      type: Boolean,
      default: false,
    },
    paragraph: {
      type: Boolean,
      default: true,
    },
    title: {
      type: Boolean,
      default: true,
    },
    round: {
      type: Boolean,
      default: false,
    },
    avatarSize: {
      type: String,
      default: '40px',
    },
  },

  setup(props, { slots }) {
    const getRows = () => {
      const rows: number[] = [];
      for (let i = 0; i < props.rows; i++) {
        rows.push(i);
      }
      return rows;
    };

    const isLastRow = (index: number) => {
      return index === props.rows - 1;
    };

    return { getRows, isLastRow, slots };
  },

  template: `
    <div class="lyt-skeleton {active ? 'lyt-skeleton--active' : ''} {round ? 'lyt-skeleton--round' : ''}">
      <template v-if="loading">
        <div class="lyt-skeleton__content">
          <div class="lyt-skeleton__avatar" v-if="avatar" :style="{ width: avatarSize, height: avatarSize }"></div>
          <div class="lyt-skeleton__right">
            <div class="lyt-skeleton__title" v-if="title"></div>
            <div class="lyt-skeleton__paragraph" v-if="paragraph">
              <div
                v-for="(row, index) in getRows()"
                class="lyt-skeleton__row {isLastRow(index) ? 'lyt-skeleton__row--last' : ''}"
              ></div>
            </div>
          </div>
        </div>
      </template>
      <slot v-else></slot>
    </div>
  `,

  styles: `
    .lyt-skeleton {
      box-sizing: border-box;
    }
    .lyt-skeleton__content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .lyt-skeleton__avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      background-color: var(--lyt-color-bg);
      border-radius: 50%;
    }
    .lyt-skeleton--round .lyt-skeleton__avatar {
      border-radius: var(--lyt-radius-sm);
    }
    .lyt-skeleton__right {
      flex: 1;
      min-width: 0;
    }
    .lyt-skeleton__title {
      height: 16px;
      width: 40%;
      background-color: var(--lyt-color-bg);
      border-radius: var(--lyt-radius-sm);
      margin-bottom: 12px;
    }
    .lyt-skeleton__paragraph {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .lyt-skeleton__row {
      height: 14px;
      width: 100%;
      background-color: var(--lyt-color-bg);
      border-radius: var(--lyt-radius-sm);
    }
    .lyt-skeleton__row--last {
      width: 60%;
    }
    .lyt-skeleton--active .lyt-skeleton__avatar,
    .lyt-skeleton--active .lyt-skeleton__title,
    .lyt-skeleton--active .lyt-skeleton__row {
      background: linear-gradient(90deg, var(--lyt-color-bg) 25%, var(--lyt-color-border) 37%, var(--lyt-color-bg) 63%);
      background-size: 400% 100%;
      animation: lyt-skeleton-loading 1.4s ease infinite;
    }
    @keyframes lyt-skeleton-loading {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `,
});
