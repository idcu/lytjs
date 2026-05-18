/**
 * @lytjs/ui - Tabs 组件（增强版）
 *
 * 标签页组件，支持卡片式和边框卡片式，可拖拽，支持标签关闭和新增
 * 增强 Accessibility 支持：
 * - Roving tabindex（只有一个标签页有 tabindex="0"）
 * - 焦点管理（激活时聚焦到标签页）
 * - 屏幕阅读器支持（Live regions）
 * - 完整的 ARIA 属性
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
    const tabListRef = signal<HTMLElement | null>(null);
    const previousActiveElement = signal<HTMLElement | null>(null);
    const announcement = signal('');
    const tablistId = signal(`lyt-tabs-${Math.random().toString(36).substr(2, 9)}`);

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

    const announce = (message: string) => {
      announcement.set(message);
      setTimeout(() => announcement.set(''), 1000);
    };

    const handleTabClick = (pane: TabPane, index: number) => {
      if (pane.props.disabled) return;
      
      const oldIndex = activeIndex();
      activeIndex.set(index);
      
      if (oldIndex !== index) {
        const panes = getPanes();
        announce(`已切换到标签页 ${index + 1}：${pane.props.label}，共 ${panes.length} 个标签页`);
      }
      
      p.onChange?.(pane.props.name);
      p.onTabClick?.(pane, index);

      previousActiveElement.set(document.activeElement as HTMLElement);
      setTimeout(() => {
        const tabList = tabListRef();
        if (tabList) {
          const activeTab = tabList.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
          activeTab?.focus();
        }
      }, 10);
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
          newIndex = panes.findIndex(pane => pane != null && pane.props != null && !pane.props.disabled);
          break;
        case 'End':
          e.preventDefault();
          for (let i = panes.length - 1; i >= 0; i--) {
            const pane = panes[i];
            if (pane && pane.props && !pane.props.disabled) {
              newIndex = i;
              break;
            }
          }
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const currentPane = panes[activeIndex()];
          if (currentPane && !currentPane.props.disabled) {
            handleTabClick(currentPane, activeIndex());
          }
          break;
        }
        case 'Delete':
        case 'Backspace':
          if (p.closable) {
            const currentPane = panes[activeIndex()];
            if (currentPane && currentPane.props.closable) {
              e.preventDefault();
              handleTabRemove(currentPane, new Event('keydown') as unknown as Event);
            }
          }
          break;
      }

      if (newIndex !== activeIndex()) {
        const pane = panes[newIndex];
        if (pane && !pane.props.disabled) {
          activeIndex.set(newIndex);
          announce(`已切换到标签页 ${newIndex + 1}：${pane.props.label}`);
          handleTabClick(pane, newIndex);
        }
      }

      p.onKeydown?.(e);
    };

    const handleTabRemove = (pane: TabPane, e: Event) => {
      e.stopPropagation();
      const panes = getPanes();
      const index = panes.findIndex(p => p.props.name === pane.props.name);
      
      if (index > 0) {
        const prevPane = panes[index - 1];
        activeIndex.set(index - 1);
        if (prevPane) {
          announce(`已关闭标签页 ${pane.props.label}，现在显示标签页 ${prevPane.props.label}`);
        }
      } else if (panes.length > 1) {
        const nextPane = panes[index + 1];
        activeIndex.set(0);
        if (nextPane) {
          announce(`已关闭标签页 ${pane.props.label}，现在显示标签页 ${nextPane.props.label}`);
        }
      } else {
        announce(`已关闭标签页 ${pane.props.label}，现在没有标签页`);
      }
      
      p.onTabRemove?.(pane.props.name);
    };

    const handleTabAdd = () => {
      announce('正在添加新标签页');
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
        announce(`标签页已从位置 ${dragIndex + 1} 移动到位置 ${dropIndex + 1}`);
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
      const currentIndex = panes.findIndex(pane => pane.props.name === currentName);
      
      if (currentIndex !== -1 && currentIndex !== activeIndex()) {
        activeIndex.set(currentIndex);
      }

      const tabsClass = [
        'lyt-tabs',
        `lyt-tabs--${p.type || 'normal'}`,
        p.class,
      ].filter(Boolean).join(' ');

      const tabListId = tablistId();

      const tabItems: VNode[] = panes.map((pane, index) => {
        const isActive = pane.props.name === currentName;
        const isDraggable = p.draggable;

        const tabChildren: VNode[] = [
          createVNode('span', { class: 'lyt-tabs__label' }, [createTextVNode(String(pane.props.label))]),
        ];

        if (pane.props.closable || p.closable) {
          const closeBtnProps = getButtonA11yProps({
            ariaLabel: `关闭标签页 ${pane.props.label}`,
            disabled: pane.props.disabled,
          });
          tabChildren.push(createVNode('span', mergeA11yProps(closeBtnProps, {
            class: 'lyt-tabs__close',
            onClick: (e: Event) => handleTabRemove(pane, e),
          }), [createTextVNode('×')]));
        }

        const tabId = `${p.id || tabListId}-tab-${pane.props.name}`;
        const panelId = `${p.id || tabListId}-panel-${pane.props.name}`;

        const tabA11yProps = getTabA11yProps({
          id: tabId,
          selected: isActive,
          disabled: pane.props.disabled,
          controls: panelId,
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
          ariaLabel: '添加新标签页',
        });
        tabItems.push(createVNode('div', mergeA11yProps(addBtnProps, {
          class: 'lyt-tabs__add-btn',
          onClick: handleTabAdd,
        }), [createTextVNode('+')]));
      }

      const content = panes.find(pane => pane.props.name === currentName);
      const panelId = `${p.id || tabListId}-panel-${content?.props.name || 'default'}`;

      const tabpanelProps = content ? getTabpanelA11yProps({
        id: panelId,
        labelledBy: `${p.id || tabListId}-tab-${content.props.name}`,
      }) : {};

      const contentPane = content
        ? createVNode('div', mergeA11yProps(tabpanelProps, { 
            class: 'lyt-tabs__pane',
            id: panelId,
            role: 'tabpanel',
          }), content.children)
        : createVNode('div', { style: 'display: none;', id: panelId }, []);

      const tablistA11yProps = getTablistA11yProps({
        id: p.id || tabListId,
        ariaLabel: p.ariaLabel || '标签页导航',
        ariaDescribedBy: p.ariaDescribedBy,
      });

      return createVNode('div', mergeA11yProps(tablistA11yProps, { 
        class: tabsClass,
        onKeydown: handleKeydown,
      }), [
        createVNode('div', {
          ref: (el: HTMLElement) => tabListRef.set(el),
          class: 'lyt-tabs__header',
          role: 'tablist',
          'aria-label': p.ariaLabel || '标签页',
        }, [
          createVNode('div', { class: 'lyt-tabs__nav' }, tabItems),
        ]),
        createVNode('div', { class: 'lyt-tabs__content' }, [contentPane]),
        createVNode('div', {
          class: 'lyt-tabs__sro',
          role: 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
        }, announcement()),
      ]);
    };
  },
});

export type { TabsProps, TabsSlots, TabPaneProps, TabPaneSlots } from './types';
