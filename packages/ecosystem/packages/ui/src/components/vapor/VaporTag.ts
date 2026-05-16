/**
 * @lytjs/ui - VaporTag 组件
 *
 * Vapor 模式的标签组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 *
 * 注意：这是一个占位符实现
 * 完整的 Vapor 组件需要 @lytjs/renderer/vapor 模块支持
 */

import { computed } from '@lytjs/reactivity';

export interface VaporTagProps {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  closable?: boolean;
  disableTransitions?: boolean;
  hit?: boolean;
  color?: string;
  size?: 'large' | 'default' | 'small';
  round?: boolean;
  class?: string;
  onClose?: (event: MouseEvent) => void;
}

export const VaporTag = {
  name: 'VaporTag',
  props: {
    type: { type: 'string', default: 'primary' },
    closable: { type: 'boolean', default: false },
    disableTransitions: { type: 'boolean', default: false },
    hit: { type: 'boolean', default: false },
    color: { type: 'string', default: '' },
    size: { type: 'string', default: 'default' },
    round: { type: 'boolean', default: false },
    class: { type: 'string', default: '' },
    onClose: { type: 'function', default: undefined },
  },
  setup(props: VaporTagProps) {
    const classes = computed(() => {
      const cls = ['vapor-tag'];
      if (props.type) cls.push(`vapor-tag--${props.type}`);
      if (props.size !== 'default') cls.push(`vapor-tag--${props.size}`);
      if (props.round) cls.push('vapor-tag--round');
      if (props.hit) cls.push('is-hit');
      if (props.disableTransitions) cls.push('vapor-tag--disable-transitions');
      if (props.class) cls.push(props.class);
      return cls.join(' ');
    });

    const tagStyle = computed(() => {
      if (!props.color) return '';
      return `background-color: ${props.color}`;
    });

    const handleClose = (event: MouseEvent) => {
      props.onClose?.(event);
    };

    return {
      classes,
      tagStyle,
      handleClose,
    };
  },
  template: `
    <span class={classes} style={tagStyle}>
      <slot />
      {props.closable && (
        <span class="vapor-tag__close" onClick={handleClose}>×</span>
      )}
    </span>
  `,
};
