/**
 * @lytjs/ui - VaporButton 组件
 *
 * Vapor 模式的按钮组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { createVNode } from '@lytjs/vdom';

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
    type: { type: String, default: 'default' },
    size: { type: String, default: 'medium' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    plain: { type: Boolean, default: false },
    round: { type: Boolean, default: false },
    circle: { type: Boolean, default: false },
    nativeType: { type: String, default: 'button' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onClick: { type: Function, default: undefined },
  },
  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporButtonProps;

    const getClasses = (): string => {
      const cls = ['vapor-button'];
      if (p.type !== 'default') cls.push(`vapor-button--${p.type}`);
      if (p.size !== 'medium') cls.push(`vapor-button--${p.size}`);
      if (p.plain) cls.push('vapor-button--plain');
      if (p.round) cls.push('vapor-button--round');
      if (p.circle) cls.push('vapor-button--circle');
      if (p.disabled) cls.push('vapor-button--disabled');
      if (p.loading) cls.push('vapor-button--loading');
      if (p.class) cls.push(p.class as string);
      return cls.join(' ');
    };

    const handleClick = (event: MouseEvent) => {
      if (p.disabled || p.loading) {
        event.preventDefault();
        return;
      }
      (p.onClick as ((event: MouseEvent) => void) | undefined)?.(event);
    };

    return () => {
      const children: any[] = [];

      if (p.loading) {
        children.push(createVNode('span', { class: 'vapor-button__loading' }, [
          createVNode('svg', {
            class: 'vapor-button__loading-icon',
            viewBox: '0 0 1024 1024',
          }, [
            createVNode('path', {
              d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z',
              fill: 'currentColor',
            }),
          ]),
        ]));
      }

      children.push(createVNode('span', { class: 'vapor-button__text' }, []));

      return createVNode('button', {
        type: p.nativeType as 'button' | 'submit' | 'reset',
        class: getClasses(),
        style: p.style as string || undefined,
        disabled: p.disabled || p.loading || undefined,
        onClick: handleClick,
      }, children);
    };
  },
};
