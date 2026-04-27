/**
 * Rate 评分
 * Props: count(1-10), value, allowHalf, allowClear, disabled, color, size(small/default/large)
 * Events: change, hoverChange
 */

import { defineComponent } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Rate = defineComponent({
  name: 'LytRate',

  props: {
    count: {
      type: Number,
      default: 5,
      validator: (v: number) => v >= 1 && v <= 10,
    },
    value: {
      type: Number,
      default: 0,
    },
    allowHalf: {
      type: Boolean,
      default: false,
    },
    allowClear: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default', 'large'].includes(v),
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      currentValue: props.value,
      hoverValue: -1,
    });

    const getStars = () => {
      const stars: number[] = [];
      for (let i = 1; i <= props.count; i++) {
        stars.push(i);
      }
      return stars;
    };

    const getStarClass = (index: number) => {
      const displayValue = state.hoverValue > 0 ? state.hoverValue : state.currentValue;
      if (props.allowHalf) {
        if (displayValue >= index) return 'lyt-rate__star--full';
        if (displayValue >= index - 0.5) return 'lyt-rate__star--half';
      } else {
        if (displayValue >= index) return 'lyt-rate__star--full';
      }
      return '';
    };

    const handleMouseMove = (e: MouseEvent, index: number) => {
      if (props.disabled) return;
      if (props.allowHalf) {
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        if (e.clientX - rect.left <= halfWidth) {
          state.hoverValue = index - 0.5;
        } else {
          state.hoverValue = index;
        }
      } else {
        state.hoverValue = index;
      }
      emit('hoverChange', state.hoverValue);
    };

    const handleMouseLeave = () => {
      state.hoverValue = -1;
      emit('hoverChange', state.currentValue);
    };

    const handleClick = (e: MouseEvent, index: number) => {
      if (props.disabled) return;
      let newValue: number;
      if (props.allowHalf) {
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        newValue = e.clientX - rect.left <= halfWidth ? index - 0.5 : index;
      } else {
        newValue = index;
      }

      if (props.allowClear && newValue === state.currentValue) {
        newValue = 0;
      }

      state.currentValue = newValue;
      emit('change', newValue);
    };

    const starStyle = () => {
      if (props.color) {
        return { '--lyt-rate-color': props.color } as Record<string, string>;
      }
      return {};
    };

    watch(() => props.value, (val: any) => {
      state.currentValue = val;
    });

    return { state, getStars, getStarClass, handleMouseMove, handleMouseLeave, handleClick, starStyle };
  },

  template: `
    <div
      class="lyt-rate lyt-rate--{size} {disabled ? 'lyt-rate--disabled' : ''}"
      :style="starStyle()"
      @mouseleave="handleMouseLeave"
    >
      <div
        v-for="star in getStars()"
        class="lyt-rate__star {getStarClass(star)}"
        @mousemove="handleMouseMove($event, star)"
        @click="handleClick($event, star)"
      >
        <svg viewBox="0 0 1024 1024" width="1em" height="1em">
          <path d="M908.1 353.1l-253.9-36.9L541.2 85.8c-3.1-6.3-8.2-11.4-14.5-14.5-15.8-7.8-35-1.3-42.9 14.5L370.8 316.2l-253.9 36.9c-7 1-13.4 4.3-18.3 9.3a32.05 32.05 0 0 0 .6 45.3l183.7 179.1-43.4 252.9a31.95 31.95 0 0 0 46.4 33.7L512 754l227.1 119.4c6.2 3.3 13.4 4.4 20.3 3.2 17.4-3 29.1-19.5 26.1-36.9l-43.4-252.9 183.7-179.1c5-4.9 8.3-11.3 9.3-18.3 2.7-17.5-9.5-33.7-27-36.3z"/>
        </svg>
      </div>
    </div>
  `,

  styles: `
    .lyt-rate {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      box-sizing: border-box;
    }
    .lyt-rate--small { font-size: 16px; }
    .lyt-rate--default { font-size: 24px; }
    .lyt-rate--large { font-size: 32px; }
    .lyt-rate__star {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      color: var(--lyt-color-border);
      transition: transform 0.2s, color 0.2s;
      position: relative;
    }
    .lyt-rate__star:hover {
      transform: scale(1.1);
    }
    .lyt-rate__star--full {
      color: var(--lyt-rate-color, var(--lyt-color-warning));
    }
    .lyt-rate__star--half {
      color: var(--lyt-rate-color, var(--lyt-color-warning));
    }
    .lyt-rate--disabled .lyt-rate__star {
      cursor: not-allowed;
      opacity: 0.7;
    }
    .lyt-rate--disabled .lyt-rate__star:hover {
      transform: none;
    }
  `,
});
