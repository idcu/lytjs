/**
 * @lytjs/ui - VaporSelect 组件
 *
 * Vapor 模式的选择器组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface VaporSelectProps {
  modelValue?: string | number | (string | number)[];
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  size?: 'large' | 'medium' | 'small';
  class?: string;
  style?: string;
  onChange?: (value: string | number | (string | number)[]) => void;
}

export const VaporSelect = {
  name: 'VaporSelect',

  props: {
    modelValue: { type: [String, Number, Array] as unknown as StringConstructor, default: '' },
    options: { type: Array, default: (): SelectOption[] => [] },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    size: { type: String, default: 'medium' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporSelectProps;
    const isOpen = signal(false);
    const highlightedIndex = signal(-1);

    const getSelectedValues = (): Set<string | number> => {
      const value = p.modelValue;
      if (Array.isArray(value)) {
        return new Set(value);
      } else if (value !== '' && value !== null && value !== undefined) {
        return new Set([value]);
      }
      return new Set();
    };

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;

      const selected = getSelectedValues();

      if (p.multiple) {
        if (selected.has(option.value)) {
          selected.delete(option.value);
        } else {
          selected.add(option.value);
        }
        p.onChange?.(Array.from(selected));
      } else {
        selected.clear();
        selected.add(option.value);
        isOpen.set(false);
        p.onChange?.(option.value);
      }
    };

    const handleClear = (event: Event) => {
      event.stopPropagation();
      p.onChange?.(p.multiple ? [] : '');
    };

    const handleKeydown = (event: KeyboardEvent) => {
      const options = (p.options || []).filter(opt => !opt.disabled);
      const hIndex = highlightedIndex();

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isOpen() && hIndex >= 0 && hIndex < options.length) {
            const selectedOption = options[hIndex];
            if (selectedOption) {
              handleSelect(selectedOption);
            }
          } else {
            isOpen.set(!isOpen());
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen()) {
            isOpen.set(true);
          } else {
            const nextIndex = Math.min(hIndex + 1, options.length - 1);
            highlightedIndex.set(nextIndex);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (isOpen()) {
            const prevIndex = Math.max(hIndex - 1, 0);
            highlightedIndex.set(prevIndex);
          }
          break;
        case 'Escape':
          if (isOpen()) {
            event.preventDefault();
            isOpen.set(false);
          }
          break;
        case 'Tab':
          if (isOpen()) {
            isOpen.set(false);
          }
          break;
      }
    };

    return () => {
      const open = isOpen();
      const selected = getSelectedValues();
      const options = p.options || [];
      const hIndex = highlightedIndex();

      const selectClass = [
        'vapor-select',
        `vapor-select--${p.size}`,
        p.disabled ? 'vapor-select--disabled' : '',
        open ? 'vapor-select--open' : '',
        p.class,
      ].filter(Boolean).join(' ');

      const selectedLabels = options
        .filter(opt => selected.has(opt.value))
        .map(opt => opt.label)
        .join(', ');

      const displayText = selectedLabels || p.placeholder;

      const triggerChildren: VNode[] = [
        createVNode('span', {
          class: ['vapor-select__value', !selectedLabels ? 'vapor-select__value--placeholder' : ''].filter(Boolean).join(' '),
        }, [createVNode('span', {}, displayText)]),
      ];

      if (p.clearable && selected.size > 0) {
        triggerChildren.push(createVNode('span', {
          class: 'vapor-select__clear',
          onClick: handleClear,
        }, [createVNode('span', {}, '×')]));
      }

      triggerChildren.push(createVNode('span', { class: 'vapor-select__arrow' }, [
        createVNode('span', {}, open ? '▲' : '▼'),
      ]));

      const result: VNode[] = [
        createVNode('div', {
          class: 'vapor-select__trigger',
          onClick: () => {
            if (!p.disabled) isOpen.set(!isOpen());
          },
          onKeydown: handleKeydown,
          tabIndex: p.disabled ? -1 : 0,
          role: 'combobox',
          'aria-haspopup': 'listbox',
          'aria-expanded': open,
        }, triggerChildren),
      ];

      if (open) {
        const optionItems: VNode[] = options.map((option, index) => {
          const isSelected = selected.has(option.value);
          const isHighlighted = !option.disabled && index === hIndex;

          return createVNode('div', {
            key: String(option.value),
            class: [
              'vapor-select__option',
              isSelected ? 'vapor-select__option--selected' : '',
              option.disabled ? 'vapor-select__option--disabled' : '',
              isHighlighted ? 'vapor-select__option--highlighted' : '',
            ].filter(Boolean).join(' '),
            onClick: () => handleSelect(option),
            onMouseenter: () => {
              if (!option.disabled) highlightedIndex.set(index);
            },
            role: 'option',
            'aria-selected': isSelected,
            'aria-disabled': option.disabled,
          }, [
            isSelected ? createVNode('span', { class: 'vapor-select__check' }, [createVNode('span', {}, '✓')]) : createVNode('span', {}, ''),
            createVNode('span', {}, option.label),
          ]);
        });

        result.push(createVNode('div', {
          class: 'vapor-select__dropdown',
          role: 'listbox',
          'aria-multiselectable': p.multiple,
        }, optionItems));
      }

      return createVNode('div', {
        class: selectClass,
        onKeydown: handleKeydown,
      }, result);
    };
  },
};
