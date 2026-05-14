/**
 * @lytjs/ui - CheckboxGroup 组件
 *
 * 复选框组组件，用于多选场景
 */

import type { CheckboxGroupProps, CheckboxGroupSlots, CheckboxGroupSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { getGroupA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

/**
 * CheckboxGroup 组件
 */
export const CheckboxGroup = defineComponent({
  name: 'LytCheckboxGroup',

  props: {
    modelValue: { type: Array, default: undefined },
    disabled: { type: Boolean, default: false },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
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
    const _props = props as CheckboxGroupSetupProps;

    const handleChange = (value: string | number | boolean, checked: boolean) => {
      let newValue = [...(_props.modelValue || [])];
      
      if (checked) {
        if (!newValue.includes(value)) {
          newValue.push(value);
        }
      } else {
        const index = newValue.indexOf(value);
        if (index > -1) {
          newValue.splice(index, 1);
        }
      }
      
      emit('update:modelValue', newValue);
      emit('change', newValue);
      _props.onChange?.(newValue);
    };

    const getCheckboxGroupClass = () => {
      const classes = ['lyt-checkbox-group'];
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getCheckboxGroupStyle = () => {
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
        role: 'group',
        id: _props.id,
        ariaLabel: _props.ariaLabel,
        ariaDescribedBy: _props.ariaDescribedBy,
        ariaRequired: _props.ariaRequired,
      });
      
      return createVNode('div', mergeA11yProps(a11yProps, {
        class: getCheckboxGroupClass(),
        style: getCheckboxGroupStyle(),
        'aria-disabled': _props.disabled,
      }), children);
    };
  },
});

export type { CheckboxGroupProps, CheckboxGroupSlots };
