/**
 * @lytjs/ui - Cascader 组件
 *
 * 级联选择器组件，支持多选、懒加载、数据回显等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { CascaderOption, CascaderSetupProps, CascaderSlots } from './types';
import { getComboboxA11yProps, getButtonA11yProps, getGroupA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export const Cascader = defineComponent({
  name: 'LytCascader',

  props: {
    options: { type: Array, default: (): CascaderOption[] => [] },
    modelValue: { type: Array, default: (): (string | number)[] => [] },
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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    load: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onExpandChange: { type: Function, default: undefined },
    onVisibleChange: { type: Function, default: undefined },
    onRemoveTag: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: CascaderSlots }) {
    const p = props as CascaderSetupProps;
    const isDropdownOpen = signal(false);
    const activePath = signal<(string | number)[]>([]);
    const selectedValues = signal<Array<(string | number)[]>>([]);
    const searchText = signal('');
    const isFiltering = signal(false);

    if (p.modelValue.length > 0) {
      if (p.multiple) {
        selectedValues.set([...(p.modelValue as Array<(string | number)[]>)]);
      } else {
        selectedValues.set([(p.modelValue as (string | number)[])]);
      }
    }

    const toggleDropdown = (visible?: boolean) => {
      if (p.disabled) return;

      if (typeof visible === 'boolean') {
        isDropdownOpen.set(visible);
      } else {
        isDropdownOpen.set(!isDropdownOpen());
      }
      p.onVisibleChange?.(isDropdownOpen());
    };

    const clear = () => {
      selectedValues.set([]);
      activePath.set([]);
      isDropdownOpen.set(false);
      p.onClear?.();
      p.onChange?.([]);
    };

    const removeTag = (index: number) => {
      if (p.disabled) return;

      const newSelected = [...selectedValues()];
      newSelected.splice(index, 1);
      selectedValues.set(newSelected);
      p.onRemoveTag?.(newSelected);
      p.onChange?.(newSelected);
    };

    const selectOption = (option: CascaderOption, level: number) => {
      if (option.disabled) return;

      const newPath = [...activePath().slice(0, level), option.value];
      activePath.set(newPath);

      const nextOptions = option.children || [];

      if (option.isLeaf) {
        if (p.multiple) {
          const exists = selectedValues().some(item => item.join('-') === newPath.join('-'));
          const newSelected = exists
            ? selectedValues().filter(item => item.join('-') !== newPath.join('-'))
            : [...selectedValues(), newPath];
          selectedValues.set(newSelected);
          p.onChange?.(newSelected);
        } else {
          selectedValues.set([newPath]);
          isDropdownOpen.set(false);
          p.onChange?.(newPath);
        }
      } else if (nextOptions.length === 0 && p.load) {
        option.loading = true;
        p.load(option, (children: CascaderOption[]) => {
          option.loading = false;
          option.children = children;
        });
      }
    };

    const getOptionsAtLevel = (level: number): CascaderOption[] => {
      if (isFiltering()) {
        const keyword = searchText().toLowerCase();
        return filterOptions(p.options, keyword);
      }

      let options: CascaderOption[] = [...p.options];
      for (let i = 0; i < level; i++) {
        const found = options.find(opt => opt.value === activePath()[i]);
        options = found?.children || [];
        if (options.length === 0) break;
      }
      return options;
    };

    const filterOptions = (options: CascaderOption[], keyword: string): CascaderOption[] => {
      return options.reduce((acc: CascaderOption[], option) => {
        const match = option.label.toLowerCase().includes(keyword);
        const children = option.children ? filterOptions(option.children, keyword) : [];

        if (match || children.length > 0) {
          acc.push({ ...option, children: children.length > 0 ? children : undefined });
        }
        return acc;
      }, []);
    };

    const getDisplayText = (): string => {
      const values = selectedValues();

      if (values.length === 0) {
        return p.placeholder;
      }

      if (!p.multiple) {
        return getPathLabel(values[0] || []);
      }

      return `${values.length} 项`;
    };

    const getPathLabel = (path: (string | number)[]): string => {
      const labels: string[] = [];
      let currentOptions: CascaderOption[] = p.options;

      for (const value of path) {
        const found = currentOptions.find(opt => opt.value === value);
        if (found) {
          labels.push(found.label);
          currentOptions = found.children || [];
        }
      }

      return p.showAllLevels ? labels.join(p.separator) : (labels[labels.length - 1] || '');
    };

    const renderOption = (option: CascaderOption, level: number): VNode => {
      const isActive = activePath()[level] === option.value;
      const isSelected = selectedValues().some(path => path.join('-') === [...activePath().slice(0, level), option.value].join('-'));

      const optionChildren: VNode[] = [];

      if (option.loading) {
        optionChildren.push(createVNode('span', { class: 'lyt-cascader__loading' }, [createVNode('span', {}, '⏳')]));
      }

      if (slots.default) {
        optionChildren.push(...slots.default(option));
      } else {
        const labelBtnProps = getButtonA11yProps({ 
          ariaLabel: option.label, 
          disabled: option.disabled 
        });
        optionChildren.push(createVNode('span', mergeA11yProps(labelBtnProps, {}), String(option.label)));
      }

      if (option.children && !option.isLeaf) {
        optionChildren.push(createVNode('span', { class: 'lyt-cascader__arrow' }, [createVNode('span', {}, '▶')]));
      }

      return createVNode('div', {
        key: String(option.value),
        class: [
          'lyt-cascader__option',
          isActive ? 'lyt-cascader__option--active' : '',
          isSelected ? 'lyt-cascader__option--selected' : '',
          option.disabled ? 'lyt-cascader__option--disabled' : '',
        ].filter(Boolean).join(' '),
        onClick: () => selectOption(option, level),
      }, optionChildren);
    };

    return () => {
      const cascaderClass = [
        'lyt-cascader',
        isDropdownOpen() ? 'lyt-cascader--open' : '',
        p.disabled ? 'lyt-cascader--disabled' : '',
        p.class,
      ].filter(Boolean).join(' ');

      const isValueSet = selectedValues().length > 0;
      
      const a11yProps = getComboboxA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel,
        ariaDescribedBy: p.ariaDescribedBy,
        disabled: p.disabled,
        expanded: isDropdownOpen(),
        controls: undefined,
      });

      const contentChildren: VNode[] = [];

      if (p.multiple && isValueSet) {
        selectedValues().forEach((path, index) => {
          const removeBtnProps = getButtonA11yProps({ ariaLabel: '移除标签' });
          contentChildren.push(createVNode('span', { class: 'lyt-cascader__tag', key: index }, [
            createVNode('span', {}, getPathLabel(path)),
            createVNode('span', mergeA11yProps(removeBtnProps, { 
              class: 'lyt-cascader__tag-close', 
              onClick: () => removeTag(index) 
            }), [createVNode('span', {}, '×')]),
          ]));
        });
      } else {
        contentChildren.push(createVNode('span', {
          class: ['lyt-cascader__value', !isValueSet ? 'lyt-cascader__placeholder' : ''].filter(Boolean).join(' '),
        }, [createVNode('span', {}, getDisplayText())]));
      }

      if (p.clearable && isValueSet) {
        const clearBtnProps = getButtonA11yProps({ ariaLabel: '清除' });
        contentChildren.push(createVNode('span', mergeA11yProps(clearBtnProps, {
          class: 'lyt-cascader__clear',
          onClick: (e: Event) => { e.stopPropagation(); clear(); },
        }), [createVNode('span', {}, '×')]));
      }

      contentChildren.push(createVNode('span', { class: 'lyt-cascader__arrow' }, [createVNode('span', {}, '▼')]));

      const dropdownContent: VNode[] = [];

      if (p.filterable) {
        dropdownContent.push(createVNode('div', mergeA11yProps({
          role: 'search',
        }, { class: 'lyt-cascader__search' }), [
          createVNode('input', {
            type: 'text',
            placeholder: '搜索',
            value: searchText(),
            onInput: (e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              searchText.set(value);
              isFiltering.set(value.length > 0);
            },
          }),
        ]));
      }

      const maxLevel = isFiltering() ? 1 : activePath().length + 1;
      for (let i = 0; i < maxLevel; i++) {
        const options = getOptionsAtLevel(i);
        if (options.length > 0 || i === 0) {
          const panelProps = getGroupA11yProps({ role: 'listbox' });
          dropdownContent.push(createVNode('div', mergeA11yProps(panelProps, { class: 'lyt-cascader__panel', key: i }), options.map(option => renderOption(option, i))));
        }
      }

      const resultChildren: VNode[] = [
        createVNode('div', mergeA11yProps(a11yProps, { class: 'lyt-cascader__trigger' }), contentChildren),
      ];

      if (isDropdownOpen()) {
        const dropdownChildren: VNode[] = [];
        if (p.options.length === 0) {
          if (slots.empty) {
            dropdownChildren.push(...slots.empty());
          } else {
            dropdownChildren.push(createVNode('span', {}, '暂无数据'));
          }
        } else {
          dropdownChildren.push(...dropdownContent);
        }

        resultChildren.push(createVNode('div', { class: 'lyt-cascader__dropdown' }, dropdownChildren));
      }

      return createVNode('div', {
        class: cascaderClass,
        onClick: () => toggleDropdown(),
      }, resultChildren);
    };
  },
});

export type { CascaderProps, CascaderSlots, CascaderOption, CascaderSetupProps } from './types';
