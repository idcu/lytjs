/**
 * @lytjs/ui - TreeSelect 树形选择器组件
 *
 * 树形选择器组件，结合了 Select 和 Tree 功能
 *
 * @beta 2026-10-26 全维度审计列为**半成品**：主要路径可用，
 *       边界条件 / 交互闭环 / 键盘可达性未系统覆盖。
 *       成熟度表见 `src/component-status.ts`（单一真相源）。
 */

import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode, signal } from '@lytjs/core/runtime';
import { isString, isObject } from '@lytjs/common-is';
import {
  getComboboxA11yProps,
  getButtonA11yProps,
  getInputControlA11yProps,
  mergeA11yProps,
} from '@lytjs/common-a11y';

export interface TreeSelectNode {
  value: string | number;
  label: string;
  children?: TreeSelectNode[];
  disabled?: boolean;
}

export interface TreeSelectSetupProps {
  /** @deprecated 使用 `options`；两者同时提供时以 `options` 为准。保留仅为向后兼容。 */
  data?: TreeSelectNode[];
  options?: TreeSelectNode[];
  disabled: boolean;
  /** 单选为标量；multiple 时为数组 */
  modelValue: string | number | (string | number)[];
  placeholder: string;
  multiple: boolean;
  clearable: boolean;
  /**
   * 是否渲染复选框。**仅在 `multiple=true` 时生效**；单选下该 prop 被忽略。
   * 开启后点击节点行/label 走级联勾选，不再是原有的单选/多选选中语义。
   */
  showCheckbox: boolean;
  /**
   * 父子勾选互不影响。仅在 `showCheckbox && multiple` 时有意义；
   * 为 true 时不做级联、不产生半选。
   */
  checkStrictly: boolean;
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
  onChange:
    | ((value: string | number | (string | number)[], node: TreeSelectNode) => void)
    | undefined;
}

type NodeDict = Record<string, unknown>;

export const TreeSelect = defineComponent({
  name: 'LytTreeSelect',

  props: {
    /** @deprecated 使用 `options`；两者同时提供时以 `options` 为准。 */
    data: { type: Array as () => TreeSelectNode[], default: undefined },
    options: { type: Array as () => TreeSelectNode[], default: undefined },
    disabled: { type: Boolean, default: false },
    modelValue: {
      type: [String, Number, Array] as unknown as PropType<string | number | (string | number)[]>,
      default: '',
    },
    placeholder: { type: String, default: '请选择' },
    multiple: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    /** 仅 `multiple=true` 时生效；单选下忽略。 */
    showCheckbox: { type: Boolean, default: false },
    /** 仅 `showCheckbox && multiple` 时有意义；父子互不影响。 */
    checkStrictly: { type: Boolean, default: false },
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

    /** 数据源：`options` 为契约；`data` 是 deprecated 别名，两者都给时 options 优先。 */
    const treeData = (): TreeSelectNode[] => {
      if (Array.isArray(_props.options)) return _props.options;
      return Array.isArray(_props.data) ? _props.data : [];
    };

    const visible = signal(false);
    const filterQuery = signal('');
    const expandedKeys = signal<(string | number)[]>(
      _props.defaultExpandAll ? getAllNodeKeys(treeData()) : _props.defaultExpandedKeys,
    );

    /** 多选当前值（非数组入参按空集处理） */
    const multiValues = (): (string | number)[] =>
      Array.isArray(_props.modelValue) ? _props.modelValue : [];

    function getAllNodeKeys(nodes: TreeSelectNode[]): (string | number)[] {
      const keys: (string | number)[] = [];
      const traverse = (nodeList: TreeSelectNode[]) => {
        for (const node of nodeList) {
          const nodeValue = nodeValueOf(node);
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
      if (!query) return treeData();

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

      return filterNodes(treeData());
    };

    const findNodeByValue = (
      nodes: TreeSelectNode[],
      value: string | number,
    ): TreeSelectNode | null => {
      for (const node of nodes) {
        if (nodeValueOf(node) === value) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeByValue(node.children, value);
          if (found) return found;
        }
      }
      return null;
    };

    const selectedNode = (): TreeSelectNode | null => {
      const v = _props.modelValue;
      if (typeof v !== 'string' && typeof v !== 'number') return null;
      return findNodeByValue(treeData(), v);
    };

    /** 节点值（按 `nodeKey` 取值） */
    function nodeValueOf(node: TreeSelectNode): string | number {
      return (node as unknown as NodeDict)[_props.nodeKey] as string | number;
    }

    const childrenOf = (node: TreeSelectNode): TreeSelectNode[] =>
      Array.isArray(node.children) ? node.children : [];

    /** 收集节点自身及全部后代的 key（深度优先，自身在前） */
    const collectSubtreeValues = (node: TreeSelectNode): (string | number)[] => {
      const values: (string | number)[] = [nodeValueOf(node)];
      for (const child of childrenOf(node)) values.push(...collectSubtreeValues(child));
      return values;
    };

    /** 完整数据源的 value → 父节点 value 映射（顶层为 null） */
    const buildParentMap = (): Map<string | number, string | number | null> => {
      const map = new Map<string | number, string | number | null>();
      const walk = (nodes: TreeSelectNode[], parent: string | number | null) => {
        for (const node of nodes) {
          const value = nodeValueOf(node);
          map.set(value, parent);
          walk(childrenOf(node), value);
        }
      };
      walk(treeData(), null);
      return map;
    };

    /** 子树内是否有任一节点在值数组中（用于半选判定） */
    const subtreeHasChecked = (node: TreeSelectNode, values: (string | number)[]): boolean => {
      if (values.includes(nodeValueOf(node))) return true;
      return childrenOf(node).some((child) => subtreeHasChecked(child, values));
    };

    /** 勾选态：checked / unchecked / indeterminate（仅非 checkStrictly 会产生半选） */
    const checkStateOf = (node: TreeSelectNode): 'checked' | 'unchecked' | 'indeterminate' => {
      const values = multiValues();
      if (values.includes(nodeValueOf(node))) return 'checked';
      if (_props.checkStrictly) return 'unchecked';
      return childrenOf(node).some((child) => subtreeHasChecked(child, values))
        ? 'indeterminate'
        : 'unchecked';
    };

    /**
     * 复选框勾选（仅 `multiple && showCheckbox` 路径）。
     *
     * - 非 `checkStrictly`：勾父选全部后代；子全选时父进入值数组；部分子选中父半选
     *   （父不进数组）。祖先自底向上重算，保证「全选才算选中」。
     * - `checkStrictly`：只改自身，不向上/向下传播，无半选。
     */
    const handleCheck = (node: TreeSelectNode) => {
      if (_props.disabled || node.disabled) return;
      const value = nodeValueOf(node);
      const current = multiValues();
      let next: (string | number)[];

      if (_props.checkStrictly) {
        next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      } else {
        const set = new Set(current);
        const subtreeValues = collectSubtreeValues(node);
        if (current.includes(value)) {
          for (const v of subtreeValues) set.delete(v);
        } else {
          for (const v of subtreeValues) set.add(v);
        }

        const parentMap = buildParentMap();
        let parentValue = parentMap.get(value) ?? null;
        while (parentValue !== null) {
          const parentNode = findNodeByValue(treeData(), parentValue);
          if (!parentNode) break;
          const allChildrenChecked = childrenOf(parentNode).every((child) =>
            set.has(nodeValueOf(child)),
          );
          if (allChildrenChecked) set.add(parentValue);
          else set.delete(parentValue);
          parentValue = parentMap.get(parentValue) ?? null;
        }
        next = Array.from(set);
      }

      emit('update:modelValue', next);
      _props.onChange?.(next, node);
    };

    const handleToggle = () => {
      if (_props.disabled) return;
      visible.update((v) => !v);
    };

    /** 键盘展开与点击共用同一守卫，disabled 时不得绕过。 */
    const handleTriggerKeydown = (e: KeyboardEvent) => {
      if (_props.disabled) return;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !visible()) {
        e.preventDefault();
        handleToggle();
      } else if (e.key === 'Escape' && visible()) {
        e.preventDefault();
        handleToggle();
      }
    };

    const handleClear = () => {
      if (_props.disabled) return;
      if (_props.multiple) {
        emit('update:modelValue', []);
        _props.onChange?.([], null as unknown as TreeSelectNode);
        return;
      }
      emit('update:modelValue', '');
      _props.onChange?.('' as unknown as string | number, null as unknown as TreeSelectNode);
    };

    const handleSelect = (node: TreeSelectNode) => {
      if (_props.disabled || node.disabled) return;
      const nodeValue = nodeValueOf(node);
      if (_props.multiple) {
        // 多选：切换选中态并保持下拉展开，便于连续勾选
        const current = multiValues();
        const next = current.includes(nodeValue)
          ? current.filter((v) => v !== nodeValue)
          : [...current, nodeValue];
        emit('update:modelValue', next);
        _props.onChange?.(next, node);
        return;
      }
      emit('update:modelValue', nodeValue);
      _props.onChange?.(nodeValue, node);
      visible.set(false);
    };

    const handleToggleExpand = (node: TreeSelectNode, e: Event) => {
      e.stopPropagation();
      if (_props.disabled) return;
      const nodeKey = nodeValueOf(node);
      const keys = expandedKeys();
      if (keys.includes(nodeKey)) {
        expandedKeys.set(keys.filter((k) => k !== nodeKey));
      } else {
        expandedKeys.update((k) => [...k, nodeKey]);
      }
    };

    const getTreeSelectClass = () => {
      const classes = ['lyt-tree-select'];
      // `is-multiple` 供样式区分多选（单选是一行文本，多选是标签列表）
      if (_props.multiple) classes.push('is-multiple');
      if (_props.disabled) classes.push('is-disabled');
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
      const nodeKey = nodeValueOf(node);
      // 过滤期间强制展开命中父链，否则深层命中项不可见
      const isExpanded = filterQuery().length > 0 || keys.includes(nodeKey);
      const isSelected = _props.multiple
        ? multiValues().includes(nodeKey)
        : nodeKey === _props.modelValue;
      const hasChildren = node.children && node.children.length > 0;
      // 复选框仅在多选下生效；单选保持既有 DOM 与交互不变
      const usesCheckbox = _props.multiple && _props.showCheckbox;

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

      if (usesCheckbox) {
        const state = checkStateOf(node);
        const checked = state === 'checked';
        const indeterminate = state === 'indeterminate';
        const checkDisabled = _props.disabled || node.disabled;
        const checkboxClasses = ['lyt-checkbox'];
        if (checked) checkboxClasses.push('lyt-checkbox--checked');
        if (indeterminate) checkboxClasses.push('lyt-checkbox--indeterminate');
        if (checkDisabled) checkboxClasses.push('lyt-checkbox--disabled');

        const checkboxA11y = getInputControlA11yProps({
          ariaLabel: node.label,
          disabled: checkDisabled,
          checked: checked ? true : indeterminate ? 'mixed' : false,
        });

        nodeChildren.push(
          createVNode(
            'label',
            {
              class: checkboxClasses.join(' '),
              // 勾选框自己处理 change；阻止冒泡避免行点击再走一次级联
              onClick: (e: Event) => e.stopPropagation(),
            },
            [
              createVNode(
                'input',
                mergeA11yProps(checkboxA11y, {
                  type: 'checkbox',
                  class: 'lyt-checkbox__input',
                  checked,
                  disabled: checkDisabled,
                  onChange: () => handleCheck(node),
                }),
                [],
              ),
              createVNode('span', { class: 'lyt-checkbox__inner' }, []),
            ],
          ),
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
          onClick: () => (usesCheckbox ? handleCheck(node) : handleSelect(node)),
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
        disabled: _props.disabled,
        expanded: visible(),
        controls: undefined,
      });

      const currentNode = _props.multiple ? null : selectedNode();
      const multiLabels = _props.multiple
        ? multiValues()
            .map((v) => findNodeByValue(treeData(), v)?.label)
            .filter((l): l is string => Boolean(l))
        : [];
      const displayText = _props.multiple
        ? multiLabels.length > 0
          ? multiLabels.join('、')
          : _props.placeholder
        : currentNode
          ? currentNode.label
          : _props.placeholder;
      triggerChildren.push(
        createVNode('span', { class: 'lyt-tree-select-value' }, [
          createVNode('span', {}, displayText),
        ]),
      );

      const hasValue = _props.multiple ? multiLabels.length > 0 : currentNode !== null;
      if (_props.clearable && hasValue) {
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
            onKeydown: handleTriggerKeydown,
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
