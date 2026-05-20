/**
 * @lytjs/ui - Select 组件（增强版）
 *
 * 选择器组件，支持单选、多选、搜索等功能
 * 增强 Accessibility 支持：
 * - 焦点管理（打开聚焦到下拉框，关闭返回）
 * - 焦点陷阱（Tab 键循环）
 * - 屏幕阅读器支持（Live regions）
 * - aria-activedescendant 支持
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal, effect } from '@lytjs/reactivity';
import { getComboboxA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import type { SelectOption, SelectSetupProps } from './types';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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
    closeOnSelect: { type: Boolean, default: true },
    filterable: { type: Boolean, default: false },
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
    const triggerRef = signal<HTMLElement | null>(null);
    const dropdownRef = signal<HTMLElement | null>(null);
    const previousActiveElement = signal<HTMLElement | null>(null);
    const listboxId = signal(`lyt-select-listbox-${Math.random().toString(36).substr(2, 9)}`);
    const activeDescendant = signal('');

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
      if (!p.filterable || !query) return opts;
      const lowerQuery = query.toLowerCase();
      return opts.filter((opt) => opt.label.toLowerCase().includes(lowerQuery));
    };

    const getEnabledOptions = () => {
      return getFilteredOptions().filter((opt) => !opt.disabled);
    };

    const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
        (el) => {
          return el.offsetParent !== null && !el.hasAttribute('aria-hidden');
        },
      );
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
            const foundIndex = enabledOptions.findIndex((opt) => selectedValues.has(opt.value));
            currentValue = foundIndex >= 0 ? foundIndex : 0;
          }
          highlightedIndex.set(currentValue);

          const option = enabledOptions[currentValue];
          if (option) {
            activeDescendant.set(`lyt-select-option-${option.value}`);
          }
        }

        previousActiveElement.set(document.activeElement as HTMLElement);
        setTimeout(() => {
          const dropdown = dropdownRef();
          if (dropdown) {
            const focusable = getFocusableElements(dropdown);
            if (focusable.length > 0) {
              focusable[0]?.focus();
            }
          }
        }, 10);
      } else {
        const prevEl = previousActiveElement();
        if (prevEl && prevEl.focus) {
          setTimeout(() => prevEl.focus(), 10);
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
        if (p.closeOnSelect) {
          isOpen.set(false);
          p.onVisibleChange?.(false);
        }
        p.onChange?.(option.value);

        const prevEl = previousActiveElement();
        if (prevEl && prevEl.focus) {
          setTimeout(() => prevEl.focus(), 10);
        }
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
          if (!p.filterable || !open) {
            event.preventDefault();
          }
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
              const nextIndex = Math.min(hIndex + 1, enabledOptions.length - 1);
              highlightedIndex.set(nextIndex);
              const option = enabledOptions[nextIndex];
              if (option) {
                activeDescendant.set(`lyt-select-option-${option.value}`);
              }
            }
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (open) {
            if (enabledOptions.length > 0) {
              const prevIndex = Math.max(hIndex - 1, 0);
              highlightedIndex.set(prevIndex);
              const option = enabledOptions[prevIndex];
              if (option) {
                activeDescendant.set(`lyt-select-option-${option.value}`);
              }
            }
          }
          break;
        case 'Escape':
          if (open) {
            event.preventDefault();
            isOpen.set(false);
            p.onVisibleChange?.(false);
            const prevEl = previousActiveElement();
            if (prevEl && prevEl.focus) {
              prevEl.focus();
            }
          }
          break;
        case 'Home':
          event.preventDefault();
          if (open && enabledOptions.length > 0) {
            highlightedIndex.set(0);
            const option = enabledOptions[0];
            if (option) {
              activeDescendant.set(`lyt-select-option-${option.value}`);
            }
          }
          break;
        case 'End':
          event.preventDefault();
          if (open && enabledOptions.length > 0) {
            const lastIndex = enabledOptions.length - 1;
            highlightedIndex.set(lastIndex);
            const option = enabledOptions[lastIndex];
            if (option) {
              activeDescendant.set(`lyt-select-option-${option.value}`);
            }
          }
          break;
        case 'Tab':
          if (open) {
            isOpen.set(false);
            p.onVisibleChange?.(false);
          }
          break;
      }

      p.onKeydown?.(event);
    };

    const handleTriggerKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' && !isOpen()) {
        event.preventDefault();
        toggleDropdown();
      } else if (event.key === 'ArrowUp' && !isOpen()) {
        event.preventDefault();
        toggleDropdown();
      }
    };

    const handleOptionKeydown = (event: KeyboardEvent, option: SelectOption) => {
      if (event.key === 'Tab') {
        isOpen.set(false);
        p.onVisibleChange?.(false);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect(option);
        return;
      }

      handleKeydown(event);
    };

    const getSelectedLabel = (): string => {
      const selected = Array.from(selectedValue());
      if (selected.length === 0) return '';

      const opts = p.options || [];
      const selectedOptions = opts.filter((opt) => selected.includes(opt.value));
      return selectedOptions.map((opt) => opt.label).join(', ');
    };

    return () => {
      const open = isOpen();
      const selectClass = [
        'lyt-select',
        `lyt-select--${p.size}`,
        p.disabled ? 'lyt-select--disabled' : '',
        open ? 'lyt-select--open' : '',
        p.class,
      ]
        .filter(Boolean)
        .join(' ');

      const selectedLabel = getSelectedLabel();
      const displayValue = selectedLabel || p.placeholder;
      const filteredOptions = getFilteredOptions();
      const selected = selectedValue();
      const hIndex = highlightedIndex();
      const listId = listboxId();
      const activeId = activeDescendant();

      const dropdownContent: VNode[] = [];

      if (filteredOptions.length === 0) {
        dropdownContent.push(
          createVNode(
            'div',
            {
              class: 'lyt-select__empty',
              role: 'status',
            },
            [createVNode('span', {}, '无匹配选项')],
          ),
        );
      } else {
        filteredOptions.forEach((option: SelectOption, index: number) => {
          const isSelected = selected.has(option.value);
          const isHighlighted = !option.disabled && index === hIndex;
          const optionId = `lyt-select-option-${option.value}`;
          const optionChildren: VNode[] = [];
          if (isSelected) {
            optionChildren.push(
              createVNode('span', { class: 'lyt-select__check' }, [createVNode('span', {}, '✓')]),
            );
          }
          optionChildren.push(createVNode('span', {}, option.label));
          dropdownContent.push(
            createVNode(
              'div',
              {
                key: String(option.value),
                id: optionId,
                role: 'option',
                'aria-selected': isSelected,
                'aria-disabled': option.disabled,
                class: [
                  'lyt-select__option',
                  isSelected ? 'lyt-select__option--selected' : '',
                  option.disabled ? 'lyt-select__option--disabled' : '',
                  isHighlighted ? 'lyt-select__option--highlighted' : '',
                ]
                  .filter(Boolean)
                  .join(' '),
                onClick: () => handleSelect(option),
                onMouseenter: () => {
                  if (!option.disabled) {
                    highlightedIndex.set(index);
                    activeDescendant.set(optionId);
                  }
                },
                onKeydown: (e: KeyboardEvent) => handleOptionKeydown(e, option),
              },
              optionChildren,
            ),
          );
        });
      }

      const triggerChildren: VNode[] = [];
      triggerChildren.push(
        createVNode(
          'span',
          {
            class: ['lyt-select__value', !selectedLabel ? 'lyt-select__value--placeholder' : '']
              .filter(Boolean)
              .join(' '),
          },
          [createVNode('span', {}, displayValue)],
        ),
      );
      if (p.clearable && selected.size > 0) {
        triggerChildren.push(
          createVNode(
            'span',
            {
              class: 'lyt-select__clear',
              onClick: handleClear,
              role: 'button',
              'aria-label': '清除选择',
              tabIndex: 0,
            },
            [createVNode('span', {}, '×')],
          ),
        );
      }
      triggerChildren.push(
        createVNode('span', { class: 'lyt-select__arrow' }, [createVNode('span', {}, '▼')]),
      );

      const resultChildren: VNode[] = [];

      if (p.filterable) {
        resultChildren.push(
          createVNode('input', {
            class: 'lyt-select__search',
            type: 'text',
            placeholder: '搜索...',
            value: searchValue(),
            onInput: (e: Event) => {
              searchValue.set((e.target as HTMLInputElement).value);
            },
            onKeydown: handleTriggerKeydown,
            'aria-label': '搜索选项',
            'aria-controls': listId,
          }),
        );
      }

      resultChildren.push(
        createVNode(
          'div',
          {
            ref: (el: HTMLElement) => triggerRef.set(el),
            class: 'lyt-select__trigger',
            onClick: toggleDropdown,
            onKeydown: handleTriggerKeydown,
            tabIndex: p.disabled ? -1 : (p.tabIndex ?? 0),
            role: 'combobox',
            'aria-haspopup': 'listbox',
            'aria-expanded': open,
            'aria-controls': listId,
            'aria-activedescendant': open ? activeId : undefined,
          },
          triggerChildren,
        ),
      );

      if (open) {
        resultChildren.push(
          createVNode(
            'div',
            {
              ref: (el: HTMLElement) => dropdownRef.set(el),
              id: listId,
              class: 'lyt-select__dropdown',
              role: 'listbox',
              'aria-multiselectable': p.multiple,
              'aria-label': p.ariaLabel || '选择选项',
            },
            dropdownContent,
          ),
        );

        resultChildren.push(
          createVNode(
            'div',
            {
              class: 'lyt-select__sro',
              role: 'status',
              'aria-live': 'polite',
            },
            `已选择 ${selected.size} 个选项`,
          ),
        );
      }

      const a11yProps = getComboboxA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel || '选择器',
        ariaDescribedBy: p.ariaDescribedBy,
        ariaRequired: p.ariaRequired,
        ariaInvalid: p.ariaInvalid,
        disabled: p.disabled,
        tabIndex: p.tabIndex,
        expanded: open,
        controls: listId,
      });

      return createVNode(
        'div',
        mergeA11yProps(a11yProps, {
          class: selectClass,
          onKeydown: handleKeydown,
        }),
        resultChildren,
      );
    };
  },
});

export type { SelectProps, SelectSlots, SelectOption } from './types';
