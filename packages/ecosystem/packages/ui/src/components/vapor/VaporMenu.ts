/**
 * @lytjs/ui - VaporMenu 组件
 *
 * Vapor 模式的菜单组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface MenuItem {
  index: string;
  label: string;
  disabled?: boolean;
  children?: MenuItem[];
  icon?: VNode;
}

export interface VaporMenuItemProps {
  index: string;
  label: string;
  disabled?: boolean;
  icon?: VNode;
}

export interface VaporSubMenuProps {
  index: string;
  label: string;
  disabled?: boolean;
}

export interface VaporMenuProps {
  mode?: 'horizontal' | 'vertical';
  defaultActive?: string;
  defaultOpeneds?: string[];
  uniqueOpened?: boolean;
  class?: string;
  style?: string;
  items?: MenuItem[];
  onSelect?: (index: string) => void;
  onOpen?: (index: string) => void;
  onClose?: (index: string) => void;
}

export const VaporMenuItem = {
  name: 'VaporMenuItem',

  props: {
    index: { type: String, required: true },
    label: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    icon: { type: Object, default: null },
  },

  setup(_props: Record<string, unknown>) {
    return () => {
      return createVNode('div', { class: 'vapor-menu__item' }, []);
    };
  },
};

export const VaporSubMenu = {
  name: 'VaporSubMenu',

  props: {
    index: { type: String, required: true },
    label: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },

  setup(_props: Record<string, unknown>, { slots }: { slots: { default?: () => VNode[] } }) {
    return () => {
      const children = slots.default?.() || [];
      return createVNode(
        'div',
        {
          class: 'vapor-menu__submenu',
        },
        [
          createVNode('div', { class: 'vapor-menu__submenu-title' }, []),
          createVNode('div', { class: 'vapor-menu__submenu-content' }, children),
        ],
      );
    };
  },
};

export const VaporMenu = {
  name: 'VaporMenu',

  props: {
    mode: { type: String, default: 'horizontal' },
    defaultActive: { type: String, default: '' },
    defaultOpeneds: { type: Array, default: (): string[] => [] },
    uniqueOpened: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    items: { type: Array, default: (): MenuItem[] => [] },
    onSelect: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporMenuProps;
    const activeIndex = signal(p.defaultActive || '');
    const openedIndexes = signal(new Set<string>(p.defaultOpeneds || []));

    const handleSelect = (index: string) => {
      activeIndex.set(index);
      p.onSelect?.(index);
    };

    const toggleSubmenu = (index: string) => {
      const newOpened = new Set(openedIndexes());

      if (newOpened.has(index)) {
        newOpened.delete(index);
        p.onClose?.(index);
      } else {
        if (p.uniqueOpened) {
          newOpened.clear();
        }
        newOpened.add(index);
        p.onOpen?.(index);
      }

      openedIndexes.set(newOpened);
    };

    const renderMenuItem = (item: MenuItem, depth = 0): VNode => {
      const isActive = item.index === activeIndex();
      const isOpened = openedIndexes().has(item.index);
      const hasChildren = !!(item.children && item.children.length > 0);

      const itemChildren: VNode[] = [];

      if (item.icon) {
        itemChildren.push(createVNode('span', { class: 'vapor-menu__icon' }, [item.icon]));
      }

      itemChildren.push(
        createVNode('span', { class: 'vapor-menu__title' }, [createVNode('span', {}, item.label)]),
      );

      if (hasChildren) {
        itemChildren.push(
          createVNode('span', { class: 'vapor-menu__arrow' }, [
            createVNode('span', {}, isOpened ? '▲' : '▼'),
          ]),
        );

        const submenuChildren: VNode[] = (item.children || []).map((child) =>
          renderMenuItem(child, depth + 1),
        );

        itemChildren.push(
          createVNode(
            'div',
            {
              class: ['vapor-menu__submenu', isOpened ? 'vapor-menu__submenu--opened' : '']
                .filter(Boolean)
                .join(' '),
            },
            [createVNode('ul', { class: 'vapor-menu__submenu-list' }, submenuChildren)],
          ),
        );
      }

      return createVNode(
        'li',
        {
          class: [
            'vapor-menu__item',
            isActive ? 'vapor-menu__item--active' : '',
            item.disabled ? 'vapor-menu__item--disabled' : '',
          ]
            .filter(Boolean)
            .join(' '),
          onClick: () => {
            if (item.disabled) return;
            if (hasChildren) {
              toggleSubmenu(item.index);
            } else {
              handleSelect(item.index);
            }
          },
        },
        itemChildren,
      );
    };

    return () => {
      const menuClass = ['vapor-menu', `vapor-menu--${p.mode}`, p.class].filter(Boolean).join(' ');

      const items = p.items || [];
      const menuItems: VNode[] = items.map((item) => renderMenuItem(item));

      return createVNode(
        'ul',
        {
          class: menuClass,
        },
        menuItems,
      );
    };
  },
};
