/**
 * @lytjs/ui - Cascader 组件
 *
 * 级联选择器组件，支持多选、懒加载、数据回显等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface CascaderOption {
  value: string | number;
  label: string;
  children?: CascaderOption[];
  disabled?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
}

export interface CascaderSetupProps {
  options: CascaderOption[];
  modelValue: (string | number)[] | Array<(string | number)[]>;
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  multiple: boolean;
  filterable: boolean;
  checkStrictly: boolean;
  showAllLevels: boolean;
  collapseTags: boolean;
  separator: string;
  class: string;
  load: ((node: CascaderOption, resolve: (children: CascaderOption[]) => void) => void) | undefined;
  onChange: ((value: (string | number)[] | Array<(string | number)[]>) => void) | undefined;
  onExpandChange: ((value: (string | number)[]) => void) | undefined;
  onVisibleChange: ((visible: boolean) => void) | undefined;
  onRemoveTag: ((value: (string | number)[]) => void) | undefined;
  onClear: (() => void) | undefined;
}

export interface CascaderSlots {
  default?: (option: CascaderOption) => VNode[];
  empty?: () => VNode[];
}

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
    load: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onExpandChange: { type: Function, default: undefined },
    onVisibleChange: { type: Function, default: undefined },
    onRemoveTag: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: CascaderSetupProps, { slots }: { slots: CascaderSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const isDropdownOpen = signal(false);
    const activePath = signal<(string | number)[]>([]);
    const selectedValues = signal<Array<(string | number)[]>>([]);
    const searchText = signal('');
    const isFiltering = signal(false);

    if (props.modelValue.length > 0) {
      if (props.multiple) {
        selectedValues.set([...(props.modelValue as Array<(string | number)[]>)]);
      } else {
        selectedValues.set([(props.modelValue as (string | number)[])]);
      }
    }

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

    const clear = () => {
      selectedValues.set([]);
      activePath.set([]);
      isDropdownOpen.set(false);
      emit('update:modelValue', []);
      emit('change', []);
      props.onClear?.();
      props.onChange?.([]);
    };

    const removeTag = (index: number) => {
      if (props.disabled) return;

      const newSelected = [...selectedValues()];
      newSelected.splice(index, 1);
      selectedValues.set(newSelected);
      
      emit('update:modelValue', newSelected);
      emit('change', newSelected);
      emit('removeTag', newSelected);
      props.onRemoveTag?.(newSelected);
      props.onChange?.(newSelected);
    };

    const selectOption = (option: CascaderOption, level: number) => {
      if (option.disabled) return;

      const newPath = [...activePath().slice(0, level), option.value];
      activePath.set(newPath);

      const optionsAtLevel = getOptionsAtLevel(level);
      const nextOptions = option.children || [];
      
      if (option.isLeaf || nextOptions.length === 0) {
        if (props.multiple) {
          const exists = selectedValues().some(item => item.join('-') === newPath.join('-'));
          const newSelected = exists
            ? selectedValues().filter(item => item.join('-') !== newPath.join('-'))
            : [...selectedValues(), newPath];
          selectedValues.set(newSelected);
          emit('update:modelValue', newSelected);
          emit('change', newSelected);
          props.onChange?.(newSelected);
        } else {
          selectedValues.set([newPath]);
          isDropdownOpen.set(false);
          emit('update:modelValue', newPath);
          emit('change', newPath);
          props.onChange?.(newPath);
        }
      } else if (props.load && nextOptions.length === 0) {
        option.loading = true;
        props.load(option, (children: CascaderOption[]) => {
          option.loading = false;
          option.children = children;
        });
      }
    };

    const getOptionsAtLevel = (level: number): CascaderOption[] => {
      if (isFiltering()) {
        const keyword = searchText().toLowerCase();
        return filterOptions(props.options, keyword);
      }

      let options: CascaderOption[] = [...props.options];
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
        return props.placeholder;
      }

      if (!props.multiple) {
        return getPathLabel(values[0]);
      }

      return `${values.length} 项`;
    };

    const getPathLabel = (path: (string | number)[]): string => {
      const labels: string[] = [];
      let currentOptions: CascaderOption[] = props.options;
      
      for (const value of path) {
        const found = currentOptions.find(opt => opt.value === value);
        if (found) {
          labels.push(found.label);
          currentOptions = found.children || [];
        }
      }

      return props.showAllLevels ? labels.join(props.separator) : labels[labels.length - 1];
    };

    const renderOption = (option: CascaderOption, level: number): VNode => {
      const isActive = activePath()[level] === option.value;
      const isSelected = selectedValues().some(path => path.join('-') === [...activePath().slice(0, level), option.value].join('-'));

      return createVNode('div', {
        key: String(option.value),
        class: [
          'lyt-cascader__option',
          isActive ? 'lyt-cascader__option--active' : '',
          isSelected ? 'lyt-cascader__option--selected' : '',
          option.disabled ? 'lyt-cascader__option--disabled' : '',
        ].filter(Boolean).join(' '),
        onClick: () => selectOption(option, level),
      }, [
        option.loading && createVNode('span', { class: 'lyt-cascader__loading' }, ['⏳']),
        slots.default ? slots.default(option) : option.label,
        option.children && !option.isLeaf && createVNode('span', { class: 'lyt-cascader__arrow' }, ['▶']),
      ]);
    };

    return () => {
      const cascaderClass = [
        'lyt-cascader',
        isDropdownOpen() ? 'lyt-cascader--open' : '',
        props.disabled ? 'lyt-cascader--disabled' : '',
        props.class,
      ].filter(Boolean).join(' ');

      const isValueSet = selectedValues().length > 0;
      
      const contentChildren: VNode[] = [];
      
      if (props.multiple && isValueSet) {
        selectedValues().forEach((path, index) => {
          contentChildren.push(createVNode('span', { class: 'lyt-cascader__tag', key: index }, [
            getPathLabel(path),
            createVNode('span', { class: 'lyt-cascader__tag-close', onClick: () => removeTag(index) }, ['×']),
          ]));
        });
      } else {
        contentChildren.push(createVNode('span', {
          class: ['lyt-cascader__value', !isValueSet ? 'lyt-cascader__placeholder' : ''].filter(Boolean).join(' '),
        }, [getDisplayText()]));
      }
      
      if (props.clearable && isValueSet) {
        contentChildren.push(createVNode('span', {
          class: 'lyt-cascader__clear',
          onClick: (e: Event) => { e.stopPropagation(); clear(); },
        }, ['×']));
      }

      contentChildren.push(createVNode('span', { class: 'lyt-cascader__arrow' }, ['▼']));

      const dropdownContent: VNode[] = [];
      
      if (props.filterable) {
        dropdownContent.push(createVNode('div', { class: 'lyt-cascader__search' }, [
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
          dropdownContent.push(createVNode('div', { class: 'lyt-cascader__panel', key: i }, [
            options.map(option => renderOption(option, i)),
          ]));
        }
      }

      return createVNode('div', {
        class: cascaderClass,
        onClick: () => toggleDropdown(),
      }, [
        createVNode('div', { class: 'lyt-cascader__trigger' }, [contentChildren]),
        isDropdownOpen() && createVNode('div', { class: 'lyt-cascader__dropdown' }, [
          props.options.length === 0
            ? slots.empty
              ? slots.empty()
              : '暂无数据'
            : dropdownContent,
        ]),
      ]);
    };
  },
});

export type { CascaderProps, CascaderSlots, CascaderOption } from './types';
