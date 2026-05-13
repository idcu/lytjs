/**
 * @lytjs/ui - Tabs 组件
 *
 * 标签页组件，支持卡片式和边框卡片式，可拖拽，支持标签关闭和新增
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * TabPane 组件
 */
export const TabPane = defineComponent({
  name: 'LytTabPane',

  props: {
    label: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
  },

  setup(_props: any, { slots }: any) {
    return () => {
      return createVNode('div', { class: 'lyt-tab-pane' }, slots.default?.());
    };
  },
});

/**
 * Tabs 组件
 */
export const Tabs = defineComponent({
  name: 'LytTabs',

  props: {
    modelValue: { type: String, default: '' },
    type: { type: String, default: '' },
    class: { type: String, default: '' },
    closable: { type: Boolean, default: false },
    addable: { type: Boolean, default: false },
    editable: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false },
    onChange: { type: Function, default: undefined },
    onTabClick: { type: Function, default: undefined },
    onTabRemove: { type: Function, default: undefined },
    onTabAdd: { type: Function, default: undefined },
    onTabDragStart: { type: Function, default: undefined },
    onTabDragEnd: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    // 拖拽状态
    const isDragging = signal(false);
    const dragIndex = signal<number>(-1);
    const dropIndex = signal<number>(-1);

    // 获取所有 TabPane
    const getPanes = (): any[] => {
      const defaultSlot = slots.default?.();
      if (!defaultSlot) return [];

      return defaultSlot
        .filter((vnode: any) => vnode && vnode.type?.name === 'LytTabPane')
        .map((vnode: any) => ({
          props: vnode.props,
          children: vnode.children,
        }));
    };

    // 切换标签
    const handleTabClick = (pane: any, index: number) => {
      if (pane.disabled) return;
      emit('update:modelValue', pane.name);
      props.onChange?.(pane.name);
      props.onTabClick?.(pane, index);
    };

    // 关闭标签
    const handleTabClose = (pane: any, index: number, event: Event) => {
      event.stopPropagation();
      if (pane.disabled) return;
      emit('tab-remove', pane, index);
      props.onTabRemove?.(pane, index);
    };

    // 新增标签
    const handleTabAdd = () => {
      emit('tab-add');
      props.onTabAdd?.();
    };

    // 拖拽开始
    const handleDragStart = (index: number, event: DragEvent) => {
      isDragging.set(true);
      dragIndex.set(index);
      props.onTabDragStart?.(index, event);
    };

    // 拖拽结束
    const handleDragEnd = (event: DragEvent) => {
      isDragging.set(false);
      dragIndex.set(-1);
      dropIndex.set(-1);
      props.onTabDragEnd?.(event);
    };

    // 拖拽进入
    const handleDragOver = (index: number, event: DragEvent) => {
      event.preventDefault();
      if (dragIndex() !== index) {
        dropIndex.set(index);
      }
    };

    // 拖拽放置
    const handleDrop = (index: number, event: DragEvent) => {
      event.preventDefault();
      if (dragIndex() !== -1 && dragIndex() !== index) {
        emit('tab-drag', dragIndex(), index);
      }
    };

    // 生成类名
    const getTabsClass = () => {
      const classes = ['lyt-tabs'];
      if (props.type) classes.push(`lyt-tabs--${props.type}`);
      if (isDragging()) classes.push('lyt-tabs--dragging');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    // 生成标签项类名
    const getTabItemClass = (pane: any, index: number) => {
      const classes = ['lyt-tabs__item'];
      if (pane.name === props.modelValue) classes.push('lyt-tabs__item--active');
      if (pane.disabled) classes.push('lyt-tabs__item--disabled');
      if (dropIndex() === index) classes.push('lyt-tabs__item--drop');
      if (dragIndex() === index) classes.push('lyt-tabs__item--dragging');
      return classes.join(' ');
    };

    return () => {
      const panes = getPanes();
      const activePane = panes.find((p: any) => p.props.name === props.modelValue) || panes[0];

      // 标签头
      const headerChildren = panes.map((pane: any, index: number) => {
        const tabChildren: any[] = [pane.props.label];

        // 关闭按钮
        if (props.closable || pane.props.closable) {
          tabChildren.push(
            createVNode(
              'span',
              {
                class: 'lyt-tabs__close',
                onClick: (e: Event) => handleTabClose(pane.props, index, e),
              },
              '×'
            )
          );
        }

        return createVNode(
          'div',
          {
            class: getTabItemClass(pane.props, index),
            draggable: props.draggable && !pane.props.disabled,
            onClick: () => handleTabClick(pane.props, index),
            onDragStart: (e: DragEvent) => handleDragStart(index, e),
            onDragEnd: (e: DragEvent) => handleDragEnd(e),
            onDragOver: (e: DragEvent) => handleDragOver(index, e),
            onDrop: (e: DragEvent) => handleDrop(index, e),
          },
          tabChildren
        );
      });

      // 新增按钮
      if (props.addable || props.editable) {
        headerChildren.push(
          createVNode(
            'div',
            {
              class: 'lyt-tabs__add',
              onClick: handleTabAdd,
            },
            '+'
          )
        );
      }

      return createVNode('div', { class: getTabsClass() }, [
        createVNode('div', { class: 'lyt-tabs__header' }, headerChildren),
        createVNode('div', { class: 'lyt-tabs__content' }, activePane ? activePane.children?.default?.() : []),
      ]);
    };
  },
});

export default { Tabs, TabPane };
