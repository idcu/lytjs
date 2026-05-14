/**
 * @lytjs/ui - TreeSelect 树形选择器组件
 *
 * 树形选择器组件，结合了 Select 和 Tree 功能
 */

import type { TreeSelectProps, TreeSelectSlots, TreeSelectSetupProps, TreeSelectNode } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal, computed } from '@lytjs/reactivity';

/**
 * TreeSelect 树形选择器组件
 */
export const TreeSelect = defineComponent({
  name: 'LytTreeSelect',

  props: {
    data: { type: Array as () => TreeSelectNode[], default: () => [] },
    value: { type: [String, Number], default: '' },
    placeholder: { type: String, default: '请选择' },
    multiple: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '请输入搜索内容' },
    nodeKey: { type: String, default: 'value' },
    defaultExpandAll: { type: Boolean, default: false },
    defaultExpandedKeys: { type: Array as () => (string | number)[], default: () => [] },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as TreeSelectSetupProps;
    const visible = signal(false);
    const filterQuery = signal('');
    const expandedKeys = signal<(string | number)[]>(
      _props.defaultExpandAll 
        ? getAllNodeKeys(_props.data) 
        : _props.defaultExpandedKeys
    );
    const selectedLabel = signal('');

    function getAllNodeKeys(nodes: TreeSelectNode[]): (string | number)[] {
      const keys: (string | number)[] = [];
      const traverse = (nodeList: TreeSelectNode[]) => {
        for (const node of nodeList) {
          keys.push(node[_props.nodeKey]);
          if (node.children && node.children.length > 0) {
            traverse(node.children);
          }
        }
      };
      traverse(nodes);
      return keys;
    }

    const filteredData = computed(() => {
      if (!filterQuery.value) return _props.data;
      
      const filterNodes = (nodes: TreeSelectNode[]): TreeSelectNode[] => {
        return nodes
          .map(node => {
            let filteredChildren: TreeSelectNode[] = [];
            if (node.children && node.children.length > 0) {
              filteredChildren = filterNodes(node.children);
            }
            
            const labelMatch = node.label.toLowerCase().includes(filterQuery.value.toLowerCase());
            const hasMatchingChildren = filteredChildren.length > 0;
            
            if (labelMatch || hasMatchingChildren) {
              return {
                ...node,
                children: hasMatchingChildren ? filteredChildren : node.children,
              };
            }
            
            return null;
          })
          .filter(Boolean) as TreeSelectNode[];
      };
      
      return filterNodes(_props.data);
    });

    const selectedNode = computed(() => {
      const findNode = (nodes: TreeSelectNode[]): TreeSelectNode | null => {
        for (const node of nodes) {
          if (node[_props.nodeKey] === _props.value) {
            return node;
          }
          if (node.children && node.children.length > 0) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return findNode(_props.data);
    });

    const handleToggle = () => {
      visible.value = !visible.value;
    };

    const handleClear = () => {
      emit('update:value', '');
      _props.onChange?.('', null);
    };

    const handleSelect = (node: TreeSelectNode) => {
      if (node.disabled) return;
      emit('update:value', node[_props.nodeKey]);
      _props.onChange?.(node[_props.nodeKey], node);
      selectedLabel.value = node.label;
      visible.value = false;
    };

    const handleToggleExpand = (node: TreeSelectNode, e: Event) => {
      e.stopPropagation();
      const key = node[_props.nodeKey];
      if (expandedKeys.value.includes(key)) {
        expandedKeys.value = expandedKeys.value.filter(k => k !== key);
      } else {
        expandedKeys.value.push(key);
      }
    };

    const getTreeSelectClass = () => {
      const classes = ['lyt-tree-select'];
      if (visible.value) classes.push('is-visible');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getTreeSelectStyle = () => {
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

    const renderNode = (node: TreeSelectNode, level: number = 0): VNode => {
      const isExpanded = expandedKeys.value.includes(node[_props.nodeKey]);
      const isSelected = node[_props.nodeKey] === _props.value;
      const hasChildren = node.children && node.children.length > 0;
      
      const nodeChildren: VNode[] = [];
      
      // Expand button
      if (hasChildren) {
        nodeChildren.push(createVNode('span', {
          class: ['lyt-tree-node-expand-icon', isExpanded ? 'is-expanded' : ''],
          onClick: (e: Event) => handleToggleExpand(node, e),
        }, isExpanded ? '▼' : '▶'));
      } else {
        nodeChildren.push(createVNode('span', { class: 'lyt-tree-node-expand-icon' }, ''));
      }
      
      // Node label
      nodeChildren.push(createVNode('span', {
        class: 'lyt-tree-node-label',
      }, node.label));

      const nodeVNode = createVNode('div', {
        class: ['lyt-tree-node', { 'is-selected': isSelected, 'is-disabled': node.disabled, 'is-expanded': isExpanded }],
        style: { paddingLeft: `${level * 20}px` },
        onClick: () => handleSelect(node),
        key: node[_props.nodeKey],
      }, nodeChildren);

      if (hasChildren && isExpanded) {
        return createVNode('div', { class: 'lyt-tree-node-wrapper' }, [
          nodeVNode,
          ...node.children!.map(child => renderNode(child, level + 1)),
        ]);
      }

      return nodeVNode;
    };

    return () => {
      const children: VNode[] = [];
      
      // Trigger
      const triggerChildren: VNode[] = [];
      
      triggerChildren.push(createVNode('span', { class: 'lyt-tree-select-value' }, 
        selectedNode.value ? selectedNode.value.label : _props.placeholder
      ));
      
      if (_props.clearable && selectedNode.value) {
        triggerChildren.push(createVNode('span', {
          class: 'lyt-tree-select-clear',
          onClick: (e: Event) => {
            e.stopPropagation();
            handleClear();
          },
        }, '×'));
      }
      
      triggerChildren.push(createVNode('span', { class: 'lyt-tree-select-arrow' }, '▼'));
      
      children.push(createVNode('div', {
        class: 'lyt-tree-select-trigger',
        onClick: handleToggle,
      }, triggerChildren));

      // Dropdown
      if (visible.value) {
        const dropdownChildren: VNode[] = [];
        
        if (_props.filterable) {
          dropdownChildren.push(createVNode('div', { class: 'lyt-tree-select-search' }, [
            createVNode('input', {
              type: 'text',
              placeholder: _props.filterPlaceholder,
              value: filterQuery.value,
              onInput: (e: Event) => {
                const target = e.target as HTMLInputElement;
                filterQuery.value = target.value;
              },
            }),
          ]));
        }
        
        const treeChildren: VNode[] = [];
        if (filteredData.value.length > 0) {
          treeChildren.push(...filteredData.value.map(node => renderNode(node, 0)));
        } else if (slots.empty) {
          treeChildren.push(slots.empty());
        } else {
          treeChildren.push(createVNode('div', { class: 'lyt-tree-select-empty' }, '暂无数据'));
        }
        
        dropdownChildren.push(createVNode('div', { class: 'lyt-tree-select-tree' }, treeChildren));
        
        children.push(createVNode('div', { class: 'lyt-tree-select-dropdown' }, dropdownChildren));
      }

      return createVNode('div', {
        class: getTreeSelectClass(),
        style: getTreeSelectStyle(),
      }, children);
    };
  },
});

export type { TreeSelectProps, TreeSelectSlots };
