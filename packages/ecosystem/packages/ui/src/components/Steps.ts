/**
 * @lytjs/ui - Steps 步骤条组件
 *
 * 步骤条组件，用于引导用户按照流程完成任务
 */

import type { StepsProps, StepsSlots, StepsSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Steps 步骤条组件
 */
export const Steps = defineComponent({
  name: 'LytSteps',

  props: {
    active: { type: Number, default: 0 },
    processStatus: { type: String as () => 'process' | 'finish' | 'error' | 'success', default: 'process' },
    finishStatus: { type: String as () => 'wait' | 'process' | 'finish' | 'error' | 'success', default: 'success' },
    direction: { type: String as () => 'horizontal' | 'vertical', default: 'horizontal' },
    alignCenter: { type: Boolean, default: false },
    simple: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as StepsSetupProps;
    const currentStep = signal(_props.active);

    const getStepsClass = () => {
      const classes = ['lyt-steps'];
      if (_props.direction) classes.push(`lyt-steps--${_props.direction}`);
      if (_props.simple) classes.push('lyt-steps--simple');
      if (_props.alignCenter) classes.push('lyt-steps--align-center');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getStepsStyle = () => {
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

    const handleStepClick = (index: number) => {
      currentStep.value = index;
      emit('update:active', index);
      emit('change', index);
      _props.onChange?.(index);
    };

    return () => {
      const children: VNode[] = [];
      
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(...slotContent);
        }
      }

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel,
        'aria-describedby': _props.ariaDescribedBy,
        role: 'navigation',
      }, {
        class: getStepsClass(),
        style: getStepsStyle(),
      }), children);
    };
  },
});

export type { StepsProps, StepsSlots };
