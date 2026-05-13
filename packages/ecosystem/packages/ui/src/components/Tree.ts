/**
 * @lytjs/ui - Tree 组件
 *
 * 树形结构组件
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * TreeNode 数据结构
 */
interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  disabled?: boolean;
  expanded?: boolean;
}

/**
 * Tree 组件
 */
export const Tree = defineComponent({
  name: 'LytTree',

  props: {
    data: { type: Array, default: () => [] },
    defaultExpandAll: { type: Boolean, default: false },
    checkable: { type: Boolean, default: false },
    checkedKeys: { type: Array, default: () => [] },
    selectedKeys: { type: Array, default: () => [] },
    class: { type: String, default: '' },
    onSelect: { type: Function, default: undefined },
    onCheck: { type: Function, default: undefined },
    onExpand: { type: Function, default: undefined },
  },

  setup(props: any, { emit: _emit }: any) {
    // 展开的节点
    const expandedKeys = signal<Set<string | number>>(new Set());

    // 选中的节点
    const selectedKeys = signal<Set<string | number>>(new Set(props.selectedKeys));

    // 勾选的节点
    const checkedKeys = signal<Set<string | number>>(new Set(props.checkedKeys));

    // 初始化展开状态
    const initExpandedKeys = (nodes: TreeNode[]) => {
      if (props.defaultExpandAll) {
        const expand = (items: TreeNode[]) => {
          for (const item of items) {
            expandedKeys().add(item.id);
            if (item.children) {
              expand(item.children);
            }
          }
        };
        expand(nodes);
      }
    };

    // 切换展开
    const toggleExpand = (node: TreeNode) => {
      if (node.disabled) return;
      
      const keys = expandedKeys();
      if (keys.has(node.id)) {
        keys.delete(node.id);
      } else {
        keys.add(node.id);
      }
      expandedKeys.set(new Set(keys));
      props.onExpand?.(node, keys.has(node.id));
    };

    // 选择节点
    const selectNode = (node: TreeNode) => {
      if (node.disabled) return;
      
      selectedKeys.set(new Set([node.id]));
      props.onSelect?.(node);
    };

    // 勾选节点
    const checkNode = (node: TreeNode, e: Event) => {
      e.stopPropagation();
      if (node.disabled) return;
      
      const keys = checkedKeys();
      if (keys.has(node.id)) {
        keys.delete(node.id);
      } else {
        keys.add(node.id);
      }
      checkedKeys.set(new Set(keys));
      props.onCheck?.(node, keys.has(node.id));
    };

    // 渲染节点
    const renderNode = (node: TreeNode, level: number = 0): any => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedKeys().has(node.id);
      const isSelected = selectedKeys().has(node.id);
      const isChecked = checkedKeys().has(node.id);

      const children: any[] = [];

      // 节点内容
      const contentChildren: any[] = [];

      // 展开/折叠图标
      if (hasChildren) {
        contentChildren.push(
          createVNode('span', {
            class: `lyt-tree__expand-icon ${isExpanded ? 'lyt-tree__expand-icon--expanded' : ''}`,
            onClick: (e: Event) => { e.stopPropagation(); toggleExpand(node); },
          }, isExpanded ? '▼' : '▶')
        );
      } else {
        contentChildren.push(createVNode('span', { class: 'lyt-tree__expand-placeholder' }, ''));
      }

      // 复选框
      if (props.checkable) {
        contentChildren.push(
          createVNode('span', {
            class: `lyt-tree__checkbox ${isChecked ? 'lyt-tree__checkbox--checked' : ''}`,
            onClick: (e: Event) => checkNode(node, e),
          }, isChecked ? '☑' : '☐')
        );
      }

      // 标签
      contentChildren.push(
        createVNode('span', {
          class: `lyt-tree__label ${isSelected ? 'lyt-tree__label--selected' : ''} ${node.disabled ? 'lyt-tree__label--disabled' : ''}`,
          onClick: () => selectNode(node),
        }, node.label)
      );

      children.push(
        createVNode('div', {
          class: 'lyt-tree__node-content',
          style: `padding-left: ${level * 20}px;`,
        }, contentChildren)
      );

      // 子节点
      if (hasChildren && isExpanded) {
        const childNodes = node.children!.map(child => renderNode(child, level + 1));
        children.push(
          createVNode('div', { class: 'lyt-tree__children' }, childNodes)
        );
      }

      return createVNode('div', {
        class: 'lyt-tree__node',
        'data-id': node.id,
      }, children);
    };

    // 生成类名
    const getTreeClass = () => {
      const classes = ['lyt-tree'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      initExpandedKeys(props.data);
      
      const nodes = props.data.map((node: TreeNode) => renderNode(node));
      
      return createVNode('div', { class: getTreeClass() }, nodes);
    };
  },
});

export default Tree;
export type { TreeNode };
