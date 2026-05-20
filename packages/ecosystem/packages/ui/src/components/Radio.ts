/**
 * @lytjs/ui - Radio 组件
 *
 * 单选框组件，用于单选场景
 */

import type { RadioProps, RadioSlots, RadioSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, computed } from '@lytjs/reactivity';
import { getInputControlA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export const Radio = defineComponent({
  name: 'LytRadio',

  props: {
    modelValue: { type: String, default: undefined },
    label: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
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
    const _props = props as RadioSetupProps;
    const state = reactive({
      focus: false,
    });

    const isChecked = computed(() => {
      return _props.modelValue === _props.label;
    });

    const handleChange = () => {
      if (_props.disabled) return;

      const newValue = _props.label;
      emit('update:modelValue', newValue);
      emit('change', newValue);
      _props.onChange?.(newValue as string | number | boolean);
    };

    const handleFocus = () => {
      state.focus = true;
    };

    const handleBlur = () => {
      state.focus = false;
    };

    const getRadioClass = () => {
      const classes = ['lyt-radio'];
      if (isChecked.value) classes.push('lyt-radio--checked');
      if (_props.disabled) classes.push('lyt-radio--disabled');
      if (state.focus) classes.push('lyt-radio--focus');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getRadioStyle = () => {
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
        checked: checked,
        disabled: _props.disabled,
        id: _props.id,
        ariaLabel: _props.ariaLabel,
        ariaDescribedBy: _props.ariaDescribedBy,
        ariaInvalid: _props.ariaInvalid,
        ariaRequired: _props.ariaRequired,
        tabIndex: _props.tabIndex,
      });

      children.push(
        createVNode(
          'input',
          mergeA11yProps(a11yProps, {
            type: 'radio',
            class: 'lyt-radio__input',
            checked: checked,
            disabled: _props.disabled,
            name: _props.name,
            onKeydown: _props.onKeydown,
            onChange: handleChange,
            onFocus: handleFocus,
            onBlur: handleBlur,
          }),
          [],
        ),
      );

      children.push(
        createVNode(
          'span',
          {
            class: 'lyt-radio__inner',
          },
          [],
        ),
      );

      if (_props.label !== undefined) {
        children.push(
          createVNode(
            'span',
            {
              class: 'lyt-radio__label',
            },
            [createVNode('span', {}, String(_props.label))],
          ),
        );
      } else if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          children.push(
            createVNode(
              'span',
              {
                class: 'lyt-radio__label',
              },
              slotContent as VNode[],
            ),
          );
        }
      }

      return createVNode(
        'label',
        {
          class: getRadioClass(),
          style: getRadioStyle(),
        },
        children,
      );
    };
  },
});

export type { RadioProps, RadioSlots };
