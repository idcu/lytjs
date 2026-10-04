/**
 * @lytjs/ui - Timeline 时间轴组件
 *
 * 时间轴组件，用于按时间顺序展示事件
 */

import type { TimelineProps, TimelineSlots, TimelineSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
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
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
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
        // ★ 2026-10-04：此前**只有数组形态**才渲染 —— slot 返回**单个 VNode**
        //   （最常见写法）时内容被**整个丢弃**。现在两种形态都处理。
        if (Array.isArray(slotContent)) {
          children.push(...(slotContent as VNode[]));
        } else if (slotContent) {
          children.push(slotContent as VNode);
        }
      }

      return createVNode(
        'div',
        mergeA11yProps(
          {
            id: _props.id,
            'aria-label': _props.ariaLabel,
            'aria-describedby': _props.ariaDescribedBy,
          },
          {
            class: getTimelineClass(),
            style: getTimelineStyle(),
          },
        ),
        children,
      );
    };
  },
});

export type { TimelineProps, TimelineSlots };
