/**
 * @lytjs/ui - Select 组件
 *
 * 选择器组件，支持单选、多选、搜索等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal, effect } from '@lytjs/reactivity';
import { getComboboxA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaInvalid: { type: Boolean, default: false },
    ariaRequired: { type: Boolean, default: false },
    tabIndex: { type: Number, default: undefined },
    onChange: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
    onKeydown: { type: Function, default: undefined },
    onVisibleChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as SelectSetupProps;
    const isOpen = signal(false);
    const selectedValue = signal<Set<string | number>>(new Set());
    const searchValue = signal('');
    const highlightedIndex = signal(-1);

    effect(() => {
      if (Array.isArray(p.modelValue)) {
        selectedValue.set(new Set(p.modelValue));
      } else if (p.modelValue !== '' && p.modelValue !== null && p.modelValue !== undefined) {
        selectedValue.set(new Set([p.modelValue]));
      }
    });

    const getFilteredOptions = () => {
      const opts = p.options || [];
      const query = searchValue();
      return query
        ? opts.filter(opt => opt.label.includes(query))
        : opts;
    };

    const getEnabledOptions = () => {
      return getFilteredOptions().filter(opt => !opt.disabled);
    };

    const toggleDropdown = () => {
      if (p.disabled) return;
      const newOpen = !isOpen();
      isOpen.set(newOpen);
      if (newOpen) {
        const enabledOptions = getEnabledOptions();
        if (enabledOptions.length > 0) {
          const selectedValues = selectedValue();
          let currentValue = 0;
          if (selectedValues.size > 0) {
            const foundIndex = enabledOptions.findIndex(opt => selectedValues.has(opt.value));
            currentValue = foundIndex >= 0 ? foundIndex : 0;
          }
          highlightedIndex.set(currentValue);
        }
      }
      p.onVisibleChange?.(newOpen);
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
        p.onVisibleChange?.(false);
        p.onChange?.(option.value);
      }
    };

    const handleClear = (event: Event) => {
      event.stopPropagation();
      selectedValue.set(new Set());
      p.onClear?.();
      p.onChange?.(p.multiple ? [] : '');
    };

    const handleKeydown = (event: KeyboardEvent) => {
      const enabledOptions = getEnabledOptions();
      const open = isOpen();
      const hIndex = highlightedIndex();

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (open) {
            if (hIndex >= 0 && hIndex < enabledOptions.length) {
              const option = enabledOptions[hIndex];
              if (option) {
                handleSelect(option);
              }
            }
          } else {
            toggleDropdown();
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!open) {
            toggleDropdown();
          } else {
            if (enabledOptions.length > 0) {
              highlightedIndex.set(Math.min(hIndex + 1, enabledOptions.length - 1));
            }
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (open) {
            if (enabledOptions.length > 0) {
              highlightedIndex.set(Math.max(hIndex - 1, 0));
            }
          }
          break;
        case 'Escape':
          if (open) {
            event.preventDefault();
            isOpen.set(false);
            p.onVisibleChange?.(false);
          }
          break;
        case 'Home':
          event.preventDefault();
          if (open && enabledOptions.length > 0) {
            highlightedIndex.set(0);
          }
          break;
        case 'End':
          event.preventDefault();
          if (open && enabledOptions.length > 0) {
            highlightedIndex.set(enabledOptions.length - 1);
          }
          break;
      }

      p.onKeydown?.(event);
    };

    const getSelectedLabel = (): string => {
      const selected = Array.from(selectedValue());
      if (selected.length === 0) return '';

      const opts = p.options || [];
      const selectedOptions = opts.filter(opt => selected.includes(opt.value));
      return selectedOptions.map(opt => opt.label).join(', ');
    };

    return () => {
      const open = isOpen();
      const selectClass = [
        'lyt-select',
        `lyt-select--${p.size}`,
        p.disabled ? 'lyt-select--disabled' : '',
        open ? 'lyt-select--open' : '',
        p.class,
      ].filter(Boolean).join(' ');

      const selectedLabel = getSelectedLabel();
      const displayValue = selectedLabel || p.placeholder;
      const filteredOptions = getFilteredOptions();
      const selected = selectedValue();
      const hIndex = highlightedIndex();

      const dropdownContent: VNode[] = [];

      if (filteredOptions.length === 0) {
        dropdownContent.push(createVNode('div', { class: 'lyt-select__empty' }, [createVNode('span', {}, '无匹配选项')]));
      } else {
        filteredOptions.forEach((option: SelectOption, index: number) => {
          const isSelected = selected.has(option.value);
          const isHighlighted = !option.disabled && index === hIndex;
          const optionChildren: VNode[] = [];
          if (isSelected) {
            optionChildren.push(createVNode('span', { class: 'lyt-select__check' }, [createVNode('span', {}, '✓')]));
          }
          optionChildren.push(createVNode('span', {}, option.label));
          dropdownContent.push(createVNode('div', {
            key: String(option.value),
            role: 'option',
            'aria-selected': isSelected,
            class: [
              'lyt-select__option',
              isSelected ? 'lyt-select__option--selected' : '',
              option.disabled ? 'lyt-select__option--disabled' : '',
              isHighlighted ? 'lyt-select__option--highlighted' : '',
            ].filter(Boolean).join(' '),
            onClick: () => handleSelect(option),
            onMouseenter: () => {
              if (!option.disabled) highlightedIndex.set(index);
            },
          }, optionChildren));
        });
      }

      const triggerChildren: VNode[] = [];
      triggerChildren.push(createVNode('span', {
        class: [
          'lyt-select__value',
          !selectedLabel ? 'lyt-select__value--placeholder' : '',
        ].filter(Boolean).join(' '),
      }, [createVNode('span', {}, displayValue)]));
      if (p.clearable && selected.size > 0) {
        triggerChildren.push(createVNode('span', {
          class: 'lyt-select__clear',
          onClick: handleClear,
        }, [createVNode('span', {}, '×')]));
      }
      triggerChildren.push(createVNode('span', { class: 'lyt-select__arrow' }, [createVNode('span', {}, '▼')]));

      const resultChildren: VNode[] = [
        createVNode('div', {
          class: 'lyt-select__trigger',
          onClick: toggleDropdown,
        }, triggerChildren),
      ];
      if (open) {
        resultChildren.push(createVNode('div', {
          class: 'lyt-select__dropdown',
          role: 'listbox',
          'aria-multiselectable': p.multiple,
        }, dropdownContent));
      }

      const a11yProps = getComboboxA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel,
        ariaDescribedBy: p.ariaDescribedBy,
        ariaRequired: p.ariaRequired,
        ariaInvalid: p.ariaInvalid,
        disabled: p.disabled,
        tabIndex: p.tabIndex,
        expanded: open,
        controls: undefined,
      });

      return createVNode('div', mergeA11yProps(a11yProps, {
        class: selectClass,
        onKeydown: handleKeydown,
      }), resultChildren);
    };
  },
});

export type { SelectProps, SelectSlots, SelectOption } from './types';
