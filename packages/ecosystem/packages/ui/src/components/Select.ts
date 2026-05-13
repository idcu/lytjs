/**
 * @lytjs/ui - Select 组件
 *
 * 下拉选择组件，支持单选、多选等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Select 组件
 */
export const Select = defineComponent({
  name: 'LytSelect',

  props: {
    modelValue: { type: String, default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const isOpen = signal(false);

    // 切换下拉框
    const toggleDropdown = () => {
      if (props.disabled) return;
      isOpen.set(!isOpen());
    };

    // 选择选项
    const selectOption = (option: any) => {
      if (option.disabled) return;
      emit('update:modelValue', option.value);
      props.onChange?.(option.value);
      isOpen.set(false);
    };

    // 清除选择
    const clearSelection = (e: Event) => {
      e.stopPropagation();
      emit('update:modelValue', '');
      props.onChange?.('');
      props.onClear?.();
    };

    // 获取选中的标签
    const getSelectedLabel = () => {
      const selected = props.options.find((opt: any) => opt.value === props.modelValue);
      return selected?.label || '';
    };

    // 生成类名
    const getSelectClass = () => {
      const classes = ['lyt-select'];
      if (props.disabled) classes.push('lyt-select--disabled');
      if (isOpen()) classes.push('lyt-select--open');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const selectedLabel = getSelectedLabel();
      
      // 构建触发器子元素
      const triggerChildren: any[] = [
        createVNode('span', { class: 'lyt-select__selected' }, selectedLabel || props.placeholder),
      ];
      
      // 清除按钮
      if (props.clearable && selectedLabel && !props.disabled) {
        triggerChildren.push(createVNode('span', { class: 'lyt-select__clear', onClick: clearSelection }, '✕'));
      }
      
      // 箭头
      triggerChildren.push(createVNode('span', { class: `lyt-select__arrow ${isOpen() ? 'lyt-select__arrow--up' : ''}` }, '▼'));
      
      const children: any[] = [
        // 选择框
        createVNode('div', {
          class: 'lyt-select__trigger',
          onClick: toggleDropdown,
        }, triggerChildren),
      ];

      // 下拉列表
      if (isOpen()) {
        const optionsChildren = props.options.map((option: any) =>
          createVNode('div', {
            class: `lyt-select__option ${option.value === props.modelValue ? 'lyt-select__option--selected' : ''} ${option.disabled ? 'lyt-select__option--disabled' : ''}`,
            onClick: () => selectOption(option),
          }, option.label)
        );

        if (optionsChildren.length === 0 && slots.empty) {
          optionsChildren.push(createVNode('div', { class: 'lyt-select__empty' }, slots.empty()));
        }

        children.push(
          createVNode('div', { class: 'lyt-select__dropdown' }, [
            createVNode('div', { class: 'lyt-select__options' }, optionsChildren),
          ])
        );
      }

      return createVNode('div', { class: getSelectClass() }, children);
    };
  },
});

export default Select;
