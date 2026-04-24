/**
 * Empty 空状态
 * Props: description, image
 */

import { defineComponent } from '@lytjs/component'

export const Empty = defineComponent({
  name: 'LytEmpty',

  props: {
    description: {
      type: String,
      default: '暂无数据',
    },
    image: {
      type: String,
      default: '',
    },
  },

  setup(props, { slots }) {
    const hasImage = () => !!props.image

    return { props, hasImage, slots }
  },

  template: `
    <div class="lyt-empty">
      <div class="lyt-empty__image">
        <img v-if="hasImage()" :src="image" alt="empty" class="lyt-empty__image-img" />
        <div v-else class="lyt-empty__image-placeholder">
          <svg viewBox="0 0 200 200" width="120" height="120">
            <rect x="30" y="50" width="140" height="110" rx="8" fill="#f5f7fa" stroke="#e4e7ed" stroke-width="2"/>
            <circle cx="75" cy="95" r="16" fill="#e4e7ed"/>
            <path d="M50 140 Q75 110 100 130 Q125 110 150 140" fill="#e4e7ed"/>
            <circle cx="160" cy="60" r="20" fill="#f0f9eb" stroke="#e4e7ed" stroke-width="2"/>
            <path d="M152 60 L158 66 L168 54" stroke="#67c23a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <p class="lyt-empty__description" v-if="description">{{ description }}</p>
      <div class="lyt-empty__footer" v-if="slots.default">
        <slot></slot>
      </div>
    </div>
  `,

  styles: `
    .lyt-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      box-sizing: border-box;
    }
    .lyt-empty__image {
      margin-bottom: 16px;
    }
    .lyt-empty__image-img {
      width: 120px;
      height: 120px;
      object-fit: contain;
    }
    .lyt-empty__image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-empty__description {
      margin: 0;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-info);
      line-height: 1.5;
    }
    .lyt-empty__footer {
      margin-top: 16px;
    }
  `,
})
