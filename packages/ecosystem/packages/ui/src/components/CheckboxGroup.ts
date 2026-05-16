/**
 * @lytjs/ui - CheckboxGroup 组件
 *
 * 复选框组组件，用于多选场景
 */

import type { CheckboxGroupProps, CheckboxGroupSlots, CheckboxGroupSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

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
    style: { type: [String, Object] as unknown as PropType<string | Record<string, string>>, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaRequired: { type: Boolean, default: false },
    id: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as CheckboxGroupSetupProps;

    const getCheckboxGroupClass = () => {
      const classes = ['lyt-checkbox-group'];
      if (_props.class) classes.push(_props.class as string);
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
          children.push(...(slotContent as VNode[]));
        } else if (slotContent) {
          children.push(slotContent as VNode);
        }
      }

      return createVNode('div', mergeA11yProps({
        id: _props.id as string,
        'aria-label': _props.ariaLabel as string,
        'aria-describedby': _props.ariaDescribedBy as string,
        'aria-required': _props.ariaRequired ? 'true' : undefined,
        role: 'group',
      }, {
        class: getCheckboxGroupClass(),
        style: getCheckboxGroupStyle(),
        'aria-disabled': _props.disabled ? 'true' : undefined,
      }), children);
    };
  },
});

export type { CheckboxGroupProps, CheckboxGroupSlots };
