/**
 * @lytjs/ui - RadioGroup 组件
 *
 * 单选框组组件，用于单选场景
 */

import type { RadioGroupProps, RadioGroupSlots, RadioGroupSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';

/**
 * RadioGroup 组件
 */
export const RadioGroup = defineComponent({
  name: 'LytRadioGroup',

  props: {
    modelValue: { type: [String, Number, Boolean], default: undefined },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: 'default' },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as RadioGroupSetupProps;

    const handleChange = (value: string | number | boolean) => {
      emit('update:modelValue', value);
      emit('change', value);
      _props.onChange?.(value);
    };

    const getRadioGroupClass = () => {
      const classes = ['lyt-radio-group'];
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getRadioGroupStyle = () => {
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
          children.push(...slotContent);
        }
      }

      return createVNode('div', {
        class: getRadioGroupClass(),
        style: getRadioGroupStyle(),
        role: 'radiogroup',
      }, children);
    };
  },
});

export type { RadioGroupProps, RadioGroupSlots };
