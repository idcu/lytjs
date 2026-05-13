/**
 * @lytjs/ui - Transfer 组件
 *
 * 穿梭框组件，支持左右穿梭、数据筛选、批量移动、自定义渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Transfer 选项数据结构
 */
interface TransferOption {
  key: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Transfer 组件
 */
export const Transfer = defineComponent({
  name: 'LytTransfer',

  props: {
    data: { type: Array, default: () => [] },
    modelValue: { type: Array, default: () => [] },
    filterable: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '请输入搜索内容' },
    titles: { type: Array, default: () => ['源列表', '目标列表'] },
    buttonTexts: { type: Array, default: () => [] },
    leftDefaultChecked: { type: Array, default: () => [] },
    rightDefaultChecked: { type: Array, default: () => [] },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onLeftCheckChange: { type: Function, default: undefined },
    onRightCheckChange: { type: Function, default: undefined },
  },

  setup(props: any, { emit }: any) {
    const leftChecked = signal<Set<string | number>>(new Set(props.leftDefaultChecked));
    const rightChecked = signal<Set<string | number>>(new Set(props.rightDefaultChecked));
    const leftFilter = signal('');
    const rightFilter = signal('');

    // 获取源数据
    const getSourceData = () => {
      const valueSet = new Set(props.modelValue);
      return props.data.filter((item: TransferOption) => !valueSet.has(item.key));
    };

    // 获取目标数据
    const getTargetData = () => {
      const valueSet = new Set(props.modelValue);
      return props.data.filter((item: TransferOption) => valueSet.has(item.key));
    };

    // 过滤数据
    const filterData = (data: TransferOption[], filterText: string) => {
      if (!filterText) return data;
      return data.filter((item) => 
        item.label.toLowerCase().includes(filterText.toLowerCase())
      );
    };

    // 移动到右侧
    const moveToRight = () => {
      const currentLeftChecked = leftChecked();
      if (currentLeftChecked.size === 0) return;

      const newModelValue = [...props.modelValue, ...Array.from(currentLeftChecked)];
      emit('update:modelValue', newModelValue);
      emit('change', newModelValue, 'right', Array.from(currentLeftChecked));
      props.onChange?.(newModelValue, 'right', Array.from(currentLeftChecked));

      leftChecked.set(new Set());
    };

    // 移动到左侧
    const moveToLeft = () => {
      const currentRightChecked = rightChecked();
      if (currentRightChecked.size === 0) return;

      const valueSet = new Set(props.modelValue);
      currentRightChecked.forEach((key) => valueSet.delete(key));
      const newModelValue = Array.from(valueSet);
      emit('update:modelValue', newModelValue);
      emit('change', newModelValue, 'left', Array.from(currentRightChecked));
      props.onChange?.(newModelValue, 'left', Array.from(currentRightChecked));

      rightChecked.set(new Set());
    };

    // 切换左侧选中
    const toggleLeftCheck = (key: string | number, checked: boolean) => {
      const keys = leftChecked();
      if (checked) {
        keys.add(key);
      } else {
        keys.delete(key);
      }
      leftChecked.set(new Set(keys));
      emit('leftCheckChange', Array.from(keys));
      props.onLeftCheckChange?.(Array.from(keys));
    };

    // 切换右侧选中
    const toggleRightCheck = (key: string | number, checked: boolean) => {
      const keys = rightChecked();
      if (checked) {
        keys.add(key);
      } else {
        keys.delete(key);
      }
      rightChecked.set(new Set(keys));
      emit('rightCheckChange', Array.from(keys));
      props.onRightCheckChange?.(Array.from(keys));
    };

    // 全选/取消全选左侧
    const toggleLeftCheckAll = (checked: boolean) => {
      const sourceData = filterData(getSourceData(), leftFilter());
      const enabledData = sourceData.filter((item) => !item.disabled);
      
      if (checked) {
        const keys = enabledData.map((item) => item.key);
        leftChecked.set(new Set(keys));
      } else {
        leftChecked.set(new Set());
      }
      
      emit('leftCheckChange', Array.from(leftChecked()));
      props.onLeftCheckChange?.(Array.from(leftChecked()));
    };

    // 全选/取消全选右侧
    const toggleRightCheckAll = (checked: boolean) => {
      const targetData = filterData(getTargetData(), rightFilter());
      const enabledData = targetData.filter((item) => !item.disabled);
      
      if (checked) {
        const keys = enabledData.map((item) => item.key);
        rightChecked.set(new Set(keys));
      } else {
        rightChecked.set(new Set());
      }
      
      emit('rightCheckChange', Array.from(rightChecked()));
      props.onRightCheckChange?.(Array.from(rightChecked()));
    };

    // 渲染列表
    const renderList = (
      data: TransferOption[], 
      checkedSet: Set<string | number>, 
      filterText: string, 
      onCheck: (key: string | number, checked: boolean) => void,
      onCheckAll: (checked: boolean) => void,
      title: string
    ) => {
      const filteredData = filterData(data, filterText);
      const enabledData = filteredData.filter((item) => !item.disabled);
      const allChecked = enabledData.length > 0 && enabledData.every((item) => checkedSet.has(item.key));
      const indeterminate = enabledData.some((item) => checkedSet.has(item.key)) && !allChecked;

      const items = filteredData.map((item) => {
        const isChecked = checkedSet.has(item.key);
        return createVNode(
          'div',
          {
            class: `lyt-transfer__item ${isChecked ? 'lyt-transfer__item--checked' : ''} ${item.disabled ? 'lyt-transfer__item--disabled' : ''}`,
          },
          [
            createVNode(
              'input',
              {
                type: 'checkbox',
                checked: isChecked,
                disabled: item.disabled,
                onChange: (e: any) => onCheck(item.key, e.target.checked),
              },
            ),
            createVNode('span', { class: 'lyt-transfer__item-label' }, item.label),
          ]
        );
      });

      return createVNode(
        'div',
        { class: 'lyt-transfer__panel' },
        [
          createVNode(
            'div',
            { class: 'lyt-transfer__header' },
            [
              createVNode(
                'label',
                { class: 'lyt-transfer__header-title' },
                [
                  createVNode(
                    'input',
                    {
                      type: 'checkbox',
                      checked: allChecked,
                      indeterminate: indeterminate,
                      onChange: (e: any) => onCheckAll(e.target.checked),
                    },
                  ),
                  `${title} (${checkedSet.size}/${enabledData.length})`,
                ]
              ),
            ]
          ),
          createVNode(
            'div',
            { class: 'lyt-transfer__body' },
            items.length > 0 ? items : createVNode('div', { class: 'lyt-transfer__empty' }, '暂无数据')
          ),
        ]
      );
    };

    // 渲染按钮
    const renderButton = (direction: 'right' | 'left', onClick: () => void, disabled: boolean) => {
      const isRight = direction === 'right';
      const text = isRight ? (props.buttonTexts[0] || '→') : (props.buttonTexts[1] || '←');
      return createVNode(
        'button',
        {
          class: 'lyt-transfer__button',
          disabled: disabled,
          onClick: onClick,
        },
        text
      );
    };

    // 生成类名
    const getTransferClass = () => {
      const classes = ['lyt-transfer'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const sourceData = getSourceData();
      const targetData = getTargetData();
      const currentLeftChecked = leftChecked();
      const currentRightChecked = rightChecked();

      return createVNode(
        'div',
        { class: getTransferClass() },
        [
          // 左侧筛选
          props.filterable ? createVNode(
            'div',
            { class: 'lyt-transfer__filter' },
            [
              createVNode('input', {
                type: 'text',
                class: 'lyt-transfer__filter-input',
                placeholder: props.filterPlaceholder,
                value: leftFilter(),
                onInput: (e: any) => leftFilter.set(e.target.value),
              }),
            ]
          ) : null,

          // 左侧面板
          renderList(
            sourceData,
            currentLeftChecked,
            leftFilter(),
            toggleLeftCheck,
            toggleLeftCheckAll,
            props.titles[0]
          ),

          // 操作按钮
          createVNode(
            'div',
            { class: 'lyt-transfer__buttons' },
            [
              renderButton('right', moveToRight, currentLeftChecked.size === 0),
              renderButton('left', moveToLeft, currentRightChecked.size === 0),
            ]
          ),

          // 右侧面板
          renderList(
            targetData,
            currentRightChecked,
            rightFilter(),
            toggleRightCheck,
            toggleRightCheckAll,
            props.titles[1]
          ),

          // 右侧筛选
          props.filterable ? createVNode(
            'div',
            { class: 'lyt-transfer__filter' },
            [
              createVNode('input', {
                type: 'text',
                class: 'lyt-transfer__filter-input',
                placeholder: props.filterPlaceholder,
                value: rightFilter(),
                onInput: (e: any) => rightFilter.set(e.target.value),
              }),
            ]
          ) : null,
        ]
      );
    };
  },
});

export default Transfer;
export type { TransferOption };
