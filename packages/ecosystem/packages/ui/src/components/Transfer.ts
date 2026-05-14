/**
 * @lytjs/ui - Transfer 穿梭框组件
 *
 * 穿梭框组件，用于将数据从一侧移动到另一侧
 */

import type { TransferProps, TransferSlots, TransferSetupProps, TransferOption } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';

export const Transfer = defineComponent({
  name: 'LytTransfer',

  props: {
    data: { type: Array as () => TransferOption[], default: () => [] },
    value: { type: Array as () => (string | number)[], default: () => [] },
    filterable: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '请输入搜索内容' },
    titles: { type: Array as () => string[], default: () => ['源列表', '目标列表'] },
    buttonTexts: { type: Array as () => string[], default: () => ['', ''] },
    class: { type: String, default: '' },
    style: { type: [String, Object] as any, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as TransferSetupProps;
    const leftCheckedKeys = signal<(string | number)[]>([]);
    const rightCheckedKeys = signal<(string | number)[]>([]);
    const leftFilterQuery = signal('');
    const rightFilterQuery = signal('');

    const leftData = () => {
      return (_props.data as TransferOption[]).filter(item => !(_props.value as (string | number)[]).includes(item.key));
    };

    const rightData = () => {
      return (_props.data as TransferOption[]).filter(item => (_props.value as (string | number)[]).includes(item.key));
    };

    const filteredLeftData = () => {
      const query = leftFilterQuery();
      const data = leftData();
      if (!query) return data;
      return data.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
    };

    const filteredRightData = () => {
      const query = rightFilterQuery();
      const data = rightData();
      if (!query) return data;
      return data.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
    };

    const handleMoveToRight = () => {
      const newValues = [...(_props.value as (string | number)[]), ...leftCheckedKeys()];
      emit('update:value', newValues);
      _props.onChange?.(newValues, 'right', leftCheckedKeys());
      leftCheckedKeys.set([]);
    };

    const handleMoveToLeft = () => {
      const newValues = (_props.value as (string | number)[]).filter(key => !rightCheckedKeys().includes(key));
      emit('update:value', newValues);
      _props.onChange?.(newValues, 'left', rightCheckedKeys());
      rightCheckedKeys.set([]);
    };

    const getTransferClass = () => {
      const classes = ['lyt-transfer'];
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getTransferStyle = () => {
      const style: Record<string, string> = {};
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    const renderItem = (item: TransferOption, list: 'left' | 'right') => {
      const leftChecked = leftCheckedKeys();
      const rightChecked = rightCheckedKeys();
      const checked = list === 'left'
        ? leftChecked.includes(item.key)
        : rightChecked.includes(item.key);

      const handleCheck = () => {
        if (item.disabled) return;
        if (list === 'left') {
          if (checked) {
            leftCheckedKeys.set(leftChecked.filter((k: string | number) => k !== item.key));
          } else {
            leftCheckedKeys.update(keys => [...keys, item.key]);
          }
        } else {
          if (checked) {
            rightCheckedKeys.set(rightChecked.filter((k: string | number) => k !== item.key));
          } else {
            rightCheckedKeys.update(keys => [...keys, item.key]);
          }
        }
      };

      return createVNode('div', {
        class: ['lyt-transfer-panel-item', { 'is-disabled': item.disabled, 'is-checked': checked }],
        onClick: handleCheck,
        key: item.key,
      }, [createVNode('span', {}, item.label)]);
    };

    return () => {
      const children: VNode[] = [];

      const leftPanelChildren: VNode[] = [];
      leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-header' }, [createVNode('span', {}, (_props.titles as string[])[0] || '')]));

      if (_props.filterable) {
        const filterInput = createVNode('input', {
          class: 'lyt-transfer-filter',
          type: 'text',
          placeholder: _props.filterPlaceholder,
          value: leftFilterQuery(),
          onInput: (e: Event) => {
            const target = e.target as HTMLInputElement;
            leftFilterQuery.set(target.value);
          },
        });
        const items = filteredLeftData().map((item: TransferOption) => renderItem(item, 'left'));
        leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, [filterInput, ...items]));
      } else {
        const items = filteredLeftData().map((item: TransferOption) => renderItem(item, 'left'));
        leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, items));
      }

      if (slots.leftFooter) {
        const footerContent = slots.leftFooter();
        leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-footer' }, footerContent as VNode[]));
      }

      children.push(createVNode('div', { class: 'lyt-transfer-panel' }, leftPanelChildren));

      const buttonChildren: VNode[] = [];
      const rightDisabled = leftCheckedKeys().length === 0;
      buttonChildren.push(createVNode('button', {
        class: ['lyt-button', 'lyt-button--default', rightDisabled ? 'is-disabled' : ''],
        disabled: rightDisabled,
        onClick: handleMoveToRight,
      }, [createVNode('span', {}, (_props.buttonTexts as string[])[0] || '→')]));

      const leftDisabled = rightCheckedKeys().length === 0;
      buttonChildren.push(createVNode('button', {
        class: ['lyt-button', 'lyt-button--default', leftDisabled ? 'is-disabled' : ''],
        disabled: leftDisabled,
        onClick: handleMoveToLeft,
      }, [createVNode('span', {}, (_props.buttonTexts as string[])[1] || '←')]));

      children.push(createVNode('div', { class: 'lyt-transfer-buttons' }, buttonChildren));

      const rightPanelChildren: VNode[] = [];
      rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-header' }, [createVNode('span', {}, (_props.titles as string[])[1] || '')]));

      if (_props.filterable) {
        const filterInput = createVNode('input', {
          class: 'lyt-transfer-filter',
          type: 'text',
          placeholder: _props.filterPlaceholder,
          value: rightFilterQuery(),
          onInput: (e: Event) => {
            const target = e.target as HTMLInputElement;
            rightFilterQuery.set(target.value);
          },
        });
        const items = filteredRightData().map((item: TransferOption) => renderItem(item, 'right'));
        rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, [filterInput, ...items]));
      } else {
        const items = filteredRightData().map((item: TransferOption) => renderItem(item, 'right'));
        rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, items));
      }

      if (slots.rightFooter) {
        const footerContent = slots.rightFooter();
        rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-footer' }, footerContent as VNode[]));
      }

      children.push(createVNode('div', { class: 'lyt-transfer-panel' }, rightPanelChildren));

      return createVNode('div', {
        class: getTransferClass(),
        style: getTransferStyle(),
      }, children);
    };
  },
});

export type { TransferProps, TransferSlots };
