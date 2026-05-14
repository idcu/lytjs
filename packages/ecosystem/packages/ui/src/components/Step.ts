/**
 * @lytjs/ui - Step 步骤项组件
 *
 * 步骤项组件，与 Steps 配合使用
 */

import type { StepProps, StepSlots, StepSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Step 步骤项组件
 */
export const Step = defineComponent({
  name: 'LytStep',

  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: { type: [String, Object], default: '' },
    status: { type: String as () => 'wait' | 'process' | 'finish' | 'error' | 'success', default: '' },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as StepSetupProps;

    const getStepClass = () => {
      const classes = ['lyt-step'];
      if (_props.status) classes.push(`lyt-step--${_props.status}`);
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getStepStyle = () => {
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

    const renderIcon = () => {
      if (slots.icon) {
        const iconContent = slots.icon();
        if (Array.isArray(iconContent)) {
          return createVNode('div', { class: 'lyt-step__icon' }, iconContent);
        }
      }
      if (_props.icon) {
        if (typeof _props.icon === 'string') {
          return createVNode('div', { class: 'lyt-step__icon' }, [_props.icon]);
        }
        return createVNode('div', { class: 'lyt-step__icon' }, [_props.icon as VNode]);
      }
      return createVNode('div', { class: 'lyt-step__icon' }, null);
    };

    return () => {
      const children: VNode[] = [];
      
      children.push(renderIcon());
      
      const contentChildren: VNode[] = [];
      
      if (slots.title || _props.title) {
        const titleChildren: VNode[] = [];
        if (slots.title) {
          const titleContent = slots.title();
          if (Array.isArray(titleContent)) {
            titleChildren.push(...titleContent);
          }
        } else {
          titleChildren.push(_props.title);
        }
        contentChildren.push(createVNode('div', { class: 'lyt-step__title' }, titleChildren));
      }
      
      if (slots.description || _props.description) {
        const descChildren: VNode[] = [];
        if (slots.description) {
          const descContent = slots.description();
          if (Array.isArray(descContent)) {
            descChildren.push(...descContent);
          }
        } else {
          descChildren.push(_props.description);
        }
        contentChildren.push(createVNode('div', { class: 'lyt-step__description' }, descChildren));
      }
      
      children.push(createVNode('div', { class: 'lyt-step__content' }, contentChildren));

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel || _props.title,
        'aria-describedby': _props.ariaDescribedBy,
      }, {
        class: getStepClass(),
        style: getStepStyle(),
      }), children);
    };
  },
});

export type { StepProps, StepSlots };
