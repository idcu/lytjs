/**
 * @lytjs/ui - Card 组件
 *
 * 卡片组件，用于包裹内容
 */

import type { CardProps, CardSlots, CardSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Card 组件
 */
export const Card = defineComponent({
  name: 'LytCard',

  props: {
    header: { type: String, default: '' },
    bodyStyle: { type: Object, default: () => ({}) },
    shadow: { type: String, default: 'always' },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as CardSetupProps;

    const getCardClass = () => {
      const classes = ['lyt-card'];
      if (_props.shadow) classes.push(`lyt-card--shadow-${_props.shadow}`);
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getCardStyle = () => {
      const style: Record<string, string> = {};
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    return () => {
      const children: VNode[] = [];
      
      if (_props.header || slots.header) {
        children.push(createVNode('div', {
          class: 'lyt-card__header',
        }, [
          slots.header 
            ? (Array.isArray(slots.header()) ? slots.header() : [slots.header()])
            : [createVNode('span', {}, _props.header)],
        ]));
      }

      children.push(createVNode('div', {
        class: 'lyt-card__body',
        style: _props.bodyStyle,
      }, [
        slots.default 
          ? (Array.isArray(slots.default()) ? slots.default() : [slots.default()])
          : [],
      ]));

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel,
        'aria-describedby': _props.ariaDescribedBy,
      }, {
        class: getCardClass(),
        style: getCardStyle(),
      }), children);
    };
  },
});

export type { CardProps, CardSlots };
