/**
 * @lytjs/ui - Transfer 穿梭框组件
 *
 * 穿梭框组件，用于将数据从一侧移动到另一侧
 */

import type { TransferProps, TransferSlots, TransferSetupProps, TransferItem } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal, computed } from '@lytjs/reactivity';

/**
 * Transfer 穿梭框组件
 */
export const Transfer = defineComponent({
  name: 'LytTransfer',

  props: {
    data: { type: Array as () => TransferItem[], default: () => [] },
    value: { type: Array as () => (string | number)[], default: () => [] },
    filterable: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '请输入搜索内容' },
    titles: { type: Array as () => string[], default: () => ['源列表', '目标列表'] },
    buttonTexts: { type: Array as () => string[], default: () => ['', ''] },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as TransferSetupProps;
    const leftCheckedKeys = signal<(string | number)[]>([]);
    const rightCheckedKeys = signal<(string | number)[]>([]);
    const leftFilterQuery = signal('');
    const rightFilterQuery = signal('');

    const leftData = computed(() => {
      return _props.data.filter(item => !_props.value.includes(item.key));
    });

    const rightData = computed(() => {
      return _props.data.filter(item => _props.value.includes(item.key));
    });

    const filteredLeftData = computed(() => {
      if (!leftFilterQuery.value) return leftData.value;
      return leftData.value.filter(item => 
        item.label.toLowerCase().includes(leftFilterQuery.value.toLowerCase())
      );
    });

    const filteredRightData = computed(() => {
      if (!rightFilterQuery.value) return rightData.value;
      return rightData.value.filter(item => 
        item.label.toLowerCase().includes(rightFilterQuery.value.toLowerCase())
      );
    });

    const handleMoveToRight = () => {
      const newValues = [..._props.value, ...leftCheckedKeys.value];
      emit('update:value', newValues);
      _props.onChange?.(newValues, 'right', leftCheckedKeys.value);
      leftCheckedKeys.value = [];
    };

    const handleMoveToLeft = () => {
      const newValues = _props.value.filter(key => !rightCheckedKeys.value.includes(key));
      emit('update:value', newValues);
      _props.onChange?.(newValues, 'left', rightCheckedKeys.value);
      rightCheckedKeys.value = [];
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

    const renderItem = (item: TransferItem, list: 'left' | 'right') => {
      const checked = list === 'left' 
        ? leftCheckedKeys.value.includes(item.key)
        : rightCheckedKeys.value.includes(item.key);
      
      const handleCheck = () => {
        if (item.disabled) return;
        if (list === 'left') {
          if (checked) {
            leftCheckedKeys.value = leftCheckedKeys.value.filter(k => k !== item.key);
          } else {
            leftCheckedKeys.value.push(item.key);
          }
        } else {
          if (checked) {
            rightCheckedKeys.value = rightCheckedKeys.value.filter(k => k !== item.key);
          } else {
            rightCheckedKeys.value.push(item.key);
          }
        }
      };

      return createVNode('div', {
        class: ['lyt-transfer-panel-item', { 'is-disabled': item.disabled, 'is-checked': checked }],
        onClick: handleCheck,
        key: item.key,
      }, item.label);
    };

    return () => {
      const children: VNode[] = [];

      // Left panel
      const leftPanelChildren: VNode[] = [];
      leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-header' }, _props.titles[0]));
      
      if (_props.filterable) {
        leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, [
          createVNode('input', {
            class: 'lyt-transfer-filter',
            type: 'text',
            placeholder: _props.filterPlaceholder,
            value: leftFilterQuery.value,
            onInput: (e: Event) => {
              const target = e.target as HTMLInputElement;
              leftFilterQuery.value = target.value;
            },
          }),
          ...filteredLeftData.value.map(item => renderItem(item, 'left')),
        ]));
      } else {
        leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, 
          filteredLeftData.value.map(item => renderItem(item, 'left'))
        ));
      }

      if (slots.leftFooter) {
        leftPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-footer' }, slots.leftFooter()));
      }

      children.push(createVNode('div', { class: 'lyt-transfer-panel' }, leftPanelChildren));

      // Buttons
      const buttonChildren: VNode[] = [];
      const rightDisabled = leftCheckedKeys.value.length === 0;
      buttonChildren.push(createVNode('button', {
        class: ['lyt-button', 'lyt-button--default', rightDisabled ? 'is-disabled' : ''],
        disabled: rightDisabled,
        onClick: handleMoveToRight,
      }, _props.buttonTexts[0] || '→'));
      
      const leftDisabled = rightCheckedKeys.value.length === 0;
      buttonChildren.push(createVNode('button', {
        class: ['lyt-button', 'lyt-button--default', leftDisabled ? 'is-disabled' : ''],
        disabled: leftDisabled,
        onClick: handleMoveToLeft,
      }, _props.buttonTexts[1] || '←'));
      
      children.push(createVNode('div', { class: 'lyt-transfer-buttons' }, buttonChildren));

      // Right panel
      const rightPanelChildren: VNode[] = [];
      rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-header' }, _props.titles[1]));
      
      if (_props.filterable) {
        rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, [
          createVNode('input', {
            class: 'lyt-transfer-filter',
            type: 'text',
            placeholder: _props.filterPlaceholder,
            value: rightFilterQuery.value,
            onInput: (e: Event) => {
              const target = e.target as HTMLInputElement;
              rightFilterQuery.value = target.value;
            },
          }),
          ...filteredRightData.value.map(item => renderItem(item, 'right')),
        ]));
      } else {
        rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-body' }, 
          filteredRightData.value.map(item => renderItem(item, 'right'))
        ));
      }

      if (slots.rightFooter) {
        rightPanelChildren.push(createVNode('div', { class: 'lyt-transfer-panel-footer' }, slots.rightFooter()));
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
