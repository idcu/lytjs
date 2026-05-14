/**
 * @lytjs/ui - Select 组件
 *
 * 选择器组件，支持单选、多选、搜索等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectSetupProps {
  modelValue: string | number | (string | number)[];
  options: SelectOption[];
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  multiple: boolean;
  size: 'small' | 'medium' | 'large';
  class: string;
  onChange: ((value: string | number | (string | number)[]) => void) | undefined;
  onClear: (() => void) | undefined;
}

export interface SelectSlots {
  default?: () => VNode[];
  option?: (option: SelectOption) => VNode[];
  empty?: () => VNode[];
}

export const Select = defineComponent({
  name: 'LytSelect',

  props: {
    modelValue: { type: [String, Number, Array], default: '' },
    options: { type: Array, default: (): SelectOption[] => [] },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    size: { type: String, default: 'medium' },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: SelectSetupProps, { slots }: { slots: SelectSlots }) {
    const isOpen = signal(false);
    const selectedValue = signal<Set<string | number>>(new Set());
    const searchValue = signal('');

    const toggleDropdown = () => {
      if (props.disabled) return;
      isOpen.set(!isOpen());
    };

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;

      if (props.multiple) {
        const newSelected = new Set(selectedValue());
        if (newSelected.has(option.value)) {
          newSelected.delete(option.value);
        } else {
          newSelected.add(option.value);
        }
        selectedValue.set(newSelected);
        props.onChange?.(Array.from(newSelected));
      } else {
        selectedValue.set(new Set([option.value]));
        isOpen.set(false);
        props.onChange?.(option.value);
      }
    };

    const handleClear = (event: Event) => {
      event.stopPropagation();
      selectedValue.set(new Set());
      props.onClear?.();
      props.onChange?.(props.multiple ? [] : '');
    };

    const getSelectedLabel = (): string => {
      const selected = Array.from(selectedValue());
      if (selected.length === 0) return '';
      
      const options = props.options || [];
      const selectedOptions = options.filter(opt => selected.includes(opt.value));
      return selectedOptions.map(opt => opt.label).join(', ');
    };

    return () => {
      const selectClass = [
        'lyt-select',
        `lyt-select--${props.size}`,
        props.disabled ? 'lyt-select--disabled' : '',
        isOpen() ? 'lyt-select--open' : '',
        props.class,
      ].filter(Boolean).join(' ');

      const selectedLabel = getSelectedLabel();
      const displayValue = selectedLabel || props.placeholder;

      const dropdownContent: VNode[] = [];
      
      const options = props.options || [];
      const filteredOptions = searchValue() 
        ? options.filter(opt => opt.label.includes(searchValue()))
        : options;

      if (filteredOptions.length === 0) {
        dropdownContent.push(createVNode('div', { class: 'lyt-select__empty' }, ['无匹配选项']));
      } else {
        filteredOptions.forEach((option: SelectOption) => {
          const isSelected = selectedValue().has(option.value);
          dropdownContent.push(createVNode('div', {
            key: String(option.value),
            class: [
              'lyt-select__option',
              isSelected ? 'lyt-select__option--selected' : '',
              option.disabled ? 'lyt-select__option--disabled' : '',
            ].filter(Boolean).join(' '),
            onClick: () => handleSelect(option),
          }, [
            isSelected && createVNode('span', { class: 'lyt-select__check' }, ['✓']),
            option.label,
          ]));
        });
      }

      return createVNode('div', { class: selectClass }, [
        createVNode('div', {
          class: 'lyt-select__trigger',
          onClick: toggleDropdown,
        }, [
          createVNode('span', {
            class: [
              'lyt-select__value',
              !selectedLabel ? 'lyt-select__value--placeholder' : '',
            ].filter(Boolean).join(' '),
          }, [displayValue]),
          props.clearable && selectedValue().size > 0 && createVNode('span', {
            class: 'lyt-select__clear',
            onClick: handleClear,
          }, ['×']),
          createVNode('span', { class: 'lyt-select__arrow' }, ['▼']),
        ]),
        isOpen() && createVNode('div', { class: 'lyt-select__dropdown' }, [dropdownContent]),
      ]);
    };
  },
});

export type { SelectProps, SelectSlots, SelectOption } from './types';
