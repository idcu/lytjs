/**
 * @lytjs/ui - Menu 组件
 *
 * 导航菜单组件，支持垂直和水平模式，子菜单可折叠
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface MenuItem {
  index: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  children?: MenuItem[];
}

export interface MenuSetupProps {
  mode: 'horizontal' | 'vertical';
  defaultActive: string;
  defaultOpeneds: string[];
  uniqueOpened: boolean;
  class: string;
  onSelect: ((index: string) => void) | undefined;
  onOpen: ((index: string) => void) | undefined;
  onClose: ((index: string) => void) | undefined;
}

export interface MenuSlots {
  default?: () => VNode[];
}

export const Menu = defineComponent({
  name: 'LytMenu',

  props: {
    mode: { type: String, default: 'horizontal' },
    defaultActive: { type: String, default: '' },
    defaultOpeneds: { type: Array, default: (): string[] => [] },
    uniqueOpened: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onSelect: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: MenuSetupProps, { slots }: { slots: MenuSlots; emit: (event: string, ...args: unknown[]) => void }) {
    const activeIndex = signal(props.defaultActive);
    const openedIndexes = signal(new Set<string>(props.defaultOpeneds));

    const handleSelect = (index: string) => {
      activeIndex.set(index);
      emit('select', index);
      props.onSelect?.(index);
    };

    const toggleSubmenu = (index: string) => {
      const newOpened = new Set(openedIndexes());
      
      if (newOpened.has(index)) {
        newOpened.delete(index);
        emit('close', index);
        props.onClose?.(index);
      } else {
        if (props.uniqueOpened) {
          newOpened.clear();
        }
        newOpened.add(index);
        emit('open', index);
        props.onOpen?.(index);
      }
      
      openedIndexes.set(newOpened);
    };

    return () => {
      const menuClass = [
        'lyt-menu',
        `lyt-menu--${props.mode}`,
        props.class,
      ].filter(Boolean).join(' ');

      const items = slots.default?.() || [];

      return createVNode('ul', { class: menuClass }, [
        items.map((item: VNode) => {
          const itemProps = (item as any).props as MenuItem;
          if (!itemProps) return item;

          const isActive = itemProps.index === activeIndex();
          const isOpened = openedIndexes().has(itemProps.index);

          return createVNode('li', {
            key: itemProps.index,
            class: [
              'lyt-menu__item',
              isActive ? 'lyt-menu__item--active' : '',
              itemProps.disabled ? 'lyt-menu__item--disabled' : '',
            ].filter(Boolean).join(' '),
            onClick: () => {
              if (itemProps.disabled) return;
              if (itemProps.children && itemProps.children.length > 0) {
                toggleSubmenu(itemProps.index);
              } else {
                handleSelect(itemProps.index);
              }
            },
          }, [
            itemProps.icon && createVNode('span', { class: 'lyt-menu__icon' }, [itemProps.icon]),
            createVNode('span', { class: 'lyt-menu__title' }, [itemProps.label]),
            itemProps.children && itemProps.children.length > 0 && createVNode('span', {
              class: ['lyt-menu__arrow', isOpened ? 'lyt-menu__arrow--opened' : ''].filter(Boolean).join(' '),
            }, [isOpened ? '▲' : '▼']),
            isOpened && createVNode('ul', { class: 'lyt-menu__submenu' }, [
              itemProps.children?.map((child: MenuItem) =>
                createVNode('li', {
                  key: child.index,
                  class: [
                    'lyt-menu__item',
                    child.index === activeIndex() ? 'lyt-menu__item--active' : '',
                    child.disabled ? 'lyt-menu__item--disabled' : '',
                  ].filter(Boolean).join(' '),
                  onClick: () => {
                    if (child.disabled) return;
                    handleSelect(child.index);
                  },
                }, [
                  child.icon && createVNode('span', { class: 'lyt-menu__icon' }, [child.icon]),
                  createVNode('span', { class: 'lyt-menu__title' }, [child.label]),
                ])
              ),
            ]),
          ]);
        }),
      ]);
    };
  },
});

export type { MenuProps, MenuSlots, MenuItem } from './types';
