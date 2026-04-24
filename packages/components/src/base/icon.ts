/**
 * Icon 图标
 * Props: name(图标名), size, color, spin(旋转)
 */

import { defineComponent } from '@lytjs/component'

export const Icon = defineComponent({
  name: 'LytIcon',

  props: {
    name: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: '16px',
    },
    color: {
      type: String,
      default: '',
    },
    spin: {
      type: Boolean,
      default: false,
    },
  },

  setup(props) {
    const computedStyle = () => {
      const style: Record<string, string> = {}
      if (props.size) style.fontSize = props.size
      if (props.color) style.color = props.color
      return style
    }

    return { props, computedStyle }
  },

  template: `
    <i
      class="lyt-icon lyt-icon--{name} {spin ? 'lyt-icon--spin' : ''}"
      :style="computedStyle()"
    ></i>
  `,

  styles: `
    .lyt-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-style: normal;
      line-height: 1;
      vertical-align: middle;
      speak: none;
      -webkit-font-smoothing: antialiased;
    }
    .lyt-icon--spin {
      animation: lyt-icon-spin 1s linear infinite;
    }
    @keyframes lyt-icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
})
