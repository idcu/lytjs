/**
 * @lytjs/ui - Rate 组件
 *
 * 评分组件，支持半星、只读、自定义图标、数量配置功能，统一组件API
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { RateSetupProps } from './types';

export const Rate = defineComponent({
  name: 'LytRate',

  props: {
    modelValue: { type: Number, default: 0 },
    max: { type: Number, default: 5 },
    allowHalf: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    showText: { type: Boolean, default: false },
    showScore: { type: Boolean, default: false },
    texts: { type: Array, default: (): string[] => ['极差', '失望', '一般', '满意', '惊喜'] },
    voidIcon: { type: String, default: '☆' },
    voidColor: { type: String, default: '#c6d1de' },
    disabledVoidColor: { type: String, default: '#e8e8e8' },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as RateSetupProps;
    const hoverValue = signal(0);
    const isHovering = signal(false);

    const displayValue = (): number => isHovering() ? hoverValue() : p.modelValue;

    const getStarClass = (index: number): string => {
      const value = displayValue();
      if (value >= index + 1) return 'lyt-rate-star-full';
      if (p.allowHalf && value >= index + 0.5) return 'lyt-rate-star-half';
      return 'lyt-rate-star-void';
    };

    const getStarStyle = (index: number): string => {
      const classes = ['lyt-rate-star'];
      if (getStarClass(index)) {
        classes.push(getStarClass(index));
      }
      if (p.disabled || p.readonly) {
        classes.push('lyt-rate-star-disabled');
      }
      return classes.join(' ');
    };

    const handleMouseMove = (event: MouseEvent, index: number) => {
      if (p.disabled || p.readonly) return;

      const target = event.target as HTMLElement;
      let newValue = index + 1;

      if (p.allowHalf) {
        const rect = target.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        if (event.clientX - rect.left < halfWidth) {
          newValue = index + 0.5;
        }
      }

      hoverValue.set(newValue);
      isHovering.set(true);
    };

    const handleMouseLeave = () => {
      isHovering.set(false);
    };

    const handleClick = (event: MouseEvent, index: number) => {
      if (p.disabled || p.readonly) return;

      let newValue = index + 1;

      if (p.allowHalf) {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        if (event.clientX - rect.left < halfWidth) {
          newValue = index + 0.5;
        }
      }

      if (p.onChange) {
        p.onChange(newValue);
      }
    };

    const getText = (): string => {
      const texts = (p.texts as string[]) || [];
      const index = Math.round(displayValue()) - 1;
      return texts[index] || '';
    };

    const getScore = (): string => {
      return displayValue().toFixed(1);
    };

    return () => {
      const starNodes: VNode[] = [];

      for (let i = 0; i < p.max; i++) {
        starNodes.push(
          createVNode('span', {
            class: getStarStyle(i),
            key: i,
            onMousemove: (e: MouseEvent) => handleMouseMove(e, i),
            onMouseleave: handleMouseLeave,
            onClick: (e: MouseEvent) => handleClick(e, i),
          }, [
            createVNode('span', { class: 'lyt-rate-star-first' }, [createVNode('span', {}, String(p.voidIcon))]),
            createVNode('span', { class: 'lyt-rate-star-second' }, [createVNode('span', {}, '★')]),
          ])
        );
      }

      const children: VNode[] = [...starNodes];

      if (p.showText) {
        children.push(createVNode('span', { class: 'lyt-rate-text' }, [createVNode('span', {}, getText())]));
      }

      if (p.showScore) {
        children.push(createVNode('span', { class: 'lyt-rate-score' }, [createVNode('span', {}, getScore())]));
      }

      return createVNode('div', {
        class: [
          'lyt-rate',
          p.class as string,
          (p.disabled || p.readonly) ? 'lyt-rate-disabled' : '',
        ].filter(Boolean).join(' '),
      }, children);
    };
  },
});

export default Rate;
export type { RateProps, RateSlots, RateSetupProps } from './types';
