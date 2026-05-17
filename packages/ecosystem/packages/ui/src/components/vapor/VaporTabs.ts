/**
 * @lytjs/ui - VaporTabs 组件
 *
 * Vapor 模式的标签页组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { createVNode, type VNode } from '@lytjs/vdom';

export interface TabPane {
  label: string;
  name: string;
  disabled?: boolean;
  closable?: boolean;
}

export interface VaporTabPaneProps {
  label: string;
  name: string;
  disabled?: boolean;
  closable?: boolean;
}

export interface VaporTabsProps {
  modelValue?: string;
  panes?: TabPane[];
  type?: '' | 'card' | 'border-card';
  closable?: boolean;
  class?: string;
  style?: string;
  onChange?: (name: string) => void;
  onTabClick?: (pane: TabPane, index: number) => void;
  onTabRemove?: (name: string) => void;
}

export const VaporTabPane = {
  name: 'VaporTabPane',

  props: {
    label: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
  },

  setup(_props: Record<string, unknown>, { slots }: { slots: { default?: () => VNode[] } }) {
    return () => {
      const children = slots.default?.() || [];
      return createVNode('div', { class: 'vapor-tab-pane' }, children);
    };
  },
};

export const VaporTabs = {
  name: 'VaporTabs',

  props: {
    modelValue: { type: String, default: '' },
    panes: { type: Array, default: (): TabPane[] => [] },
    type: { type: String, default: '' },
    closable: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onTabClick: { type: Function, default: undefined },
    onTabRemove: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporTabsProps;

    return () => {
      const panes = p.panes || [];
      const currentName = p.modelValue || panes[0]?.name;

      const tabsClass = [
        'vapor-tabs',
        `vapor-tabs--${p.type || 'normal'}`,
        p.class,
      ].filter(Boolean).join(' ');

      const tabItems: VNode[] = panes.map((pane, index) => {
        const isActive = pane.name === currentName;

        const tabChildren: VNode[] = [
          createVNode('span', { class: 'vapor-tabs__label' }, [createVNode('span', {}, pane.label)]),
        ];

        if (pane.closable || p.closable) {
          tabChildren.push(createVNode('span', {
            class: 'vapor-tabs__close',
            onClick: (e: Event) => {
              e.stopPropagation();
              p.onTabRemove?.(pane.name);
            },
          }, [createVNode('span', {}, '×')]));
        }

        return createVNode('div', {
          key: pane.name,
          class: [
            'vapor-tabs__item',
            isActive ? 'vapor-tabs__item--active' : '',
            pane.disabled ? 'vapor-tabs__item--disabled' : '',
          ].filter(Boolean).join(' '),
          onClick: () => {
            if (!pane.disabled) {
              p.onChange?.(pane.name);
              p.onTabClick?.(pane, index);
            }
          },
        }, tabChildren);
      });

      return createVNode('div', { class: tabsClass }, [
        createVNode('div', { class: 'vapor-tabs__header' }, [
          createVNode('div', { class: 'vapor-tabs__nav' }, tabItems),
        ]),
        createVNode('div', { class: 'vapor-tabs__content' }, []),
      ]);
    };
  },
};
