/**
 * @lytjs/ui - Transfer 组件
 *
 * 穿梭框组件，支持左右穿梭、数据筛选、批量移动、自定义渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface TransferOption {
  key: string | number;
  label: string;
  disabled?: boolean;
}

export interface TransferSetupProps {
  data: TransferOption[];
  modelValue: (string | number)[];
  filterable: boolean;
  filterPlaceholder: string;
  titles: string[];
  buttonTexts: string[];
  leftDefaultChecked: (string | number)[];
  rightDefaultChecked: (string | number)[];
  class: string;
  onChange: ((value: (string | number)[], direction: 'left' | 'right', movedKeys: (string | number)[]) => void) | undefined;
  onLeftCheckChange: ((checked: (string | number)[]) => void) | undefined;
  onRightCheckChange: ((checked: (string | number)[]) => void) | undefined;
}

export interface TransferSlots {
  default?: (option: TransferOption) => VNode[];
  footer?: () => VNode[];
}

export const Transfer = defineComponent({
  name: 'LytTransfer',

  props: {
    data: { type: Array, default: (): TransferOption[] => [] },
    modelValue: { type: Array, default: (): (string | number)[] => [] },
    filterable: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '请输入搜索内容' },
    titles: { type: Array, default: (): string[] => ['源列表', '目标列表'] },
    buttonTexts: { type: Array, default: (): string[] => [] },
    leftDefaultChecked: { type: Array, default: (): (string | number)[] => [] },
    rightDefaultChecked: { type: Array, default: (): (string | number)[] => [] },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onLeftCheckChange: { type: Function, default: undefined },
    onRightCheckChange: { type: Function, default: undefined },
  },

  setup(props: TransferSetupProps, { slots }: { slots: TransferSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const leftChecked = signal<Set<string | number>>(new Set(props.leftDefaultChecked));
    const rightChecked = signal<Set<string | number>>(new Set(props.rightDefaultChecked));
    const leftFilter = signal('');
    const rightFilter = signal('');

    const getSourceData = () => {
      const valueSet = new Set(props.modelValue);
      return props.data.filter((item: TransferOption) => !valueSet.has(item.key));
    };

    const getTargetData = () => {
      const valueSet = new Set(props.modelValue);
      return props.data.filter((item: TransferOption) => valueSet.has(item.key));
    };

    const filterData = (data: TransferOption[], filterText: string) => {
      if (!filterText) return data;
      return data.filter((item) => 
        item.label.toLowerCase().includes(filterText.toLowerCase())
      );
    };

    const moveToRight = () => {
      const currentLeftChecked = leftChecked();
      if (currentLeftChecked.size === 0) return;

      const newModelValue = [...props.modelValue, ...Array.from(currentLeftChecked)];
      emit('update:modelValue', newModelValue);
      emit('change', newModelValue, 'right', Array.from(currentLeftChecked));
      props.onChange?.(newModelValue, 'right', Array.from(currentLeftChecked));

      leftChecked.set(new Set());
    };

    const moveToLeft = () => {
      const currentRightChecked = rightChecked();
      if (currentRightChecked.size === 0) return;

      const newModelValue = props.modelValue.filter(key => !currentRightChecked.has(key));
      emit('update:modelValue', newModelValue);
      emit('change', newModelValue, 'left', Array.from(currentRightChecked));
      props.onChange?.(newModelValue, 'left', Array.from(currentRightChecked));

      rightChecked.set(new Set());
    };

    const toggleLeftChecked = (key: string | number) => {
      const newChecked = new Set(leftChecked());
      if (newChecked.has(key)) {
        newChecked.delete(key);
      } else {
        newChecked.add(key);
      }
      leftChecked.set(newChecked);
      emit('leftCheckChange', Array.from(newChecked));
      props.onLeftCheckChange?.(Array.from(newChecked));
    };

    const toggleRightChecked = (key: string | number) => {
      const newChecked = new Set(rightChecked());
      if (newChecked.has(key)) {
        newChecked.delete(key);
      } else {
        newChecked.add(key);
      }
      rightChecked.set(newChecked);
      emit('rightCheckChange', Array.from(newChecked));
      props.onRightCheckChange?.(Array.from(newChecked));
    };

    const toggleLeftAll = () => {
      const sourceData = filterData(getSourceData(), leftFilter());
      const availableKeys = sourceData
        .filter(item => !item.disabled)
        .map(item => item.key);

      if (leftChecked().size === availableKeys.length) {
        leftChecked.set(new Set());
      } else {
        leftChecked.set(new Set(availableKeys));
      }
      emit('leftCheckChange', Array.from(leftChecked()));
      props.onLeftCheckChange?.(Array.from(leftChecked()));
    };

    const toggleRightAll = () => {
      const targetData = filterData(getTargetData(), rightFilter());
      const availableKeys = targetData
        .filter(item => !item.disabled)
        .map(item => item.key);

      if (rightChecked().size === availableKeys.length) {
        rightChecked.set(new Set());
      } else {
        rightChecked.set(new Set(availableKeys));
      }
      emit('rightCheckChange', Array.from(rightChecked()));
      props.onRightCheckChange?.(Array.from(rightChecked()));
    };

    const renderOption = (option: TransferOption, isLeft: boolean, checked: Set<string | number>): VNode => {
      const isDisabled = option.disabled;

      return createVNode('div', {
        key: String(option.key),
        class: [
          'lyt-transfer__option',
          isDisabled ? 'lyt-transfer__option--disabled' : '',
          checked.has(option.key) ? 'lyt-transfer__option--checked' : '',
        ].filter(Boolean).join(' '),
        onClick: () => {
          if (isDisabled) return;
          if (isLeft) {
            toggleLeftChecked(option.key);
          } else {
            toggleRightChecked(option.key);
          }
        },
      }, [
        createVNode('input', {
          type: 'checkbox',
          checked: checked.has(option.key),
          disabled: isDisabled,
          onClick: (e: Event) => e.stopPropagation(),
        }),
        slots.default ? slots.default(option) : option.label,
      ]);
    };

    const renderPanel = (data: TransferOption[], isLeft: boolean): VNode => {
      const filter = isLeft ? leftFilter() : rightFilter();
      const checked = isLeft ? leftChecked() : rightChecked();
      const toggleAll = isLeft ? toggleLeftAll : toggleRightAll;
      const filteredData = filterData(data, filter);

      const availableCount = data.filter(item => !item.disabled).length;
      const allChecked = availableCount > 0 && checked.size === availableCount;
      const indeterminate = checked.size > 0 && checked.size < availableCount;

      const contentChildren: VNode[] = [];

      if (props.filterable) {
        contentChildren.push(createVNode('div', { class: 'lyt-transfer__filter' }, [
          createVNode('input', {
            type: 'text',
            placeholder: props.filterPlaceholder,
            value: filter,
            onInput: (e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              if (isLeft) {
                leftFilter.set(value);
              } else {
                rightFilter.set(value);
              }
            },
          }),
        ]));
      }

      const headerChildren: VNode[] = [];
      
      headerChildren.push(createVNode('input', {
        type: 'checkbox',
        checked: allChecked,
        indeterminate: indeterminate,
        onClick: toggleAll,
      }));
      
      headerChildren.push(createVNode('span', { class: 'lyt-transfer__title' }, [
        `${props.titles[isLeft ? 0 : 1]} (${checked.size}/${availableCount})`,
      ]));
      
      contentChildren.push(createVNode('div', { class: 'lyt-transfer__header' }, [headerChildren]));

      if (filteredData.length === 0) {
        contentChildren.push(createVNode('div', { class: 'lyt-transfer__empty' }, ['暂无数据']));
      } else {
        contentChildren.push(createVNode('div', { class: 'lyt-transfer__list' }, [
          filteredData.map(option => renderOption(option, isLeft, checked)),
        ]));
      }

      return createVNode('div', { class: 'lyt-transfer__panel' }, [contentChildren]);
    };

    return () => {
      const transferClass = ['lyt-transfer', props.class].filter(Boolean).join(' ');
      
      return createVNode('div', { class: transferClass }, [
        renderPanel(getSourceData(), true),
        createVNode('div', { class: 'lyt-transfer__buttons' }, [
          createVNode('button', {
            class: 'lyt-transfer__button',
            disabled: leftChecked().size === 0,
            onClick: moveToRight,
          }, [props.buttonTexts[0] || '▶']),
          createVNode('button', {
            class: 'lyt-transfer__button',
            disabled: rightChecked().size === 0,
            onClick: moveToLeft,
          }, [props.buttonTexts[1] || '◀']),
        ]),
        renderPanel(getTargetData(), false),
        slots.footer && createVNode('div', { class: 'lyt-transfer__footer' }, [slots.footer()]),
      ]);
    };
  },
});

export type { TransferProps, TransferSlots, TransferOption } from './types';
