/**
 * @lytjs/ui - VaporTag 组件
 *
 * Vapor 模式的标签组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';

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
    type: { type: String, default: 'primary' },
    closable: { type: Boolean, default: false },
    disableTransitions: { type: Boolean, default: false },
    hit: { type: Boolean, default: false },
    color: { type: String, default: '' },
    size: { type: String, default: 'default' },
    round: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onClose: { type: Function, default: undefined },
  },
  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporTagProps;

    const getClasses = (): string => {
      const cls = ['vapor-tag'];
      if (p.type) cls.push(`vapor-tag--${p.type}`);
      if (p.size !== 'default') cls.push(`vapor-tag--${p.size}`);
      if (p.round) cls.push('vapor-tag--round');
      if (p.hit) cls.push('is-hit');
      if (p.disableTransitions) cls.push('vapor-tag--disable-transitions');
      if (p.class) cls.push(p.class as string);
      return cls.join(' ');
    };

    const getStyle = (): string => {
      if (!p.color) return '';
      return `background-color: ${p.color}`;
    };

    const handleClose = (event: MouseEvent) => {
      (p.onClose as ((event: MouseEvent) => void) | undefined)?.(event);
    };

    return () => {
      const children: VNode[] = [createVNode('slot', {}, [])];

      if (p.closable) {
        children.push(
          createVNode(
            'span',
            {
              class: 'vapor-tag__close',
              onClick: handleClose,
            },
            [createTextVNode('×')],
          ),
        );
      }

      return createVNode(
        'span',
        {
          class: getClasses(),
          style: getStyle() || undefined,
        },
        children,
      );
    };
  },
};
