/**
 * @lytjs/ui - Tree 组件
 *
 * 树形控件组件，支持勾选、拖拽、连接线等高级功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { TreeNode, TreeSetupProps } from './types';

export interface FlattenNode extends TreeNode {
  parent: FlattenNode | null;
  level: number;
  isLeaf: boolean;
  isExpanded: boolean;
  isChecked: boolean;
  isIndeterminate: boolean;
  isSelected: boolean;
}

export const Tree = defineComponent({
  name: 'LytTree',

  props: {
    data: { type: Array, default: (): TreeNode[] => [] },
    showLine: { type: Boolean, default: false },
    showCheckbox: { type: Boolean, default: false },
    checkable: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false },
    defaultExpandAll: { type: Boolean, default: false },
    defaultExpandedKeys: { type: Array, default: (): (string | number)[] => [] },
    defaultCheckedKeys: { type: Array, default: (): (string | number)[] => [] },
    nodeKey: { type: String, default: 'id' },
    class: { type: String, default: '' },
    onCheck: { type: Function, default: undefined },
    onSelect: { type: Function, default: undefined },
    onExpand: { type: Function, default: undefined },
    onNodeClick: { type: Function, default: undefined },
    onDragStart: { type: Function, default: undefined },
    onDragEnd: { type: Function, default: undefined },
    onDrop: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as TreeSetupProps;
    const expandedKeys = signal(new Set<string | number>(p.defaultExpandedKeys));
    const checkedKeys = signal(new Set<string | number>(p.defaultCheckedKeys));
    const selectedKey = signal<string | number | null>(null);

    const flattenTree = (nodes: TreeNode[], parent: FlattenNode | null = null, level = 0): FlattenNode[] => {
      const result: FlattenNode[] = [];

      for (const node of nodes) {
        const nodeKey = node.id;
        const isExpanded = expandedKeys().has(nodeKey);
        const isChecked = checkedKeys().has(nodeKey);

        const flatNode: FlattenNode = {
          ...node,
          parent,
          level,
          isLeaf: !node.children || node.children.length === 0,
          isExpanded,
          isChecked,
          isIndeterminate: false,
          isSelected: selectedKey() === nodeKey,
        };

        result.push(flatNode);

        if (isExpanded && node.children) {
          result.push(...flattenTree(node.children, flatNode, level + 1));
        }
      }

      return result;
    };

    const handleNodeClick = (node: TreeNode) => {
      selectedKey.set(node.id);
      p.onNodeClick?.(node);
      p.onSelect?.(node);
    };

    const handleCheck = (node: TreeNode, checked: boolean) => {
      const newCheckedKeys = new Set(checkedKeys());
      if (checked) {
        newCheckedKeys.add(node.id);
      } else {
        newCheckedKeys.delete(node.id);
      }
      checkedKeys.set(newCheckedKeys);
      p.onCheck?.(p.data, checked);
    };

    const handleExpand = (node: TreeNode) => {
      const newExpandedKeys = new Set(expandedKeys());
      const isExpanded = expandedKeys().has(node.id);

      if (isExpanded) {
        newExpandedKeys.delete(node.id);
      } else {
        newExpandedKeys.add(node.id);
      }

      expandedKeys.set(newExpandedKeys);
      p.onExpand?.(node, !isExpanded);
    };

    const renderTreeNode = (node: FlattenNode): VNode => {
      const indent = node.level * 20;

      const nodeContent: VNode[] = [];

      if (!node.isLeaf) {
        nodeContent.push(createVNode('span', {
          class: 'lyt-tree__expand-icon',
          onClick: () => handleExpand(node),
        }, [createVNode('span', {}, node.isExpanded ? '▼' : '▶')]));
      }

      if (p.showCheckbox) {
        nodeContent.push(createVNode('input', {
          type: 'checkbox',
          checked: node.isChecked,
          onChange: (e: Event) => handleCheck(node, (e.target as HTMLInputElement).checked),
        }));
      }

      nodeContent.push(createVNode('span', {
        class: 'lyt-tree__label',
        onClick: () => handleNodeClick(node),
      }, [createVNode('span', {}, String(node.label))]));

      return createVNode('div', {
        key: String(node.id),
        class: [
          'lyt-tree__node',
          node.isSelected ? 'lyt-tree__node--selected' : '',
          node.isChecked ? 'lyt-tree__node--checked' : '',
        ].filter(Boolean).join(' '),
        style: `padding-left: ${indent}px`,
        draggable: p.draggable,
        onDragStart: (e: DragEvent) => p.onDragStart?.(node, e),
        onDragEnd: (e: DragEvent) => p.onDragEnd?.(node, e),
      }, nodeContent);
    };

    return () => {
      const data = p.data || [];
      const flatData = flattenTree(data);

      if (flatData.length === 0) {
        return createVNode('div', { class: 'lyt-tree__empty' }, [createVNode('span', {}, '暂无数据')]);
      }

      const treeClass = [
        'lyt-tree',
        p.showLine ? 'lyt-tree--show-line' : '',
        p.class,
      ].filter(Boolean).join(' ');

      return createVNode('div', { class: treeClass }, flatData.map(node => renderTreeNode(node)));
    };
  },
});

export type { TreeProps, TreeSlots, TreeNode, TreeSetupProps } from './types';
