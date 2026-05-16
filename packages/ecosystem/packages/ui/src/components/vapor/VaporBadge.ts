/**
 * @lytjs/ui - VaporBadge 组件
 *
 * Vapor 模式的徽标组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { defineVaporComponent } from '@lytjs/renderer/vapor/vapor-app';
import { computed } from '@lytjs/reactivity';
import type { VaporContext } from '@lytjs/renderer/vapor/vapor-app';

export interface VaporBadgeProps {
  value?: string | number;
  max?: number;
  isDot?: boolean;
  hidden?: boolean;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  class?: string;
}

export const VaporBadge = defineVaporComponent({
  name: 'VaporBadge',
  props: {
    value: { type: 'string', default: '' },
    max: { type: 'number', default: 99 },
    isDot: { type: 'boolean', default: false },
    hidden: { type: 'boolean', default: false },
    type: { type: 'string', default: 'danger' },
    class: { type: 'string', default: '' },
  },
  setup(props: VaporBadgeProps, context: VaporContext) {
    const content = computed(() => {
      if (props.isDot) return '';
      if (typeof props.value === 'number' && typeof props.max === 'number') {
        return props.value > props.max ? `${props.max}+` : String(props.value);
      }
      return String(props.value);
    });

    const classes = computed(() => {
      const cls = ['vapor-badge'];
      if (props.type) cls.push(`vapor-badge--${props.type}`);
      if (props.isDot) cls.push('vapor-badge--dot');
      if (props.class) cls.push(props.class);
      return cls.join(' ');
    });

    return {
      content,
      classes,
    };
  },
  template: `
    <div class="vapor-badge__wrapper">
      <slot />
      {!props.hidden && (
        <span class={classes}>
          {content}
        </span>
      )}
    </div>
  `,
});
