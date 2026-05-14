/**
 * @lytjs/ui - RadioGroup 组件
 *
 * 单选框组组件，用于单选场景
 */

import type { RadioGroupProps, RadioGroupSlots, RadioGroupSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { getGroupA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

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
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaRequired: { type: Boolean, default: false },
    id: { type: String, default: '' },
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

      const a11yProps = getGroupA11yProps({
        role: 'radiogroup',
        id: _props.id,
        ariaLabel: _props.ariaLabel,
        ariaDescribedBy: _props.ariaDescribedBy,
        ariaRequired: _props.ariaRequired,
      });
      
      return createVNode('div', mergeA11yProps(a11yProps, {
        class: getRadioGroupClass(),
        style: getRadioGroupStyle(),
        'aria-disabled': _props.disabled,
      }), children);
    };
  },
});

export type { RadioGroupProps, RadioGroupSlots };
