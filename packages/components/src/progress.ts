/**
 * Progress 进度条
 * Props: percent, type(line/circle/dashboard), status(success/exception/active/warning), strokeWidth, textInside, showText, strokeLinecap, width, color
 * Events: -
 */

import { defineComponent } from '@lytjs/component'

export const Progress = defineComponent({
  name: 'LytProgress',

  props: {
    percent: {
      type: Number,
      default: 0,
      validator: (v: number) => v >= 0 && v <= 100,
    },
    type: {
      type: String,
      default: 'line',
      validator: (v: string) => ['line', 'circle', 'dashboard'].includes(v),
    },
    status: {
      type: String,
      default: '',
      validator: (v: string) => ['', 'success', 'exception', 'active', 'warning'].includes(v),
    },
    strokeWidth: {
      type: Number,
      default: 6,
    },
    textInside: {
      type: Boolean,
      default: false,
    },
    showText: {
      type: Boolean,
      default: true,
    },
    strokeLinecap: {
      type: String,
      default: 'round',
      validator: (v: string) => ['round', 'butt', 'square'].includes(v),
    },
    width: {
      type: Number,
      default: 126,
    },
    color: {
      type: [String, Function] as any,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const getStatus = () => {
      if (props.status) return props.status
      if (props.percent === 100) return 'success'
      return ''
    }

    const getColor = () => {
      if (props.color) {
        if (typeof props.color === 'function') {
          return props.color(props.percent)
        }
        return props.color
      }
      const status = getStatus()
      switch (status) {
        case 'success': return 'var(--lyt-color-success)'
        case 'exception': return 'var(--lyt-color-danger)'
        case 'warning': return 'var(--lyt-color-warning)'
        default: return 'var(--lyt-color-primary)'
      }
    }

    const getIcon = () => {
      const status = getStatus()
      if (status === 'success') return '✓'
      if (status === 'exception') return '✕'
      return ''
    }

    const isLineType = () => props.type === 'line'
    const isCircleType = () => props.type === 'circle' || props.type === 'dashboard'

    const getCirclePath = () => {
      const radius = (props.width - props.strokeWidth) / 2
      const circumference = 2 * Math.PI * radius
      const offset = circumference - (props.percent / 100) * circumference
      return {
        strokeDasharray: `${circumference}px ${circumference}px`,
        strokeDashoffset: `${offset}px`,
        stroke: getColor(),
      }
    }

    const getDashOffset = () => {
      const radius = (props.width - props.strokeWidth) / 2
      const circumference = 2 * Math.PI * radius
      return circumference - (props.percent / 100) * circumference
    }

    const getCircumference = () => {
      const radius = (props.width - props.strokeWidth) / 2
      return 2 * Math.PI * radius
    }

    return {
      props, getStatus, getColor, getIcon,
      isLineType, isCircleType,
      getCirclePath, getDashOffset, getCircumference,
      slots,
    }
  },

  template: `
    <div class="lyt-progress lyt-progress--{type} lyt-progress--{getStatus()}">
      <div v-if="isLineType()" class="lyt-progress__line">
        <div class="lyt-progress__line-outer" style="height: {strokeWidth}px">
          <div 
            class="lyt-progress__line-inner"
            style="width: {percent}%; background-color: {getColor()}; border-radius: {strokeLinecap === 'round' ? '100px' : '0'}"
          >
            <span v-if="showText && textInside" class="lyt-progress__text lyt-progress__text--inside">
              {{ getIcon() ? getIcon() : (percent + '%') }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="isCircleType()" class="lyt-progress__circle">
        <svg width="{width}" height="{width}" class="lyt-progress__circle-svg">
          <circle
            class="lyt-progress__circle-trail"
            :cx="width / 2"
            :cy="width / 2"
            :r="(width - strokeWidth) / 2"
            :stroke-width="strokeWidth"
            fill="transparent"
            stroke="var(--lyt-color-border)"
          />
          <circle
            class="lyt-progress__circle-path {getStatus() === 'active' ? 'lyt-progress__circle-path--animated' : ''}"
            :cx="width / 2"
            :cy="width / 2"
            :r="(width - strokeWidth) / 2"
            :stroke-width="strokeWidth"
            :stroke-dasharray="getCircumference() + 'px ' + getCircumference() + 'px'"
            :stroke-dashoffset="getDashOffset()"
            :stroke-linecap="strokeLinecap"
            fill="transparent"
            :stroke="getColor()"
            transform="rotate(-90 {width / 2} {width / 2})"
          />
        </svg>
      </div>
      <div v-if="showText && (!textInside || !isLineType())" class="lyt-progress__text">
        <slot>
          <span v-if="getIcon()">{{ getIcon() }}</span>
          <span v-else>{{ percent }}%</span>
        </slot>
      </div>
    </div>
  `,

  styles: `
    .lyt-progress {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-sizing: border-box;
    }
    .lyt-progress--line {
      width: 100%;
    }
    .lyt-progress--circle, .lyt-progress--dashboard {
      flex-direction: column;
    }
    .lyt-progress__line {
      flex: 1;
    }
    .lyt-progress__line-outer {
      width: 100%;
      background-color: var(--lyt-color-border);
      border-radius: 100px;
      overflow: hidden;
    }
    .lyt-progress__line-inner {
      height: 100%;
      transition: width 0.6s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 5px;
    }
    .lyt-progress--active .lyt-progress__line-inner {
      animation: lyt-progress-stripes 2s linear infinite;
    }
    .lyt-progress__text {
      font-size: 14px;
      color: var(--lyt-color-muted);
      min-width: 2.5em;
      text-align: left;
      vertical-align: middle;
      display: inline-block;
      line-height: 1;
    }
    .lyt-progress__text--inside {
      color: #fff;
      font-size: 12px;
      line-height: 1;
    }
    .lyt-progress--success .lyt-progress__text { color: var(--lyt-color-success); }
    .lyt-progress--exception .lyt-progress__text { color: var(--lyt-color-danger); }
    .lyt-progress--warning .lyt-progress__text { color: var(--lyt-color-warning); }
    .lyt-progress__circle {
      position: relative;
    }
    .lyt-progress__circle-svg {
      display: block;
    }
    .lyt-progress__circle-path {
      transition: stroke-dashoffset 0.6s ease, stroke 0.6s ease;
    }
    .lyt-progress__circle-path--animated {
      animation: lyt-progress-circle-rotate 2s linear infinite;
    }
    @keyframes lyt-progress-stripes {
      0% { background-position: 0 0; }
      100% { background-position: 20px 0; }
    }
    @keyframes lyt-progress-circle-rotate {
      from { transform: rotate(-90deg) translateZ(0); }
      to { transform: rotate(270deg) translateZ(0); }
    }
  `,
})
