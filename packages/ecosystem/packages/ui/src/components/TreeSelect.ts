/**
 * @lytjs/ui - TreeSelect 组件
 *
 * 树形选择器组件，支持单选、多选、搜索、懒加载等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface TreeSelectNode {
  value: string | number;
  label: string;
  children?: TreeSelectNode[];
  disabled?: boolean;
  isLeaf?: boolean;
}

export interface TreeSelectSetupProps {
  modelValue: string | number | (string | number)[];
  options: TreeSelectNode[];
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  multiple: boolean;
  checkStrictly: boolean;
  filterable: boolean;
  showCheckbox: boolean;
  class: string;
  onChange: ((value: string | number | (string | number)[]) => void) | undefined;
  onClear: (() => void) | undefined;
}

export interface TreeSelectSlots {
  default?: (node: TreeSelectNode) => VNode[];
}

export const TreeSelect = defineComponent({
  name: 'LytTreeSelect',

  props: {
    modelValue: { type: [String, Number, Array], default: '' },
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

  setup(props: TreeSelectSetupProps, { slots }: { slots: TreeSelectSlots }) {
    const isOpen = signal(false);
    const selectedValues = signal<Set<string | number>>(new Set());
    const searchText = signal('');

    const toggleDropdown = () => {
      if (props.disabled) return;
      isOpen.set(!isOpen());
    };

    const handleSelect = (node: TreeSelectNode) => {
      if (node.disabled) return;

      if (props.multiple) {
        const newSelected = new Set(selectedValues());
        if (newSelected.has(node.value)) {
          newSelected.delete(node.value);
        } else {
          newSelected.add(node.value);
        }
        selectedValues.set(newSelected);
        props.onChange?.(Array.from(newSelected));
      } else {
        selectedValues.set(new Set([node.value]));
        isOpen.set(false);
        props.onChange?.(node.value);
      }
    };

    const handleClear = (e: Event) => {
      e.stopPropagation();
      selectedValues.set(new Set());
      props.onClear?.();
      props.onChange?.(props.multiple ? [] : '');
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
      const allNodes = flattenTree(props.options);
      const selected = Array.from(selectedValues());
      const labels = selected.map(v => {
        const node = allNodes.find(n => n.value === v);
        return node?.label || '';
      }).filter(Boolean);
      
      if (!props.multiple) {
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

      return createVNode('div', {
        key: String(node.value),
        class: [
          'lyt-tree-select__node',
          isSelected ? 'lyt-tree-select__node--selected' : '',
          node.disabled ? 'lyt-tree-select__node--disabled' : '',
        ].filter(Boolean).join(' '),
        style: `padding-left: ${indent}px`,
        onClick: () => handleSelect(node),
      }, [
        node.children && node.children.length > 0 && createVNode('span', { class: 'lyt-tree-select__arrow' }, ['▶']),
        props.showCheckbox && createVNode('input', {
          type: 'checkbox',
          checked: isSelected,
          disabled: node.disabled,
        }),
        slots.default ? slots.default(node) : node.label,
      ]);
    };

    return () => {
      const selectClass = [
        'lyt-tree-select',
        isOpen() ? 'lyt-tree-select--open' : '',
        props.disabled ? 'lyt-tree-select--disabled' : '',
        props.class,
      ].filter(Boolean).join(' ');

      const selectedLabel = getSelectedLabels();
      const displayValue = selectedLabel || props.placeholder;

      const filteredOptions = searchText() ? filterOptions(props.options, searchText()) : props.options;

      return createVNode('div', { class: selectClass }, [
        createVNode('div', {
          class: 'lyt-tree-select__trigger',
          onClick: toggleDropdown,
        }, [
          createVNode('span', {
            class: ['lyt-tree-select__value', !selectedLabel ? 'lyt-tree-select__placeholder' : ''].filter(Boolean).join(' '),
          }, [displayValue]),
          props.clearable && selectedValues().size > 0 && createVNode('span', {
            class: 'lyt-tree-select__clear',
            onClick: handleClear,
          }, ['×']),
          createVNode('span', { class: 'lyt-tree-select__arrow' }, ['▼']),
        ]),
        isOpen() && createVNode('div', { class: 'lyt-tree-select__dropdown' }, [
          props.filterable && createVNode('div', { class: 'lyt-tree-select__search' }, [
            createVNode('input', {
              type: 'text',
              placeholder: '搜索',
              value: searchText(),
              onInput: (e: Event) => searchText.set((e.target as HTMLInputElement).value),
            }),
          ]),
          createVNode('div', { class: 'lyt-tree-select__tree' }, [
            filteredOptions.length === 0
              ? createVNode('div', { class: 'lyt-tree-select__empty' }, ['无匹配选项'])
              : filteredOptions.map(node => renderNode(node)),
          ]),
        ]),
      ]);
    };
  },
});

export type { TreeSelectProps, TreeSelectSlots, TreeSelectNode } from './types';
