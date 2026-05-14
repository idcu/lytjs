/**
 * @lytjs/ui - Tabs 组件
 *
 * 标签页组件，支持卡片式和边框卡片式，可拖拽，支持标签关闭和新增
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { TabPaneSetupProps, TabsSetupProps, TabPaneSlots, TabsSlots } from './types';

export type TabsType = '' | 'card' | 'border-card';

export interface TabPane {
  props: TabPaneSetupProps;
  children: VNode[];
}

export interface DragState {
  isDragging: boolean;
  dragIndex: number;
  dropIndex: number;
}

export const TabPane = defineComponent({
  name: 'LytTabPane',

  props: {
    label: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
  },

  setup(_props: Record<string, unknown>, { slots }: { slots: TabPaneSlots }) {
    return () => {
      const defaultSlot = slots.default;
      const children: VNode[] = defaultSlot ? defaultSlot() : [];
      return createVNode('div', { class: 'lyt-tab-pane' }, children);
    };
  },
});

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

  setup(props: Record<string, unknown>, { slots }: { slots: TabsSlots }) {
    const p = props as TabsSetupProps;
    const dragState = signal<DragState>({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1,
    });

    const getPanes = (): TabPane[] => {
      const defaultSlot = slots.default;
      const defaultSlotContent = defaultSlot ? defaultSlot() : [];
      if (!defaultSlotContent || defaultSlotContent.length === 0) return [];

      return defaultSlotContent
        .filter((vnode: VNode) => vnode && (vnode as unknown as { type: { name?: string } }).type?.name === 'LytTabPane')
        .map((vnode: VNode) => ({
          props: (vnode as unknown as { props: TabPaneSetupProps }).props,
          children: (vnode as unknown as { children: VNode[] }).children,
        }));
    };

    const handleTabClick = (pane: TabPane, index: number) => {
      if (pane.props.disabled) return;
      p.onChange?.(pane.props.name);
      p.onTabClick?.(pane, index);
    };

    const handleTabRemove = (pane: TabPane, e: Event) => {
      e.stopPropagation();
      p.onTabRemove?.(pane.props.name);
    };

    const handleTabAdd = () => {
      p.onTabAdd?.();
    };

    const handleDragStart = (index: number) => {
      if (!p.draggable) return;
      dragState.set({
        isDragging: true,
        dragIndex: index,
        dropIndex: -1,
      });
      p.onTabDragStart?.(index);
    };

    const handleDragOver = (index: number) => {
      if (!dragState().isDragging) return;
      dragState.set({
        ...dragState(),
        dropIndex: index,
      });
    };

    const handleDragEnd = () => {
      const { dragIndex, dropIndex } = dragState();
      if (dragIndex !== -1 && dropIndex !== -1 && dragIndex !== dropIndex) {
        p.onTabDragEnd?.(dragIndex, dropIndex);
      }
      dragState.set({
        isDragging: false,
        dragIndex: -1,
        dropIndex: -1,
      });
    };

    return () => {
      const panes = getPanes();
      const currentName = p.modelValue || panes[0]?.props.name;

      const tabsClass = [
        'lyt-tabs',
        `lyt-tabs--${p.type || 'normal'}`,
        p.class,
      ].filter(Boolean).join(' ');

      const tabItems: VNode[] = panes.map((pane, index) => {
        const isActive = pane.props.name === currentName;
        const isDraggable = p.draggable;

        const tabChildren: VNode[] = [
          createVNode('span', { class: 'lyt-tabs__label' }, String(pane.props.label)),
        ];

        if (pane.props.closable || p.closable) {
          tabChildren.push(createVNode('span', {
            class: 'lyt-tabs__close',
            onClick: (e: Event) => handleTabRemove(pane, e),
          }, '×'));
        }

        return createVNode('div', {
          key: String(pane.props.name),
          class: [
            'lyt-tabs__item',
            isActive ? 'lyt-tabs__item--active' : '',
            pane.props.disabled ? 'lyt-tabs__item--disabled' : '',
            dragState().dropIndex === index ? 'lyt-tabs__item--drop' : '',
          ].filter(Boolean).join(' '),
          draggable: isDraggable,
          onClick: () => handleTabClick(pane, index),
          onDragStart: () => handleDragStart(index),
          onDragOver: (e: DragEvent) => { e.preventDefault(); handleDragOver(index); },
          onDragEnd: handleDragEnd,
        }, tabChildren);
      });

      if (p.addable || p.editable) {
        tabItems.push(createVNode('div', {
          class: 'lyt-tabs__add-btn',
          onClick: handleTabAdd,
        }, '+'));
      }

      const content = panes.find(pane => pane.props.name === currentName);

      const contentPane = content
        ? createVNode('div', { class: 'lyt-tabs__pane' }, content.children)
        : createVNode('div', { style: 'display: none;' }, []);

      return createVNode('div', { class: tabsClass }, [
        createVNode('div', { class: 'lyt-tabs__header' }, [
          createVNode('div', { class: 'lyt-tabs__nav' }, tabItems),
        ]),
        createVNode('div', { class: 'lyt-tabs__content' }, [contentPane]),
      ]);
    };
  },
});

export type { TabsProps, TabsSlots, TabPaneProps, TabPaneSlots } from './types';
