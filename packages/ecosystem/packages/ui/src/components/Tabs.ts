/**
 * @lytjs/ui - Tabs 组件
 *
 * 标签页组件，支持卡片式和边框卡片式，可拖拽，支持标签关闭和新增
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { getTablistA11yProps, getTabA11yProps, getTabpanelA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onTabClick: { type: Function, default: undefined },
    onTabRemove: { type: Function, default: undefined },
    onTabAdd: { type: Function, default: undefined },
    onTabDragStart: { type: Function, default: undefined },
    onTabDragEnd: { type: Function, default: undefined },
    onKeydown: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: TabsSlots }) {
    const p = props as TabsSetupProps;
    const dragState = signal<DragState>({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1,
    });
    const activeIndex = signal(0);

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

    const getEnabledPanes = (panes: TabPane[]) => {
      return panes.filter(pane => !pane.props.disabled);
    };

    const handleTabClick = (pane: TabPane, index: number) => {
      if (pane.props.disabled) return;
      p.onChange?.(pane.props.name);
      p.onTabClick?.(pane, index);
      activeIndex.set(index);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      const panes = getPanes();
      const enabledPanes = getEnabledPanes(panes);
      
      if (enabledPanes.length === 0) return;

      let newIndex = activeIndex();
      
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          // 找到下一个启用的标签页
          for (let i = 1; i <= panes.length; i++) {
            const nextIndex = (activeIndex() + i) % panes.length;
            if (panes[nextIndex] && !panes[nextIndex].props.disabled) {
              newIndex = nextIndex;
              break;
            }
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          // 找到上一个启用的标签页
          for (let i = 1; i <= panes.length; i++) {
            const prevIndex = (activeIndex() - i + panes.length) % panes.length;
            if (panes[prevIndex] && !panes[prevIndex].props.disabled) {
              newIndex = prevIndex;
              break;
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          // 找到第一个启用的标签页
          newIndex = panes.findIndex(pane => pane != null && pane.props != null && !pane.props.disabled);
          break;
        case 'End':
          e.preventDefault();
          // 找到最后一个启用的标签页
          for (let i = panes.length - 1; i >= 0; i--) {
            const pane = panes[i];
            if (pane && pane.props && !pane.props.disabled) {
              newIndex = i;
              break;
            }
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          // 激活当前标签页
          const currentPane = panes[activeIndex()];
          if (currentPane && !currentPane.props.disabled) {
            handleTabClick(currentPane, activeIndex());
          }
          break;
      }

      if (newIndex !== activeIndex()) {
        activeIndex.set(newIndex);
        const pane = panes[newIndex];
        if (pane && !pane.props.disabled) {
          handleTabClick(pane, newIndex);
        }
      }

      p.onKeydown?.(e);
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

      // 同步 activeIndex 与当前激活的标签页
      const currentIndex = panes.findIndex(pane => pane.props.name === currentName);
      if (currentIndex !== -1 && currentIndex !== activeIndex()) {
        activeIndex.set(currentIndex);
      }

      const tabsClass = [
        'lyt-tabs',
        `lyt-tabs--${p.type || 'normal'}`,
        p.class,
      ].filter(Boolean).join(' ');

      const tabItems: VNode[] = panes.map((pane, index) => {
        const isActive = pane.props.name === currentName;
        const isDraggable = p.draggable;

        const tabChildren: VNode[] = [
          createVNode('span', { class: 'lyt-tabs__label' }, [createTextVNode(String(pane.props.label))]),
        ];

        if (pane.props.closable || p.closable) {
          const closeBtnProps = getButtonA11yProps({
            ariaLabel: 'Close tab',
            disabled: pane.props.disabled,
          });
          tabChildren.push(createVNode('span', mergeA11yProps(closeBtnProps, {
            class: 'lyt-tabs__close',
            onClick: (e: Event) => handleTabRemove(pane, e),
          }), [createTextVNode('×')]));
        }

        const tabA11yProps = getTabA11yProps({
          id: `${p.id || 'tabs'}-tab-${pane.props.name}`,
          selected: isActive,
          disabled: pane.props.disabled,
          controls: `${p.id || 'tabs'}-panel-${pane.props.name}`,
        });

        return createVNode('div', mergeA11yProps(tabA11yProps, {
          key: String(pane.props.name),
          class: [
            'lyt-tabs__item',
            isActive ? 'lyt-tabs__item--active' : '',
            pane.props.disabled ? 'lyt-tabs__item--disabled' : '',
            dragState().dropIndex === index ? 'lyt-tabs__item--drop' : '',
          ].filter(Boolean).join(' '),
          draggable: isDraggable,
          onClick: () => handleTabClick(pane, index),
          onKeydown: handleKeydown,
          onDragStart: () => handleDragStart(index),
          onDragOver: (e: DragEvent) => { e.preventDefault(); handleDragOver(index); },
          onDragEnd: handleDragEnd,
        }), tabChildren);
      });

      if (p.addable || p.editable) {
        const addBtnProps = getButtonA11yProps({
          ariaLabel: 'Add tab',
        });
        tabItems.push(createVNode('div', mergeA11yProps(addBtnProps, {
          class: 'lyt-tabs__add-btn',
          onClick: handleTabAdd,
        }), [createTextVNode('+')]));
      }

      const content = panes.find(pane => pane.props.name === currentName);

      const tabpanelProps = content ? getTabpanelA11yProps({
        id: `${p.id || 'tabs'}-panel-${content.props.name}`,
        labelledBy: `${p.id || 'tabs'}-tab-${content.props.name}`,
      }) : {};

      const contentPane = content
        ? createVNode('div', mergeA11yProps(tabpanelProps, { 
            class: 'lyt-tabs__pane',
          }), content.children)
        : createVNode('div', { style: 'display: none;' }, []);

      const tablistA11yProps = getTablistA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel || 'Tabs',
        ariaDescribedBy: p.ariaDescribedBy,
      });

      return createVNode('div', mergeA11yProps(tablistA11yProps, { 
        class: tabsClass,
        onKeydown: handleKeydown,
      }), [
        createVNode('div', { class: 'lyt-tabs__header' }, [
          createVNode('div', { class: 'lyt-tabs__nav' }, tabItems),
        ]),
        createVNode('div', { class: 'lyt-tabs__content' }, [contentPane]),
      ]);
    };
  },
});

export type { TabsProps, TabsSlots, TabPaneProps, TabPaneSlots } from './types';
