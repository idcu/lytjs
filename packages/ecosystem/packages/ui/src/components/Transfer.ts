/**
 * @lytjs/ui - Transfer 组件
 *
 * 穿梭框组件，支持左右穿梭、数据筛选、批量移动、自定义渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { TransferOption, TransferSetupProps, TransferSlots } from './types';

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

  setup(props: Record<string, unknown>, { slots }: { slots: TransferSlots }) {
    const p = props as TransferSetupProps;
    const leftChecked = signal<Set<string | number>>(new Set(p.leftDefaultChecked));
    const rightChecked = signal<Set<string | number>>(new Set(p.rightDefaultChecked));
    const leftFilter = signal('');
    const rightFilter = signal('');

    const getSourceData = () => {
      const valueSet = new Set(p.modelValue);
      return p.data.filter((item: TransferOption) => !valueSet.has(item.key));
    };

    const getTargetData = () => {
      const valueSet = new Set(p.modelValue);
      return p.data.filter((item: TransferOption) => valueSet.has(item.key));
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

      const newModelValue = [...p.modelValue, ...Array.from(currentLeftChecked)];
      p.onChange?.(newModelValue, 'right', Array.from(currentLeftChecked));

      leftChecked.set(new Set());
    };

    const moveToLeft = () => {
      const currentRightChecked = rightChecked();
      if (currentRightChecked.size === 0) return;

      const newModelValue = p.modelValue.filter(key => !currentRightChecked.has(key));
      p.onChange?.(newModelValue, 'left', Array.from(currentRightChecked));

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
      p.onLeftCheckChange?.(Array.from(newChecked));
    };

    const toggleRightChecked = (key: string | number) => {
      const newChecked = new Set(rightChecked());
      if (newChecked.has(key)) {
        newChecked.delete(key);
      } else {
        newChecked.add(key);
      }
      rightChecked.set(newChecked);
      p.onRightCheckChange?.(Array.from(newChecked));
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
      p.onLeftCheckChange?.(Array.from(leftChecked()));
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
      p.onRightCheckChange?.(Array.from(rightChecked()));
    };

    const renderOption = (option: TransferOption, isLeft: boolean, checked: Set<string | number>): VNode => {
      const isDisabled = option.disabled;

      const optionChildren: VNode[] = [
        createVNode('input', {
          type: 'checkbox',
          checked: checked.has(option.key),
          disabled: isDisabled,
          onClick: (e: Event) => e.stopPropagation(),
        }),
      ];

      if (slots.default) {
        optionChildren.push(...slots.default(option));
      } else {
        optionChildren.push(createVNode('span', {}, String(option.label)));
      }

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
      }, optionChildren);
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

      if (p.filterable) {
        contentChildren.push(createVNode('div', { class: 'lyt-transfer__filter' }, [
          createVNode('input', {
            type: 'text',
            placeholder: p.filterPlaceholder,
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

      const headerChildren: VNode[] = [
        createVNode('input', {
          type: 'checkbox',
          checked: allChecked,
          indeterminate: indeterminate,
          onClick: toggleAll,
        }),
        createVNode('span', { class: 'lyt-transfer__title' }, [
          createVNode('span', {}, `${p.titles[isLeft ? 0 : 1]} (${checked.size}/${availableCount})`),
        ]),
      ];

      contentChildren.push(createVNode('div', { class: 'lyt-transfer__header' }, headerChildren));

      if (filteredData.length === 0) {
        contentChildren.push(createVNode('div', { class: 'lyt-transfer__empty' }, [createVNode('span', {}, '暂无数据')]));
      } else {
        contentChildren.push(createVNode('div', { class: 'lyt-transfer__list' }, filteredData.map(option => renderOption(option, isLeft, checked))));
      }

      return createVNode('div', { class: 'lyt-transfer__panel' }, contentChildren);
    };

    return () => {
      const transferClass = ['lyt-transfer', p.class].filter(Boolean).join(' ');

      const buttons: VNode[] = [
        createVNode('button', {
          class: 'lyt-transfer__button',
          disabled: leftChecked().size === 0,
          onClick: moveToRight,
        }, [createVNode('span', {}, p.buttonTexts[0] || '▶')]),
        createVNode('button', {
          class: 'lyt-transfer__button',
          disabled: rightChecked().size === 0,
          onClick: moveToLeft,
        }, [createVNode('span', {}, p.buttonTexts[1] || '◀')]),
      ];

      const resultChildren: VNode[] = [
        renderPanel(getSourceData(), true),
        createVNode('div', { class: 'lyt-transfer__buttons' }, buttons),
        renderPanel(getTargetData(), false),
      ];

      if (slots.footer) {
        resultChildren.push(createVNode('div', { class: 'lyt-transfer__footer' }, slots.footer()));
      }

      return createVNode('div', { class: transferClass }, resultChildren);
    };
  },
});

export type { TransferProps, TransferSlots, TransferOption, TransferSetupProps } from './types';
