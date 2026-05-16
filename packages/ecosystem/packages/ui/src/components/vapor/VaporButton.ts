/**
 * @lytjs/ui - VaporButton 组件
 *
 * Vapor 模式的按钮组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 *
 * 注意：这是一个占位符实现
 * 完整的 Vapor 组件需要 @lytjs/renderer/vapor 模块支持
 */

import { computed } from '@lytjs/reactivity';

export interface VaporButtonProps {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
  loading?: boolean;
  plain?: boolean;
  round?: boolean;
  circle?: boolean;
  nativeType?: 'button' | 'submit' | 'reset';
  class?: string;
  style?: string;
  onClick?: (event: MouseEvent) => void;
}

export const VaporButton = {
  name: 'VaporButton',
  props: {
    type: { type: 'string', default: 'default' },
    size: { type: 'string', default: 'medium' },
    disabled: { type: 'boolean', default: false },
    loading: { type: 'boolean', default: false },
    plain: { type: 'boolean', default: false },
    round: { type: 'boolean', default: false },
    circle: { type: 'boolean', default: false },
    nativeType: { type: 'string', default: 'button' },
    class: { type: 'string', default: '' },
    style: { type: 'string', default: '' },
    onClick: { type: 'function', default: undefined },
  },
  setup(props: VaporButtonProps) {
    const classes = computed(() => {
      const cls = ['vapor-button'];
      if (props.type !== 'default') cls.push(`vapor-button--${props.type}`);
      if (props.size !== 'medium') cls.push(`vapor-button--${props.size}`);
      if (props.plain) cls.push('vapor-button--plain');
      if (props.round) cls.push('vapor-button--round');
      if (props.circle) cls.push('vapor-button--circle');
      if (props.disabled) cls.push('vapor-button--disabled');
      if (props.loading) cls.push('vapor-button--loading');
      if (props.class) cls.push(props.class);
      return cls.join(' ');
    });

    const isDisabled = computed(() => props.disabled || props.loading).value;

    const handleClick = (event: MouseEvent) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      props.onClick?.(event);
    };

    return {
      classes,
      isDisabled,
      handleClick,
    };
  },
  template: `
    <button
      type={props.nativeType}
      class={classes}
      style={props.style}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {props.loading && <span class="vapor-button__loading">⟳</span>}
      <slot />
    </button>
  `,
};
