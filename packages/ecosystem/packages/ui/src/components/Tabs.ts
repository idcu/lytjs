/**
 * @lytjs/ui - Tabs 组件
 *
 * 标签页组件，支持卡片式和边框卡片式，可拖拽，支持标签关闭和新增
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface TabPaneSetupProps {
  label: string;
  name: string;
  disabled: boolean;
  closable: boolean;
}

export interface TabPaneSlots {
  default?: () => VNode[];
}

export interface TabPane {
  props: TabPaneSetupProps;
  children: VNode[];
}

export const TabPane = defineComponent({
  name: 'LytTabPane',

  props: {
    label: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
  },

  setup(_props: TabPaneSetupProps, { slots }: { slots: TabPaneSlots }) {
    return () => {
      return createVNode('div', { class: 'lyt-tab-pane' }, slots.default?.());
    };
  },
});

export type TabsType = '' | 'card' | 'border-card';

export interface TabsSetupProps {
  modelValue: string;
  type: TabsType;
  closable: boolean;
  addable: boolean;
  editable: boolean;
  draggable: boolean;
  class: string;
  onChange: ((name: string) => void) | undefined;
  onTabClick: ((pane: TabPane, index: number) => void) | undefined;
  onTabRemove: ((name: string) => void) | undefined;
  onTabAdd: (() => void) | undefined;
  onTabDragStart: ((index: number) => void) | undefined;
  onTabDragEnd: ((fromIndex: number, toIndex: number) => void) | undefined;
}

export interface TabsSlots {
  default?: () => VNode[];
}

export interface DragState {
  isDragging: boolean;
  dragIndex: number;
  dropIndex: number;
}

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

  setup(props: TabsSetupProps, { slots }: { slots: TabsSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const dragState = signal<DragState>({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1,
    });

    const getPanes = (): TabPane[] => {
      const defaultSlot = slots.default?.();
      if (!defaultSlot) return [];

      return defaultSlot
        .filter((vnode: VNode) => vnode && (vnode as any).type?.name === 'LytTabPane')
        .map((vnode: VNode) => ({
          props: (vnode as any).props as TabPaneSetupProps,
          children: (vnode as any).children as VNode[],
        }));
    };

    const handleTabClick = (pane: TabPane, index: number) => {
      if (pane.props.disabled) return;
      emit('update:modelValue', pane.props.name);
      props.onChange?.(pane.props.name);
      props.onTabClick?.(pane, index);
    };

    const handleTabRemove = (pane: TabPane, e: Event) => {
      e.stopPropagation();
      props.onTabRemove?.(pane.props.name);
    };

    const handleTabAdd = () => {
      props.onTabAdd?.();
    };

    const handleDragStart = (index: number) => {
      if (!props.draggable) return;
      dragState.set({
        isDragging: true,
        dragIndex: index,
        dropIndex: -1,
      });
      props.onTabDragStart?.(index);
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
        props.onTabDragEnd?.(dragIndex, dropIndex);
      }
      dragState.set({
        isDragging: false,
        dragIndex: -1,
        dropIndex: -1,
      });
    };

    return () => {
      const panes = getPanes();
      const currentName = props.modelValue || panes[0]?.props.name;

      const tabsClass = [
        'lyt-tabs',
        `lyt-tabs--${props.type || 'normal'}`,
        props.class,
      ].filter(Boolean).join(' ');

      const tabItems: VNode[] = panes.map((pane, index) => {
        const isActive = pane.props.name === currentName;
        const isDraggable = props.draggable;

        return createVNode('div', {
          key: pane.props.name,
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
        }, [
          createVNode('span', { class: 'lyt-tabs__label' }, [pane.props.label]),
          (pane.props.closable || props.closable) && createVNode('span', {
            class: 'lyt-tabs__close',
            onClick: (e: Event) => handleTabRemove(pane, e),
          }, ['×']),
        ]);
      });

      if (props.addable || props.editable) {
        tabItems.push(createVNode('div', {
          class: 'lyt-tabs__add-btn',
          onClick: handleTabAdd,
        }, ['+']));
      }

      const content = panes.find(p => p.props.name === currentName);

      return createVNode('div', { class: tabsClass }, [
        createVNode('div', { class: 'lyt-tabs__header' }, [
          createVNode('div', { class: 'lyt-tabs__nav' }, [tabItems]),
        ]),
        createVNode('div', { class: 'lyt-tabs__content' }, [
          content ? createVNode('div', { class: 'lyt-tabs__pane' }, [content.children]) : null,
        ]),
      ]);
    };
  },
});

export type { TabsProps, TabsSlots, TabPaneProps, TabPaneSlots } from './types';
