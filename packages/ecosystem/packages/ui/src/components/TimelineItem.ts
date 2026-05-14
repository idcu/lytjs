/**
 * @lytjs/ui - TimelineItem 时间轴项组件
 *
 * 时间轴项组件，与 Timeline 配合使用
 */

import type { TimelineItemProps, TimelineItemSlots, TimelineItemSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * TimelineItem 时间轴项组件
 */
export const TimelineItem = defineComponent({
  name: 'LytTimelineItem',

  props: {
    color: { type: String, default: '' },
    type: { type: String as () => 'primary' | 'success' | 'warning' | 'danger' | 'info', default: '' },
    size: { type: String as () => 'large' | 'default' | 'small', default: 'default' },
    dot: { type: [String, Object] as any, default: '' },
    timestamp: { type: String, default: '' },
    placement: { type: String as () => 'top' | 'bottom', default: 'bottom' },
    hideTimestamp: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: [String, Object] as any, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as TimelineItemSetupProps;

    const getTimelineItemClass = () => {
      const classes = ['lyt-timeline-item'];
      if (_props.type) classes.push(`lyt-timeline-item--${_props.type}`);
      if (_props.size && _props.size !== 'default') classes.push(`lyt-timeline-item--${_props.size}`);
      if (_props.placement) classes.push(`lyt-timeline-item--${_props.placement}`);
      if (_props.hideTimestamp) classes.push('lyt-timeline-item--hide-timestamp');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getTimelineItemStyle = () => {
      const style: Record<string, string> = {};
      if (_props.color) {
        style['--lyt-timeline-item-color'] = _props.color;
      }
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

    const renderDot = () => {
      if (slots.dot) {
        const dotContent = slots.dot();
        if (Array.isArray(dotContent)) {
          return createVNode('div', { class: 'lyt-timeline-item__dot' }, dotContent as VNode[]);
        }
      }
      if (_props.dot) {
        if (typeof _props.dot === 'string') {
          return createVNode('div', { class: 'lyt-timeline-item__dot' }, [createTextVNode(_props.dot)]);
        }
        return createVNode('div', { class: 'lyt-timeline-item__dot' }, [_props.dot as VNode]);
      }
      return createVNode('div', { class: 'lyt-timeline-item__dot' }, null);
    };

    return () => {
      const children: VNode[] = [];
      
      children.push(createVNode('div', { class: 'lyt-timeline-item__tail' }, null));
      children.push(renderDot());
      
      const wrapperChildren: VNode[] = [];
      
      if (_props.timestamp && !_props.hideTimestamp) {
        wrapperChildren.push(createVNode('div', { class: 'lyt-timeline-item__timestamp' }, [createTextVNode(_props.timestamp)]));
      }
      
      const contentChildren: VNode[] = [];
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          contentChildren.push(...(slotContent as VNode[]));
        }
      }
      wrapperChildren.push(createVNode('div', { class: 'lyt-timeline-item__content' }, contentChildren));
      
      children.push(createVNode('div', { class: 'lyt-timeline-item__wrapper' }, wrapperChildren));

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel,
        'aria-describedby': _props.ariaDescribedBy,
      }, {
        class: getTimelineItemClass(),
        style: getTimelineItemStyle(),
      }), children);
    };
  },
});

export type { TimelineItemProps, TimelineItemSlots };
