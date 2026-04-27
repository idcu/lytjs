/**
 * Statistic 统计数值
 * Props: title, value, prefix, suffix, precision, valueStyle, groupSeparator
 */

import { defineComponent } from '@lytjs/component';
import { computed } from '@lytjs/reactivity';

export const Statistic = defineComponent({
  name: 'LytStatistic',

  props: {
    title: {
      type: String,
      default: '',
    },
    value: {
      type: [String, Number] as any,
      default: 0,
    },
    prefix: {
      type: String,
      default: '',
    },
    suffix: {
      type: String,
      default: '',
    },
    precision: {
      type: Number,
      default: undefined,
    },
    valueStyle: {
      type: Object as () => Record<string, string>,
      default: () => ({}),
    },
    groupSeparator: {
      type: Boolean,
      default: true,
    },
  },

  setup(props) {
    const formatNumber = (val: number) => {
      if (props.precision !== undefined) {
        val = Number(val.toFixed(props.precision));
      }

      const parts = String(val).split('.');
      let intPart = parts[0];
      const decPart = parts[1];

      if (props.groupSeparator) {
        const isNegative = intPart.startsWith('-');
        if (isNegative) intPart = intPart.substring(1);
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (isNegative) intPart = '-' + intPart;
      }

      if (decPart !== undefined) {
        return intPart + '.' + decPart;
      }
      return intPart;
    };

    const displayValue = () => {
      if (typeof props.value === 'number') {
        return formatNumber(props.value);
      }
      return String(props.value);
    };

    return { displayValue };
  },

  template: `
    <div class="lyt-statistic">
      <div class="lyt-statistic__title" v-if="title">{{ title }}</div>
      <div class="lyt-statistic__content" :style="valueStyle">
        <span class="lyt-statistic__prefix" v-if="prefix">{{ prefix }}</span>
        <span class="lyt-statistic__value">{{ displayValue() }}</span>
        <span class="lyt-statistic__suffix" v-if="suffix">{{ suffix }}</span>
      </div>
    </div>
  `,

  styles: `
    .lyt-statistic {
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-statistic__title {
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-info);
      margin-bottom: 4px;
    }
    .lyt-statistic__content {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .lyt-statistic__value {
      font-size: 24px;
      font-weight: 600;
      color: var(--lyt-color-fg);
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
    }
    .lyt-statistic__prefix {
      font-size: var(--lyt-font-size-lg);
      color: var(--lyt-color-muted);
    }
    .lyt-statistic__suffix {
      font-size: var(--lyt-font-size-lg);
      color: var(--lyt-color-muted);
    }
  `,
});
