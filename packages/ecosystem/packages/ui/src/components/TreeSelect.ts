/**
 * @lytjs/ui - TreeSelect 组件
 *
 * 树形选择器组件，支持单选、多选、搜索、懒加载等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { TreeSelectNode, TreeSelectSetupProps, TreeSelectSlots } from './types';

export const TreeSelect = defineComponent({
  name: 'LytTreeSelect',

  props: {
    modelValue: { type: [String, Number, Array] as unknown as StringConstructor, default: '' },
    options: { type: Array, default: (): TreeSelectNode[] => [] },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    multiple: { type: Boolean, default: false },
    checkStrictly: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },
    showCheckbox: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: TreeSelectSlots }) {
    const p = props as TreeSelectSetupProps;
    const isOpen = signal(false);
    const selectedValues = signal<Set<string | number>>(new Set());
    const searchText = signal('');

    const toggleDropdown = () => {
      if (p.disabled) return;
      isOpen.set(!isOpen());
    };

    const handleSelect = (node: TreeSelectNode) => {
      if (node.disabled) return;

      if (p.multiple) {
        const newSelected = new Set(selectedValues());
        if (newSelected.has(node.value)) {
          newSelected.delete(node.value);
        } else {
          newSelected.add(node.value);
        }
        selectedValues.set(newSelected);
        p.onChange?.(Array.from(newSelected));
      } else {
        selectedValues.set(new Set([node.value]));
        isOpen.set(false);
        p.onChange?.(node.value);
      }
    };

    const handleClear = (e: Event) => {
      e.stopPropagation();
      selectedValues.set(new Set());
      p.onClear?.();
      p.onChange?.(p.multiple ? [] : '');
    };

    const flattenTree = (nodes: TreeSelectNode[], result: TreeSelectNode[] = []): TreeSelectNode[] => {
      for (const node of nodes) {
        result.push(node);
        if (node.children) {
          flattenTree(node.children, result);
        }
      }
      return result;
    };

    const getSelectedLabels = (): string => {
      const allNodes = flattenTree(p.options);
      const selected = Array.from(selectedValues());
      const labels = selected.map(v => {
        const node = allNodes.find(n => n.value === v);
        return node?.label || '';
      }).filter(Boolean);

      if (!p.multiple) {
        return labels[0] || '';
      }
      return labels.length > 0 ? `${labels.length} 项` : '';
    };

    const filterOptions = (nodes: TreeSelectNode[], keyword: string): TreeSelectNode[] => {
      if (!keyword) return nodes;
      const result: TreeSelectNode[] = [];

      for (const node of nodes) {
        if (node.label.includes(keyword)) {
          result.push(node);
        } else if (node.children) {
          const filteredChildren = filterOptions(node.children, keyword);
          if (filteredChildren.length > 0) {
            result.push({ ...node, children: filteredChildren });
          }
        }
      }

      return result;
    };

    const renderNode = (node: TreeSelectNode, level: number = 0): VNode => {
      const isSelected = selectedValues().has(node.value);
      const indent = level * 20;

      const nodeChildren: VNode[] = [];

      if (node.children && node.children.length > 0) {
        nodeChildren.push(createVNode('span', { class: 'lyt-tree-select__arrow' }, [createVNode('span', {}, '▶')]));
      }

      if (p.showCheckbox) {
        nodeChildren.push(createVNode('input', {
          type: 'checkbox',
          checked: isSelected,
          disabled: node.disabled,
        }));
      }

      if (slots.default) {
        nodeChildren.push(...slots.default(node));
      } else {
        nodeChildren.push(createVNode('span', {}, String(node.label)));
      }

      return createVNode('div', {
        key: String(node.value),
        class: [
          'lyt-tree-select__node',
          isSelected ? 'lyt-tree-select__node--selected' : '',
          node.disabled ? 'lyt-tree-select__node--disabled' : '',
        ].filter(Boolean).join(' '),
        style: `padding-left: ${indent}px`,
        onClick: () => handleSelect(node),
      }, nodeChildren);
    };

    return () => {
      const selectClass = [
        'lyt-tree-select',
        isOpen() ? 'lyt-tree-select--open' : '',
        p.disabled ? 'lyt-tree-select--disabled' : '',
        p.class,
      ].filter(Boolean).join(' ');

      const selectedLabel = getSelectedLabels();
      const displayValue = selectedLabel || p.placeholder;

      const filteredOptions = searchText() ? filterOptions(p.options, searchText()) : p.options;

      const triggerChildren: VNode[] = [
        createVNode('span', {
          class: ['lyt-tree-select__value', !selectedLabel ? 'lyt-tree-select__placeholder' : ''].filter(Boolean).join(' '),
        }, [createVNode('span', {}, String(displayValue))]),
      ];

      if (p.clearable && selectedValues().size > 0) {
        triggerChildren.push(createVNode('span', {
          class: 'lyt-tree-select__clear',
          onClick: handleClear,
        }, [createVNode('span', {}, '×')]));
      }

      triggerChildren.push(createVNode('span', { class: 'lyt-tree-select__arrow' }, [createVNode('span', {}, '▼')]));

      const dropdownChildren: VNode[] = [];

      if (p.filterable) {
        dropdownChildren.push(createVNode('div', { class: 'lyt-tree-select__search' }, [
          createVNode('input', {
            type: 'text',
            placeholder: '搜索',
            value: searchText(),
            onInput: (e: Event) => searchText.set((e.target as HTMLInputElement).value),
          }),
        ]));
      }

      if (filteredOptions.length === 0) {
        dropdownChildren.push(createVNode('div', { class: 'lyt-tree-select__empty' }, [createVNode('span', {}, '无匹配选项')]));
      } else {
        dropdownChildren.push(...filteredOptions.map(node => renderNode(node)));
      }

      const resultChildren: VNode[] = [
        createVNode('div', {
          class: 'lyt-tree-select__trigger',
          onClick: toggleDropdown,
        }, triggerChildren),
      ];

      if (isOpen()) {
        resultChildren.push(createVNode('div', { class: 'lyt-tree-select__dropdown' }, dropdownChildren));
      }

      return createVNode('div', { class: selectClass }, resultChildren);
    };
  },
});

export type { TreeSelectProps, TreeSelectSlots, TreeSelectNode, TreeSelectSetupProps } from './types';
