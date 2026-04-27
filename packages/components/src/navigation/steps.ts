/**
 * Steps 步骤条
 * Props: current, status(wait/process/finish/error), direction(horizontal/vertical), size(small/default)
 * Slots: default (Step 子项)
 */

import { defineComponent } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Steps = defineComponent({
  name: 'LytSteps',

  props: {
    current: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'process',
      validator: (v: string) => ['wait', 'process', 'finish', 'error'].includes(v),
    },
    direction: {
      type: String,
      default: 'horizontal',
      validator: (v: string) => ['horizontal', 'vertical'].includes(v),
    },
    size: {
      type: String,
      default: 'default',
      validator: (v: string) => ['small', 'default'].includes(v),
    },
    items: {
      type: Array as () => Array<{
        title: string;
        description?: string;
        icon?: string;
        status?: 'wait' | 'process' | 'finish' | 'error';
      }>,
      default: () => [],
    },
  },

  setup(props, { slots }) {
    const state = reactive({
      currentStep: props.current,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getStepStatus = (index: number, item?: any) => {
      if (item && item.status) return item.status;
      if (index < state.currentStep) return 'finish';
      if (index === state.currentStep) return props.status;
      return 'wait';
    };

    const getStepIcon = (status: string, index: number) => {
      if (status === 'finish') return '&#10003;';
      if (status === 'error') return '&#10007;';
      return String(index + 1);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.current, (val: any) => {
      state.currentStep = val;
    });

    return { state, getStepStatus, getStepIcon, slots };
  },

  template: `
    <div class="lyt-steps lyt-steps--{direction} lyt-steps--{size}">
      <slot>
        <div
          v-for="(item, index) in items"
          class="lyt-step lyt-step--{getStepStatus(index, item)} {index < items.length - 1 ? 'lyt-step--has-tail' : ''}"
        >
          <div class="lyt-step__icon">
            <span class="lyt-step__icon-inner" v-html="getStepIcon(getStepStatus(index, item), index)"></span>
          </div>
          <div class="lyt-step__tail" v-if="index < items.length - 1"></div>
          <div class="lyt-step__content">
            <div class="lyt-step__title">{{ item.title }}</div>
            <div class="lyt-step__description" v-if="item.description">{{ item.description }}</div>
          </div>
        </div>
      </slot>
    </div>
  `,

  styles: `
    .lyt-steps {
      display: flex;
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-steps--horizontal {
      flex-direction: row;
      width: 100%;
    }
    .lyt-steps--vertical {
      flex-direction: column;
    }
    .lyt-step {
      display: flex;
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .lyt-steps--horizontal .lyt-step {
      flex-direction: column;
      align-items: center;
      flex: 1;
    }
    .lyt-steps--vertical .lyt-step {
      flex-direction: row;
      flex: none;
      min-height: 60px;
    }
    .lyt-step__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: var(--lyt-font-size-sm);
      font-weight: 600;
      border: 2px solid var(--lyt-color-border);
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-muted);
      z-index: 1;
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .lyt-steps--small .lyt-step__icon {
      width: 24px;
      height: 24px;
      font-size: 12px;
    }
    .lyt-step--finish .lyt-step__icon {
      border-color: var(--lyt-color-primary);
      background-color: var(--lyt-color-primary);
      color: #fff;
    }
    .lyt-step--process .lyt-step__icon {
      border-color: var(--lyt-color-primary);
      color: var(--lyt-color-primary);
    }
    .lyt-step--error .lyt-step__icon {
      border-color: var(--lyt-color-danger);
      color: var(--lyt-color-danger);
    }
    .lyt-step__icon-inner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .lyt-step__tail {
      position: absolute;
      background-color: var(--lyt-color-border);
    }
    .lyt-steps--horizontal .lyt-step__tail {
      top: 16px;
      left: 50%;
      width: 100%;
      height: 2px;
      transform: translateX(-50%);
    }
    .lyt-steps--small .lyt-step__tail {
      top: 12px;
    }
    .lyt-steps--vertical .lyt-step__tail {
      top: 32px;
      left: 15px;
      width: 2px;
      height: calc(100% - 32px);
    }
    .lyt-steps--small .lyt-steps--vertical .lyt-step__tail {
      left: 11px;
      height: calc(100% - 24px);
    }
    .lyt-step--finish .lyt-step__tail {
      background-color: var(--lyt-color-primary);
    }
    .lyt-step__content {
      text-align: center;
    }
    .lyt-steps--horizontal .lyt-step__content {
      margin-top: 8px;
    }
    .lyt-steps--vertical .lyt-step__content {
      margin-left: 12px;
      text-align: left;
      padding-bottom: 16px;
    }
    .lyt-step__title {
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      font-weight: 500;
    }
    .lyt-step--process .lyt-step__title {
      color: var(--lyt-color-primary);
      font-weight: 600;
    }
    .lyt-step--finish .lyt-step__title {
      color: var(--lyt-color-primary);
    }
    .lyt-step--error .lyt-step__title {
      color: var(--lyt-color-danger);
    }
    .lyt-step__description {
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-info);
      margin-top: 4px;
    }
  `,
});
