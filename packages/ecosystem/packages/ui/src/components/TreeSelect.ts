/**
 * @lytjs/ui - TreeSelect 组件
 *
 * 树形选择器组件，支持异步加载、节点禁用、回显、清空功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * TreeSelect 选项数据结构
 */
interface TreeSelectOption {
  value: string | number;
  label: string;
  children?: TreeSelectOption[];
  disabled?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
}

/**
 * TreeSelect 组件
 */
export const TreeSelect = defineComponent({
  name: 'LytTreeSelect',

  props: {
    data: { type: Array, default: () => [] },
    modelValue: { type: [String, Number, Array], default: '' },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    multiple: { type: Boolean, default: false },
    nodeKey: { type: String, default: 'value' },
    defaultExpandAll: { type: Boolean, default: false },
    defaultExpandedKeys: { type: Array, default: () => [] },
    class: { type: String, default: '' },
    load: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onExpand: { type: Function, default: undefined },
    onVisibleChange: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: any, { emit }: any) {
    const isDropdownOpen = signal(false);
    const expandedKeys = signal<Set<string | number>>(new Set(props.defaultExpandedKeys));
    const selectedValues = signal<Set<string | number>>(new Set());
    const loadingKeys = signal<Set<string | number>>(new Set());

    // 初始化选中值
    const initSelectedValues = () => {
      const values = new Set<string | number>();
      if (props.multiple && Array.isArray(props.modelValue)) {
        props.modelValue.forEach((v: string | number) => values.add(v));
      } else if (!props.multiple && props.modelValue) {
        values.add(props.modelValue);
      }
      selectedValues.set(values);
    };

    // 初始化展开状态
    const initExpandedKeys = (nodes: TreeSelectOption[]) => {
      if (props.defaultExpandAll) {
        const expand = (items: TreeSelectOption[]) => {
          for (const item of items) {
            expandedKeys().add(item.value);
            if (item.children) {
              expand(item.children);
            }
          }
        };
        expand(nodes);
      } else {
        props.defaultExpandedKeys.forEach((key: string | number) => {
          expandedKeys().add(key);
        });
      }
    };

    initSelectedValues();

    // 切换下拉菜单
    const toggleDropdown = (visible?: boolean) => {
      if (props.disabled) return;

      if (typeof visible === 'boolean') {
        isDropdownOpen.set(visible);
      } else {
        isDropdownOpen.set(!isDropdownOpen());
      }

      emit('visibleChange', isDropdownOpen());
      props.onVisibleChange?.(isDropdownOpen());
    };

    // 清除选中值
    const clearValue = (e?: Event) => {
      if (e) e.stopPropagation();
      if (props.disabled) return;

      selectedValues.set(new Set());
      emit('update:modelValue', props.multiple ? [] : '');
      emit('clear');
      props.onClear?.();
    };

    // 切换展开
    const toggleExpand = (node: TreeSelectOption, e: Event) => {
      e.stopPropagation();
      if (node.disabled) return;

      const keys = expandedKeys();
      const isExpanding = !keys.has(node.value);

      if (isExpanding) {
        keys.add(node.value);
        // 异步加载子节点
        if (props.load && !node.children && !node.isLeaf) {
          handleLoad(node);
        }
      } else {
        keys.delete(node.value);
      }

      expandedKeys.set(new Set(keys));
      emit('expand', node, isExpanding);
      props.onExpand?.(node, isExpanding);
    };

    // 异步加载子节点
    const handleLoad = async (node: TreeSelectOption) => {
      if (!props.load) return;

      loadingKeys().add(node.value);
      loadingKeys.set(new Set(loadingKeys()));

      try {
        const children = await props.load(node);
        node.children = children;
      } catch (error) {
        console.error('Load node failed:', error);
      } finally {
        loadingKeys().delete(node.value);
        loadingKeys.set(new Set(loadingKeys()));
      }
    };

    // 选择节点
    const selectNode = (node: TreeSelectOption) => {
      if (node.disabled) return;

      const currentSelected = selectedValues();

      if (props.multiple) {
        const newValues = new Set(currentSelected);
        if (newValues.has(node.value)) {
          newValues.delete(node.value);
        } else {
          newValues.add(node.value);
        }
        selectedValues.set(newValues);
        emit('update:modelValue', Array.from(newValues));
        emit('change', Array.from(newValues), node);
        props.onChange?.(Array.from(newValues), node);
      } else {
        selectedValues.set(new Set([node.value]));
        emit('update:modelValue', node.value);
        emit('change', node.value, node);
        props.onChange?.(node.value, node);
        toggleDropdown(false);
      }
    };

    // 获取显示标签
    const getDisplayLabel = () => {
      const currentSelected = selectedValues();
      if (currentSelected.size === 0) {
        return '';
      }

      const findLabel = (nodes: TreeSelectOption[], value: string | number): string | null => {
        for (const node of nodes) {
          if (node.value === value) {
            return node.label;
          }
          if (node.children) {
            const label = findLabel(node.children, value);
            if (label) return label;
          }
        }
        return null;
      };

      if (props.multiple) {
        const labels: string[] = [];
        currentSelected.forEach((value) => {
          const label = findLabel(props.data, value);
          if (label) labels.push(label);
        });
        return labels.join(', ');
      } else {
        const value = Array.from(currentSelected)[0];
        return findLabel(props.data, value) || '';
      }
    };

    // 渲染节点
    const renderNode = (node: TreeSelectOption, level: number = 0): any => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedKeys().has(node.value);
      const isSelected = selectedValues().has(node.value);
      const isLoading = loadingKeys().has(node.value);

      const children: any[] = [];

      // 展开/折叠图标
      const hasChildNodes = hasChildren || (props.load && !node.isLeaf);
      if (hasChildNodes) {
        if (isLoading) {
          children.push(
            createVNode('span', { class: 'lyt-tree-select__loading-icon' }, '⏳')
          );
        } else {
          children.push(
            createVNode('span', {
              class: `lyt-tree-select__expand-icon ${isExpanded ? 'lyt-tree-select__expand-icon--expanded' : ''}`,
              onClick: (e: Event) => toggleExpand(node, e),
            }, isExpanded ? '▼' : '▶')
          );
        }
      } else {
        children.push(createVNode('span', { class: 'lyt-tree-select__expand-placeholder' }, ''));
      }

      // 标签
      children.push(
        createVNode('span', {
          class: `lyt-tree-select__label 
            ${isSelected ? 'lyt-tree-select__label--selected' : ''} 
            ${node.disabled ? 'lyt-tree-select__label--disabled' : ''}
          `,
          onClick: () => selectNode(node),
        }, node.label)
      );

      const nodeChildren: any[] = [
        createVNode('div', {
          class: 'lyt-tree-select__node-content',
          style: `padding-left: ${level * 20}px;`,
        }, children)
      ];

      // 子节点
      if (hasChildNodes && isExpanded && node.children) {
        const childNodes = node.children.map(child => renderNode(child, level + 1));
        nodeChildren.push(
          createVNode('div', { class: 'lyt-tree-select__children' }, childNodes)
        );
      }

      return createVNode('div', {
        class: 'lyt-tree-select__node',
        'data-value': node.value,
      }, nodeChildren);
    };

    // 生成类名
    const getTreeSelectClass = () => {
      const classes = ['lyt-tree-select'];
      if (isDropdownOpen()) classes.push('lyt-tree-select--open');
      if (props.multiple) classes.push('lyt-tree-select--multiple');
      if (props.disabled) classes.push('lyt-tree-select--disabled');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      initExpandedKeys(props.data);

      const displayLabel = getDisplayLabel();

      // 渲染树形结构
      let treeContent;
      if (props.data.length === 0) {
        treeContent = createVNode('div', { class: 'lyt-tree-select__empty' }, '暂无数据');
      } else {
        treeContent = props.data.map((node: TreeSelectOption) => renderNode(node));
      }

      const dropdown = isDropdownOpen() ? createVNode(
        'div',
        { class: 'lyt-tree-select__dropdown' },
        treeContent
      ) : null;

      return createVNode(
        'div',
        { class: getTreeSelectClass() },
        [
          createVNode(
            'div',
            {
              class: 'lyt-tree-select__input-wrapper',
              onClick: () => toggleDropdown()
            },
            [
              createVNode(
                'span',
                { class: 'lyt-tree-select__input' },
                selectedValues().size === 0 ? props.placeholder : displayLabel
              ),
              props.clearable && selectedValues().size > 0 ?
                createVNode(
                  'span',
                  {
                    class: 'lyt-tree-select__clear',
                    onClick: (e: Event) => clearValue(e)
                  },
                  '×'
                ) : null,
              createVNode(
                'span',
                { class: `lyt-tree-select__icon ${isDropdownOpen() ? 'lyt-tree-select__icon--open' : ''}` },
                isDropdownOpen() ? '▲' : '▼'
              ),
            ]
          ),
          dropdown,
        ]
      );
    };
  },
});

export default TreeSelect;
export type { TreeSelectOption };
