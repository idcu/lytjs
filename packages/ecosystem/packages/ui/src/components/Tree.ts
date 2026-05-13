/**
 * @lytjs/ui - Tree 组件
 *
 * 树形结构组件，支持拖拽、连接线、异步加载等功能
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
  isLeaf?: boolean;
  icon?: string;
  loading?: boolean;
}

/**
 * Tree 组件
 */
export const Tree = defineComponent({
  name: 'LytTree',

  props: {
    data: { type: Array, default: () => [] },
    defaultExpandAll: { type: Boolean, default: false },
    defaultExpandedKeys: { type: Array, default: () => [] },
    defaultCheckedKeys: { type: Array, default: () => [] },
    defaultSelectedKeys: { type: Array, default: () => [] },
    checkable: { type: Boolean, default: false },
    showCheckbox: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false },
    nodeKey: { type: String, default: 'id' },
    emptyText: { type: String, default: '暂无数据' },
    renderAfterExpand: { type: Boolean, default: true },
    highlightCurrent: { type: Boolean, default: false },
    showLine: { type: Boolean, default: false },
    class: { type: String, default: '' },
    load: { type: Function, default: undefined },
    onSelect: { type: Function, default: undefined },
    onCheck: { type: Function, default: undefined },
    onExpand: { type: Function, default: undefined },
    onDragStart: { type: Function, default: undefined },
    onDragEnd: { type: Function, default: undefined },
    onDrop: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    // 展开的节点
    const expandedKeys = signal<Set<string | number>>(new Set(props.defaultExpandedKeys));

    // 选中的节点
    const selectedKeys = signal<Set<string | number>>(new Set(props.defaultSelectedKeys));

    // 勾选的节点
    const checkedKeys = signal<Set<string | number>>(new Set(props.defaultCheckedKeys));

    // 当前高亮的节点
    const currentNode = signal<TreeNode | null>(null);

    // 加载状态节点
    const loadingKeys = signal<Set<string | number>>(new Set());

    // 拖拽状态
    const dragOverNode = signal<TreeNode | null>(null);
    const isDragging = signal(false);

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
      } else {
        // 使用默认展开的 keys
        props.defaultExpandedKeys.forEach((key: string | number) => {
          expandedKeys().add(key);
        });
      }
    };

    // 切换展开
    const toggleExpand = (node: TreeNode) => {
      if (node.disabled) return;

      const keys = expandedKeys();
      const isExpanding = !keys.has(node.id);

      if (isExpanding) {
        keys.add(node.id);
        // 异步加载子节点
        if (props.load && !node.children && !node.isLeaf) {
          handleLoad(node);
        }
      } else {
        keys.delete(node.id);
      }

      expandedKeys.set(new Set(keys));
      emit('expand', node, isExpanding);
      props.onExpand?.(node, isExpanding);
    };

    // 异步加载子节点
    const handleLoad = async (node: TreeNode) => {
      if (!props.load) return;

      loadingKeys().add(node.id);
      loadingKeys.set(new Set(loadingKeys()));

      try {
        const children = await props.load(node);
        node.children = children;
      } catch (error) {
        console.error('Load node failed:', error);
      } finally {
        loadingKeys().delete(node.id);
        loadingKeys.set(new Set(loadingKeys()));
      }
    };

    // 选择节点
    const selectNode = (node: TreeNode) => {
      if (node.disabled) return;

      selectedKeys.set(new Set([node.id]));
      if (props.highlightCurrent) {
        currentNode.set(node);
      }
      emit('node-click', node);
      props.onSelect?.(node);
    };

    // 勾选节点
    const checkNode = (node: TreeNode, e: Event) => {
      e.stopPropagation();
      if (node.disabled) return;

      const keys = checkedKeys();
      const isChecked = keys.has(node.id);

      if (isChecked) {
        keys.delete(node.id);
      } else {
        keys.add(node.id);
      }

      checkedKeys.set(new Set(keys));
      emit('check', node, !isChecked);
      props.onCheck?.(node, !isChecked);
    };

    // 拖拽开始
    const handleDragStart = (node: TreeNode, e: DragEvent) => {
      if (node.disabled || !props.draggable) return;
      isDragging.set(true);
      emit('drag-start', node, e);
      props.onDragStart?.(node, e);
    };

    // 拖拽结束
    const handleDragEnd = (node: TreeNode, e: DragEvent) => {
      isDragging.set(false);
      dragOverNode.set(null);
      emit('drag-end', node, e);
      props.onDragEnd?.(node, e);
    };

    // 拖拽进入
    const handleDragOver = (node: TreeNode, e: DragEvent) => {
      e.preventDefault();
      dragOverNode.set(node);
    };

    // 放置节点
    const handleDrop = (node: TreeNode, e: DragEvent) => {
      e.preventDefault();
      dragOverNode.set(null);
      emit('drop', node, e);
      props.onDrop?.(node, e);
    };

    // 渲染节点
    const renderNode = (node: TreeNode, level: number = 0): any => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedKeys().has(node.id);
      const isSelected = selectedKeys().has(node.id);
      const isChecked = checkedKeys().has(node.id);
      const isCurrent = currentNode() === node;
      const isLoading = loadingKeys().has(node.id);
      const isDragOver = dragOverNode() === node;

      const children: any[] = [];

      // 连接线
      if (props.showLine) {
        const lineClasses = ['lyt-tree__line'];
        if (level > 0) lineClasses.push(`lyt-tree__line--level-${level}`);
        children.push(createVNode('span', { class: lineClasses.join(' ') }, ''));
      }

      // 节点内容
      const contentChildren: any[] = [];

      // 展开/折叠图标
      const hasChildNodes = hasChildren || (props.load && !node.isLeaf);
      if (hasChildNodes) {
        if (isLoading) {
          contentChildren.push(
            createVNode('span', { class: 'lyt-tree__loading-icon' }, '⏳')
          );
        } else {
          contentChildren.push(
            createVNode('span', {
              class: `lyt-tree__expand-icon ${isExpanded ? 'lyt-tree__expand-icon--expanded' : ''}`,
              onClick: (e: Event) => { e.stopPropagation(); toggleExpand(node); },
            }, isExpanded ? '▼' : '▶')
          );
        }
      } else {
        contentChildren.push(createVNode('span', { class: 'lyt-tree__expand-placeholder' }, ''));
      }

      // 节点图标
      if (node.icon) {
        contentChildren.push(
          createVNode('span', { class: 'lyt-tree__node-icon' }, node.icon)
        );
      }

      // 复选框
      if (props.checkable || props.showCheckbox) {
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
          class: `lyt-tree__label 
            ${isSelected ? 'lyt-tree__label--selected' : ''} 
            ${node.disabled ? 'lyt-tree__label--disabled' : ''}
            ${isCurrent ? 'lyt-tree__label--current' : ''}
            ${isDragOver ? 'lyt-tree__label--drag-over' : ''}
          `,
          onClick: () => selectNode(node),
        }, slots.default ? slots.default({ node, data: node }) : node.label)
      );

      children.push(
        createVNode('div', {
          class: 'lyt-tree__node-content',
          style: `padding-left: ${level * 20}px;`,
          draggable: props.draggable && !node.disabled,
          ondragstart: (e: DragEvent) => handleDragStart(node, e),
          ondragend: (e: DragEvent) => handleDragEnd(node, e),
          ondragover: (e: DragEvent) => handleDragOver(node, e),
          ondrop: (e: DragEvent) => handleDrop(node, e),
        }, contentChildren)
      );

      // 子节点
      if (hasChildNodes && isExpanded && node.children) {
        const childNodes = node.children!.map(child => renderNode(child, level + 1));
        children.push(
          createVNode('div', { class: 'lyt-tree__children' }, childNodes)
        );
      }

      return createVNode('div', {
        class: `lyt-tree__node ${isDragOver ? 'lyt-tree__node--drag-over' : ''}`,
        'data-id': node.id,
      }, children);
    };

    // 生成类名
    const getTreeClass = () => {
      const classes = ['lyt-tree'];
      if (props.showLine) classes.push('lyt-tree--show-line');
      if (props.draggable) classes.push('lyt-tree--draggable');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      initExpandedKeys(props.data);

      let treeContent;

      if (props.data.length === 0) {
        treeContent = createVNode('div', { class: 'lyt-tree__empty' }, props.emptyText);
      } else {
        treeContent = props.data.map((node: TreeNode) => renderNode(node));
      }

      return createVNode('div', { class: getTreeClass() }, treeContent);
    };
  },
});

export default Tree;
export type { TreeNode };
