/**
 * @lytjs/ui - Timeline 时间轴组件
 *
 * 时间轴组件，用于按时间顺序展示事件
 */

import type { TimelineProps, TimelineSlots, TimelineSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Timeline 时间轴组件
 */
export const Timeline = defineComponent({
  name: 'LytTimeline',

  props: {
    reverse: { type: Boolean, default: false },
    mode: { type: String as () => 'left' | 'right' | 'alternate', default: 'left' },
    class: { type: String, default: '' },
    style: { type: [String, Object] as any, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as TimelineSetupProps;

    const getTimelineClass = () => {
      const classes = ['lyt-timeline'];
      if (_props.reverse) classes.push('lyt-timeline--reverse');
      if (_props.mode) classes.push(`lyt-timeline--${_props.mode}`);
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getTimelineStyle = () => {
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
      
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(...(slotContent as VNode[]));
        }
      }

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel,
        'aria-describedby': _props.ariaDescribedBy,
      }, {
        class: getTimelineClass(),
        style: getTimelineStyle(),
      }), children);
    };
  },
});

export type { TimelineProps, TimelineSlots };
