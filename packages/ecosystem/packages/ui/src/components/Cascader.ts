/**
 * @lytjs/ui - Cascader 组件
 *
 * 级联选择器组件，支持多选、懒加载、数据回显等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Cascader 选项数据结构
 */
interface CascaderOption {
  value: string | number;
  label: string;
  children?: CascaderOption[];
  disabled?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
}

/**
 * Cascader 组件
 */
export const Cascader = defineComponent({
  name: 'LytCascader',

  props: {
    options: { type: Array, default: () => [] },
    modelValue: { type: Array, default: () => [] },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    multiple: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },
    checkStrictly: { type: Boolean, default: false },
    showAllLevels: { type: Boolean, default: true },
    collapseTags: { type: Boolean, default: false },
    separator: { type: String, default: ' / ' },
    class: { type: String, default: '' },
    load: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onExpandChange: { type: Function, default: undefined },
    onVisibleChange: { type: Function, default: undefined },
    onRemoveTag: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: any, { emit }: any) {
    const isDropdownOpen = signal(false);
    const activePath = signal<(string | number)[]>([]);
    const selectedValues = signal<Array<(string | number)[]>>([]);
    const searchText = signal('');
    const isFiltering = signal(false);

    // 初始化选中值
    if (props.modelValue.length > 0) {
      if (props.multiple) {
        selectedValues.set([...props.modelValue]);
      } else {
        selectedValues.set(props.modelValue.length > 0 ? [props.modelValue] : []);
      }
    }

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

      selectedValues.set([]);
      activePath.set([]);
      searchText.set('');
      isFiltering.set(false);
      emit('update:modelValue', props.multiple ? [] : '');
      emit('clear');
      props.onClear?.();
    };

    // 移除标签
    const removeTag = (index: number, e?: Event) => {
      if (e) e.stopPropagation();
      if (props.disabled) return;

      const newValues = [...selectedValues()];
      newValues.splice(index, 1);
      selectedValues.set(newValues);
      emit('update:modelValue', props.multiple ? newValues : newValues[0] || '');
      emit('removeTag', newValues);
      props.onRemoveTag?.(newValues);
    };

    // 处理选项点击
    const handleOptionClick = (option: CascaderOption, path: (string | number)[]) => {
      if (option.disabled) return;

      // 更新激活路径
      activePath.set([...path]);
      emit('expandChange', activePath());
      props.onExpandChange?.(activePath());

      // 检查是否有子节点
      const hasChildren = option.children && option.children.length > 0;
      const isLeafNode = option.isLeaf || (!hasChildren && !props.load);

      if (isLeafNode) {
        // 叶子节点，选中
        if (props.multiple) {
          // 多选模式
          const currentSelected = selectedValues();
          const existingIndex = currentSelected.findIndex(
            (v) => JSON.stringify(v) === JSON.stringify(path)
          );

          if (existingIndex > -1) {
            // 已选中，取消选中
            const newValues = [...currentSelected];
            newValues.splice(existingIndex, 1);
            selectedValues.set(newValues);
          } else {
            // 未选中，添加
            selectedValues.set([...currentSelected, path]);
          }

          const finalValues = selectedValues();
          emit('update:modelValue', finalValues);
          emit('change', finalValues, path);
          props.onChange?.(finalValues, path);
        } else {
          // 单选模式
          selectedValues.set([path]);
          emit('update:modelValue', path);
          emit('change', path, path);
          props.onChange?.(path, path);
          toggleDropdown(false);
        }
      } else {
        // 非叶子节点，展开下一级
        if (props.load && !hasChildren && !option.isLeaf) {
          // 异步加载子节点
          handleLoad(option, path);
        }
      }
    };

    // 异步加载子节点
    const handleLoad = async (option: CascaderOption, path: (string | number)[]) => {
      if (!props.load) return;

      option.loading = true;

      try {
        const children = await props.load(option, path);
        option.children = children;
      } catch (error) {
        console.error('Load cascader options failed:', error);
      } finally {
        option.loading = false;
      }
    };

    // 处理输入搜索
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      searchText.set(target.value);
      isFiltering.set(props.filterable && searchText().length > 0);
    };

    // 过滤选项
    const filterOptions = (options: CascaderOption[], keyword: string): CascaderOption[] => {
      const result: CascaderOption[] = [];

      options.forEach((option) => {
        if (option.label.toLowerCase().includes(keyword.toLowerCase())) {
          result.push(option);
        }

        if (option.children && option.children.length > 0) {
          const filteredChildren = filterOptions(option.children, keyword);
          if (filteredChildren.length > 0) {
            result.push({ ...option, children: filteredChildren });
          }
        }
      });

      return result;
    };

    // 获取显示文本
    const getDisplayText = () => {
      const currentSelected = selectedValues();
      if (currentSelected.length === 0) {
        return '';
      }

      if (props.multiple) {
        // 多选模式，返回第一个
        const firstPath = currentSelected[0];
        return getOptionLabel(firstPath);
      }

      return getOptionLabel(currentSelected[0]);
    };

    // 获取选项标签
    const getOptionLabel = (path: (string | number)[]) => {
      const labels: string[] = [];
      let currentOptions = props.options;

      path.forEach((value) => {
        const option = currentOptions.find((o: CascaderOption) => o.value === value);
        if (option) {
          labels.push(option.label);
          currentOptions = option.children || [];
        }
      });

      return labels.join(props.separator);
    };

    // 渲染选项列表
    const renderOptions = (options: CascaderOption[], path: (string | number)[] = [], level: number = 0) => {
      if (options.length === 0) return null;

      const items = options.map((option) => {
        const currentActivePath = activePath();
        const currentSelected = selectedValues();
        const isActive = currentActivePath[level] === option.value;
        const isSelected = currentSelected.some(
          (p) => p[level] === option.value
        );

        const hasChildren = option.children && option.children.length > 0;
        const childPath = [...path, option.value];

        return createVNode(
          'li',
          {
            class: `lyt-cascader-option 
              ${isActive ? 'lyt-cascader-option--active' : ''} 
              ${isSelected ? 'lyt-cascader-option--selected' : ''} 
              ${option.disabled ? 'lyt-cascader-option--disabled' : ''}`,
            onClick: () => handleOptionClick(option, childPath),
          },
          [
            option.label,
            option.loading ? createVNode('span', { class: 'lyt-cascader-loading' }, '⏳') : 
            (hasChildren || (props.load && !option.isLeaf)) ? 
              createVNode('span', { class: 'lyt-cascader-arrow' }, '›') : null,
          ]
        );
      });

      return createVNode('ul', { class: 'lyt-cascader-menu' }, items);
    };

    // 生成类名
    const getCascaderClass = () => {
      const classes = ['lyt-cascader'];
      if (isDropdownOpen()) classes.push('lyt-cascader--open');
      if (props.multiple) classes.push('lyt-cascader--multiple');
      if (props.disabled) classes.push('lyt-cascader--disabled');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const displayText = getDisplayText();
      const currentIsFiltering = isFiltering();
      const currentSearchText = searchText();
      const filteredOptions = currentIsFiltering 
        ? filterOptions(props.options, currentSearchText) 
        : props.options;

      // 构建下拉菜单
      const menus: any[] = [];
      
      if (currentIsFiltering) {
        // 搜索模式，只渲染过滤后的选项
        menus.push(renderOptions(filteredOptions, [], 0));
      } else {
        // 正常模式，渲染级联菜单
        let currentOptions = props.options;
        let currentPath: (string | number)[] = [];

        menus.push(renderOptions(currentOptions, [], 0));

        activePath().forEach((value, level) => {
          const option = currentOptions.find((o: CascaderOption) => o.value === value);
          if (option && option.children) {
            currentOptions = option.children;
            currentPath.push(value);
            menus.push(renderOptions(currentOptions, currentPath, level + 1));
          }
        });
      }

      const dropdown = isDropdownOpen() ? createVNode(
        'div',
        { class: 'lyt-cascader-dropdown' },
        menus
      ) : null;

      // 渲染标签（多选模式）
      const currentSelected = selectedValues();
      const tags = props.multiple && currentSelected.length > 0 ? 
        currentSelected.map((path, index) => {
          return createVNode(
            'span',
            { class: 'lyt-cascader-tag' },
            [
              getOptionLabel(path),
              createVNode(
                'span',
                { 
                  class: 'lyt-cascader-tag-close',
                  onClick: (e: Event) => removeTag(index, e) 
                },
                '×'
              )
            ]
          );
        }) : null;

      return createVNode(
        'div',
        { class: getCascaderClass() },
        [
          createVNode(
            'div',
            { 
              class: 'lyt-cascader-input-wrapper',
              onClick: () => toggleDropdown() 
            },
            [
              tags,
              createVNode(
                'input',
                {
                  type: 'text',
                  class: 'lyt-cascader-input',
                  placeholder: currentSelected.length === 0 ? props.placeholder : '',
                  value: currentIsFiltering ? currentSearchText : displayText,
                  disabled: props.disabled,
                  onInput: handleInput,
                  readonly: !props.filterable,
                }
              ),
              props.clearable && currentSelected.length > 0 ? 
                createVNode(
                  'span',
                  { 
                    class: 'lyt-cascader-clear',
                    onClick: (e: Event) => clearValue(e) 
                  },
                  '×'
                ) : null,
              createVNode(
                'span',
                { class: `lyt-cascader-icon ${isDropdownOpen() ? 'lyt-cascader-icon--open' : ''}` },
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

export default Cascader;
export type { CascaderOption };
