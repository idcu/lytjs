/**
 * @lytjs/ui - Checkbox 组件
 *
 * 复选框组件，用于多选场景
 */

import type { CheckboxProps, CheckboxSlots, CheckboxSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject, isArray } from '@lytjs/common-is';
import { reactive, computed } from '@lytjs/reactivity';
import { getInputControlA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export const Checkbox = defineComponent({
  name: 'LytCheckbox',

  props: {
    modelValue: { type: Boolean, default: false },
    label: { type: String, default: '' },
    trueLabel: { type: String, default: undefined },
    falseLabel: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    checked: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    name: { type: String, default: '' },
    id: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaInvalid: { type: Boolean, default: false },
    ariaRequired: { type: Boolean, default: false },
    tabIndex: { type: Number, default: undefined },
    onChange: { type: Function, default: undefined },
    onKeydown: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as CheckboxSetupProps;
    const state = reactive({
      focus: false,
    });

    const isChecked = computed(() => {
      if (isArray(_props.modelValue)) {
        return (_props.modelValue as unknown[]).includes(_props.label || _props.trueLabel);
      }
      return _props.modelValue || _props.checked;
    });

    const handleChange = (e: Event) => {
      if (_props.disabled) return;

      const target = e.target as HTMLInputElement;
      let newValue;

      if (isArray(_props.modelValue)) {
        newValue = [...(_props.modelValue as unknown[])];
        const value = _props.label || _props.trueLabel;
        if (target.checked) {
          if (!newValue.includes(value)) {
            newValue.push(value);
          }
        } else {
          const index = newValue.indexOf(value);
          if (index > -1) {
            newValue.splice(index, 1);
          }
        }
      } else {
        newValue = target.checked;
      }

      emit('update:modelValue', newValue);
      emit('change', newValue);
      _props.onChange?.(newValue as boolean);
    };

    const handleFocus = () => {
      state.focus = true;
    };

    const handleBlur = () => {
      state.focus = false;
    };

    const getCheckboxClass = () => {
      const classes = ['lyt-checkbox'];
      if (isChecked.value) classes.push('lyt-checkbox--checked');
      if (_props.disabled) classes.push('lyt-checkbox--disabled');
      if (_props.indeterminate) classes.push('lyt-checkbox--indeterminate');
      if (state.focus) classes.push('lyt-checkbox--focus');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getCheckboxStyle = () => {
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
      const checked = isChecked.value;

      const a11yProps = getInputControlA11yProps({
        id: _props.id,
        ariaLabel: _props.ariaLabel,
        ariaDescribedBy: _props.ariaDescribedBy,
        ariaInvalid: _props.ariaInvalid,
        ariaRequired: _props.ariaRequired,
        disabled: _props.disabled,
        tabIndex: _props.tabIndex,
        checked: checked ? true : _props.indeterminate ? 'mixed' as const : false,
      });

      children.push(createVNode('input', mergeA11yProps(a11yProps, {
        type: 'checkbox',
        class: 'lyt-checkbox__input',
        checked: checked,
        disabled: _props.disabled,
        name: _props.name,
        onKeydown: _props.onKeydown,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
      }), []));

      children.push(createVNode('span', {
        class: 'lyt-checkbox__inner',
      }, []));

      if (_props.label) {
        children.push(createVNode('span', {
          class: 'lyt-checkbox__label',
        }, [createVNode('span', {}, _props.label)]));
      } else if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(createVNode('span', {
            class: 'lyt-checkbox__label',
          }, slotContent as VNode[]));
        }
      }

      return createVNode('label', {
        class: getCheckboxClass(),
        style: getCheckboxStyle(),
      }, children);
    };
  },
});

export type { CheckboxProps, CheckboxSlots };
