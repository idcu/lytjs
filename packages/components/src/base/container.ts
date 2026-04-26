/**
 * Container 容器
 * Props: maxWidth, padding, center
 */

import { defineComponent } from '@lytjs/component';

export const Container = defineComponent({
  name: 'LytContainer',

  props: {
    maxWidth: {
      type: String,
      default: '1200px',
    },
    padding: {
      type: String,
      default: '0',
    },
    center: {
      type: Boolean,
      default: true,
    },
  },

  setup(props, { slots }) {
    const containerStyle = () => {
      const style: Record<string, string> = {
        maxWidth: props.maxWidth,
        padding: props.padding,
      };
      if (props.center) {
        style.marginLeft = 'auto';
        style.marginRight = 'auto';
      }
      return style;
    };

    return { containerStyle, slots };
  },

  template: `
    <div class="lyt-container" :style="containerStyle()">
      <slot></slot>
    </div>
  `,

  styles: `
    .lyt-container {
      box-sizing: border-box;
      width: 100%;
    }
  `,
});
