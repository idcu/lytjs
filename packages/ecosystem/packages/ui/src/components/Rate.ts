/**
 * @lytjs/ui - Rate 组件
 *
 * 评分组件，支持半星、只读、自定义图标、数量配置功能，统一组件API
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Rate 组件
 */
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
    texts: { type: Array, default: () => ['极差', '失望', '一般', '满意', '惊喜'] },
    voidIcon: { type: String, default: '☆' },
    voidColor: { type: String, default: '#c6d1de' },
    disabledVoidColor: { type: String, default: '#e8e8e8' },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const hoverValue = signal(0);
    const isHovering = signal(false);

    const displayValue = () => isHovering.value ? hoverValue.value : props.modelValue;

    const isEmpty = () => {
      if (props.allowHalf) {
        return Math.floor(displayValue()) + 0.5;
      }
      return Math.ceil(displayValue());
    };

    const getStarClass = (index: number) => {
      const value = displayValue();
      if (value >= index + 1) return 'lyt-rate-star-full';
      if (props.allowHalf && value >= index + 0.5) return 'lyt-rate-star-half';
      return 'lyt-rate-star-void';
    };

    const getStarStyle = (index: number) => {
      const classes = ['lyt-rate-star'];
      if (getStarClass(index)) {
        classes.push(getStarClass(index));
      }
      if (props.disabled || props.readonly) {
        classes.push('lyt-rate-star-disabled');
      }
      return classes.join(' ');
    };

    const handleMouseMove = (event: MouseEvent, index: number) => {
      if (props.disabled || props.readonly) return;
      
      const target = event.target as HTMLElement;
      let newValue = index + 1;

      if (props.allowHalf) {
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
      if (props.disabled || props.readonly) return;

      let newValue = index + 1;

      if (props.allowHalf) {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        if (event.clientX - rect.left < halfWidth) {
          newValue = index + 0.5;
        }
      }

      emit('update:modelValue', newValue);
      if (props.onChange && props.onChange(newValue));
    };

    const getText = () => {
      const value = props.texts || [];
      const index = Math.round(displayValue()) - 1;
      return value[index] || '';
    };

    const getScore = () => {
      return displayValue().toFixed(1);
    };

    const getRateClass = () => {
      const classes = ['lyt-rate'];
      if (props.class) classes.push(props.class);
      if (props.disabled || props.readonly) {
        classes.push('lyt-rate-disabled');
      }
      return classes.join(' ');
    };

    return () => {
      const starNodes = [];

      for (let i = 0; i < props.max; i++) {
        starNodes.push(
          createVNode('span', {
            class: getStarStyle(i),
            key: i,
            onMousemove: (e: MouseEvent) => handleMouseMove(e, i),
            onMouseleave: handleMouseLeave,
            onClick: (e: MouseEvent) => handleClick(e, i)
          }, [
            // 空星
            createVNode('span', { class: 'lyt-rate-star-first' },
              slots.voidIcon || props.voidIcon || '☆'
            ),
            // 满星
            createVNode('span', { class: 'lyt-rate-star-second' },
              slots.icon || '★'
            )
          ])
        );
      }

      const children: any[] = [...starNodes];

      if (props.showText) {
        children.push(createVNode('span', { class: 'lyt-rate-text' }, getText()));
      }

      if (props.showScore) {
        children.push(createVNode('span', { class: 'lyt-rate-score' }, getScore()));
      }

      return createVNode('div', { class: getRateClass() }, children);
    };
  },
});

export default Rate;
