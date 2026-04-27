/**
 * Divider 分割线
 * Props: direction(horizontal/vertical), contentPosition(left/center/right), dashed
 */

import { defineComponent } from '@lytjs/component';

export const Divider = defineComponent({
  name: 'LytDivider',

  props: {
    direction: {
      type: String,
      default: 'horizontal',
      validator: (v: string) => ['horizontal', 'vertical'].includes(v),
    },
    contentPosition: {
      type: String,
      default: 'center',
      validator: (v: string) => ['left', 'center', 'right'].includes(v),
    },
    dashed: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { slots }) {
    return { props, slots };
  },

  template: `
    <div
      class="lyt-divider lyt-divider--{direction} {dashed ? 'lyt-divider--dashed' : ''} lyt-divider--text-{contentPosition}"
      v-if="direction === 'horizontal'"
    >
      <span class="lyt-divider__text" v-if="slots.default">
        <slot></slot>
      </span>
    </div>
    <div
      class="lyt-divider lyt-divider--vertical {dashed ? 'lyt-divider--dashed' : ''}"
      v-else
    ></div>
  `,

  styles: `
    .lyt-divider {
      box-sizing: border-box;
      margin: 0;
    }
    .lyt-divider--horizontal {
      display: flex;
      align-items: center;
      margin: 16px 0;
      border-top: 1px solid var(--lyt-color-border);
    }
    .lyt-divider--horizontal.lyt-divider--dashed {
      border-top: 1px dashed var(--lyt-color-border);
    }
    .lyt-divider--horizontal.lyt-divider--dashed::before,
    .lyt-divider--horizontal.lyt-divider--dashed::after {
      border-top-style: dashed;
    }
    .lyt-divider--vertical {
      display: inline-block;
      width: 1px;
      height: 1em;
      margin: 0 8px;
      vertical-align: middle;
      border-left: 1px solid var(--lyt-color-border);
    }
    .lyt-divider--vertical.lyt-divider--dashed {
      border-left: 1px dashed var(--lyt-color-border);
    }
    .lyt-divider__text {
      display: inline-block;
      padding: 0 16px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      white-space: nowrap;
    }
    .lyt-divider--horizontal::before,
    .lyt-divider--horizontal::after {
      content: '';
      flex: 1;
      border-top: 1px solid var(--lyt-color-border);
    }
    .lyt-divider--text-left::before { display: none; }
    .lyt-divider--text-right::after { display: none; }
  `,
});
