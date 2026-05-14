/**
 * @lytjs/ui - Select 组件
 *
 * 选择器组件，支持单选、多选、搜索等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { SelectOption, SelectSetupProps } from './types';

export const Select = defineComponent({
  name: 'LytSelect',

  props: {
    modelValue: { type: [String, Number, Array] as unknown as StringConstructor, default: '' },
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

  setup(props: Record<string, unknown>) {
    const p = props as SelectSetupProps;
    const isOpen = signal(false);
    const selectedValue = signal<Set<string | number>>(new Set());
    const searchValue = signal('');

    const toggleDropdown = () => {
      if (p.disabled) return;
      isOpen.set(!isOpen());
    };

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;

      if (p.multiple) {
        const newSelected = new Set(selectedValue());
        if (newSelected.has(option.value)) {
          newSelected.delete(option.value);
        } else {
          newSelected.add(option.value);
        }
        selectedValue.set(newSelected);
        p.onChange?.(Array.from(newSelected));
      } else {
        selectedValue.set(new Set([option.value]));
        isOpen.set(false);
        p.onChange?.(option.value);
      }
    };

    const handleClear = (event: Event) => {
      event.stopPropagation();
      selectedValue.set(new Set());
      p.onClear?.();
      p.onChange?.(p.multiple ? [] : '');
    };

    const getSelectedLabel = (): string => {
      const selected = Array.from(selectedValue());
      if (selected.length === 0) return '';

      const opts = p.options || [];
      const selectedOptions = opts.filter(opt => selected.includes(opt.value));
      return selectedOptions.map(opt => opt.label).join(', ');
    };

    return () => {
      const selectClass = [
        'lyt-select',
        `lyt-select--${p.size}`,
        p.disabled ? 'lyt-select--disabled' : '',
        isOpen() ? 'lyt-select--open' : '',
        p.class,
      ].filter(Boolean).join(' ');

      const selectedLabel = getSelectedLabel();
      const displayValue = selectedLabel || p.placeholder;

      const dropdownContent: VNode[] = [];

      const opts = p.options || [];
      const filteredOptions = searchValue()
        ? opts.filter(opt => opt.label.includes(searchValue()))
        : opts;

      if (filteredOptions.length === 0) {
        dropdownContent.push(createVNode('div', { class: 'lyt-select__empty' }, '无匹配选项'));
      } else {
        filteredOptions.forEach((option: SelectOption) => {
          const isSelected = selectedValue().has(option.value);
          const optionChildren: VNode[] = [];
          if (isSelected) {
            optionChildren.push(createVNode('span', { class: 'lyt-select__check' }, '✓'));
          }
          optionChildren.push(createVNode('span', {}, option.label));
          dropdownContent.push(createVNode('div', {
            key: String(option.value),
            class: [
              'lyt-select__option',
              isSelected ? 'lyt-select__option--selected' : '',
              option.disabled ? 'lyt-select__option--disabled' : '',
            ].filter(Boolean).join(' '),
            onClick: () => handleSelect(option),
          }, optionChildren));
        });
      }

      const triggerChildren: VNode[] = [];
      triggerChildren.push(createVNode('span', {
        class: [
          'lyt-select__value',
          !selectedLabel ? 'lyt-select__value--placeholder' : '',
        ].filter(Boolean).join(' '),
      }, displayValue));
      if (p.clearable && selectedValue().size > 0) {
        triggerChildren.push(createVNode('span', {
          class: 'lyt-select__clear',
          onClick: handleClear,
        }, '×'));
      }
      triggerChildren.push(createVNode('span', { class: 'lyt-select__arrow' }, '▼'));

      const resultChildren: VNode[] = [
        createVNode('div', {
          class: 'lyt-select__trigger',
          onClick: toggleDropdown,
        }, triggerChildren),
      ];
      if (isOpen()) {
        resultChildren.push(createVNode('div', { class: 'lyt-select__dropdown' }, dropdownContent));
      }

      return createVNode('div', { class: selectClass }, resultChildren);
    };
  },
});

export type { SelectProps, SelectSlots, SelectOption } from './types';
