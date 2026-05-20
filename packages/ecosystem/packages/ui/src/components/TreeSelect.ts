/**
 * @lytjs/ui - TreeSelect 树形选择器组件
 *
 * 树形选择器组件，结合了 Select 和 Tree 功能
 */

import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';
import { getComboboxA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export interface TreeSelectNode {
  value: string | number;
  label: string;
  children?: TreeSelectNode[];
  disabled?: boolean;
}

export interface TreeSelectSetupProps {
  data: TreeSelectNode[];
  value: string | number;
  placeholder: string;
  multiple: boolean;
  clearable: boolean;
  filterable: boolean;
  filterPlaceholder: string;
  nodeKey: string;
  defaultExpandAll: boolean;
  defaultExpandedKeys: (string | number)[];
  class: string;
  style: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onChange: ((value: string | number, node: TreeSelectNode) => void) | undefined;
}

type NodeDict = Record<string, unknown>;

export const TreeSelect = defineComponent({
  name: 'LytTreeSelect',

  props: {
    data: { type: Array as () => TreeSelectNode[], default: () => [] },
    value: { type: [String, Number] as unknown as PropType<string | number>, default: '' },
    placeholder: { type: String, default: '请选择' },
    multiple: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '请输入搜索内容' },
    nodeKey: { type: String, default: 'value' },
    defaultExpandAll: { type: Boolean, default: false },
    defaultExpandedKeys: { type: Array as () => (string | number)[], default: () => [] },
    class: { type: String, default: '' },
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as unknown as TreeSelectSetupProps;
    const visible = signal(false);
    const filterQuery = signal('');
    const expandedKeys = signal<(string | number)[]>(
      _props.defaultExpandAll ? getAllNodeKeys(_props.data) : _props.defaultExpandedKeys,
    );
    const selectedLabel = signal('');

    function getAllNodeKeys(nodes: TreeSelectNode[]): (string | number)[] {
      const keys: (string | number)[] = [];
      const traverse = (nodeList: TreeSelectNode[]) => {
        for (const node of nodeList) {
          const nodeDict = node as unknown as NodeDict;
          const nodeValue = nodeDict[_props.nodeKey];
          if (typeof nodeValue === 'string' || typeof nodeValue === 'number') {
            keys.push(nodeValue);
          }
          if (node.children && node.children.length > 0) {
            traverse(node.children);
          }
        }
      };
      traverse(nodes);
      return keys;
    }

    const filteredData = (): TreeSelectNode[] => {
      const query = filterQuery();
      if (!query) return _props.data;

      const filterNodes = (nodes: TreeSelectNode[]): TreeSelectNode[] => {
        const result: TreeSelectNode[] = [];
        for (const node of nodes) {
          let filteredChildren: TreeSelectNode[] | undefined;
          if (node.children && node.children.length > 0) {
            filteredChildren = filterNodes(node.children);
          }

          const labelMatch = node.label.toLowerCase().includes(query.toLowerCase());
          const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

          if (labelMatch || hasMatchingChildren) {
            const filteredNode: TreeSelectNode = {
              ...node,
              children: hasMatchingChildren ? filteredChildren : node.children,
            };
            result.push(filteredNode);
          }
        }
        return result;
      };

      return filterNodes(_props.data);
    };

    const selectedNode = (): TreeSelectNode | null => {
      const findNode = (nodes: TreeSelectNode[]): TreeSelectNode | null => {
        for (const node of nodes) {
          const nodeDict = node as unknown as NodeDict;
          const nodeValue = nodeDict[_props.nodeKey];
          if (nodeValue === _props.value) {
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
    };

    const handleToggle = () => {
      visible.update((v) => !v);
    };

    const handleClear = () => {
      emit('update:value', '');
      _props.onChange?.('' as unknown as string | number, null as unknown as TreeSelectNode);
    };

    const handleSelect = (node: TreeSelectNode) => {
      if (node.disabled) return;
      const nodeDict = node as unknown as NodeDict;
      const nodeValue = nodeDict[_props.nodeKey] as string | number;
      emit('update:value', nodeValue);
      _props.onChange?.(nodeValue, node);
      selectedLabel.set(node.label);
      visible.set(false);
    };

    const handleToggleExpand = (node: TreeSelectNode, e: Event) => {
      e.stopPropagation();
      const nodeDict = node as unknown as NodeDict;
      const nodeKey = nodeDict[_props.nodeKey] as string | number;
      const keys = expandedKeys();
      if (keys.includes(nodeKey)) {
        expandedKeys.set(keys.filter((k) => k !== nodeKey));
      } else {
        expandedKeys.update((k) => [...k, nodeKey]);
      }
    };

    const getTreeSelectClass = () => {
      const classes = ['lyt-tree-select'];
      if (visible()) classes.push('is-visible');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getTreeSelectStyle = (): string | Record<string, string> => {
      if (!_props.style) return {};
      if (isString(_props.style)) return _props.style;
      if (isObject(_props.style)) return _props.style;
      return {};
    };

    const renderNode = (node: TreeSelectNode, level: number = 0): VNode => {
      const keys = expandedKeys();
      const nodeDict = node as unknown as NodeDict;
      const nodeKey = nodeDict[_props.nodeKey] as string | number;
      const isExpanded = keys.includes(nodeKey);
      const isSelected = nodeKey === _props.value;
      const hasChildren = node.children && node.children.length > 0;

      const nodeChildren: VNode[] = [];

      if (hasChildren) {
        const expandBtnProps = getButtonA11yProps({
          ariaLabel: isExpanded ? '收起' : '展开',
          disabled: node.disabled,
        });
        nodeChildren.push(
          createVNode(
            'span',
            mergeA11yProps(expandBtnProps, {
              class: ['lyt-tree-node-expand-icon', isExpanded ? 'is-expanded' : ''],
              onClick: (e: Event) => handleToggleExpand(node, e),
            }),
            [createVNode('span', {}, isExpanded ? '▼' : '▶')],
          ),
        );
      } else {
        nodeChildren.push(
          createVNode('span', { class: 'lyt-tree-node-expand-icon' }, [
            createVNode('span', {}, ''),
          ]),
        );
      }

      const labelBtnProps = getButtonA11yProps({
        ariaLabel: node.label,
        disabled: node.disabled,
      });
      nodeChildren.push(
        createVNode(
          'span',
          mergeA11yProps(labelBtnProps, {
            class: 'lyt-tree-node-label',
          }),
          [createVNode('span', {}, node.label)],
        ),
      );

      const nodeVNode = createVNode(
        'div',
        {
          class: [
            'lyt-tree-node',
            { 'is-selected': isSelected, 'is-disabled': node.disabled, 'is-expanded': isExpanded },
          ],
          style: { paddingLeft: `${level * 20}px` },
          onClick: () => handleSelect(node),
        },
        nodeChildren,
      );

      if (hasChildren && isExpanded && node.children) {
        const childNodes = node.children.map((child: TreeSelectNode) =>
          renderNode(child, level + 1),
        );
        return createVNode('div', { class: 'lyt-tree-node-wrapper' }, [nodeVNode, ...childNodes]);
      }

      return nodeVNode;
    };

    return () => {
      const children: VNode[] = [];

      const triggerChildren: VNode[] = [];

      const a11yProps = getComboboxA11yProps({
        id: _props.id,
        ariaLabel: _props.ariaLabel,
        ariaDescribedBy: _props.ariaDescribedBy,
        disabled: false,
        expanded: visible(),
        controls: undefined,
      });

      const currentNode = selectedNode();
      triggerChildren.push(
        createVNode(
          'span',
          { class: 'lyt-tree-select-value' },
          currentNode
            ? [createVNode('span', {}, currentNode.label)]
            : [createVNode('span', {}, _props.placeholder)],
        ),
      );

      if (_props.clearable && currentNode) {
        const clearBtnProps = getButtonA11yProps({ ariaLabel: '清除' });
        triggerChildren.push(
          createVNode(
            'span',
            mergeA11yProps(clearBtnProps, {
              class: 'lyt-tree-select-clear',
              onClick: (e: Event) => {
                e.stopPropagation();
                handleClear();
              },
            }),
            [createVNode('span', {}, '×')],
          ),
        );
      }

      triggerChildren.push(
        createVNode('span', { class: 'lyt-tree-select-arrow' }, [createVNode('span', {}, '▼')]),
      );

      children.push(
        createVNode(
          'div',
          mergeA11yProps(a11yProps, {
            class: 'lyt-tree-select-trigger',
            onClick: handleToggle,
          }),
          triggerChildren,
        ),
      );

      if (visible()) {
        const dropdownChildren: VNode[] = [];

        if (_props.filterable) {
          dropdownChildren.push(
            createVNode('div', { role: 'search', class: 'lyt-tree-select-search' }, [
              createVNode('input', {
                type: 'text',
                placeholder: _props.filterPlaceholder,
                value: filterQuery(),
                onInput: (e: Event) => {
                  const target = e.target as HTMLInputElement;
                  filterQuery.set(target.value);
                },
              }),
            ]),
          );
        }

        const treeChildren: VNode[] = [];
        const nodes = filteredData();
        if (nodes.length > 0) {
          for (const node of nodes) {
            treeChildren.push(renderNode(node, 0));
          }
        } else if (slots.empty) {
          const emptyContent = slots.empty();
          treeChildren.push(
            createVNode('div', { class: 'lyt-tree-select-empty' }, emptyContent as VNode[]),
          );
        } else {
          treeChildren.push(
            createVNode('div', { class: 'lyt-tree-select-empty' }, [
              createVNode('span', {}, '暂无数据'),
            ]),
          );
        }

        dropdownChildren.push(
          createVNode('div', { role: 'tree', class: 'lyt-tree-select-tree' }, treeChildren),
        );

        children.push(createVNode('div', { class: 'lyt-tree-select-dropdown' }, dropdownChildren));
      }

      return createVNode(
        'div',
        {
          class: getTreeSelectClass(),
          style: getTreeSelectStyle(),
        },
        children,
      );
    };
  },
});
