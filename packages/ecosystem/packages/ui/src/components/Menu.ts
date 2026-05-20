/**
 * @lytjs/ui - Menu 组件（增强版）
 *
 * 导航菜单组件，支持垂直和水平模式，子菜单可折叠
 * 增强 Accessibility 支持：
 * - 完整的 ARIA 属性（menu, menuitem, menubar）
 * - 键盘导航改进（方向键导航，Enter 激活，Escape 关闭子菜单）
 * - 焦点管理（打开子菜单时聚焦，关闭后返回）
 * - 屏幕阅读器支持（Announcements）
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

export interface MenuSetupProps {
  mode: string;
  defaultActive: string;
  defaultOpeneds: string[];
  uniqueOpened: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onSelect: ((index: string) => void) | undefined;
  onOpen: ((index: string) => void) | undefined;
  onClose: ((index: string) => void) | undefined;
}

export interface MenuSlots {
  default?: () => VNode[];
}

interface MenuItemInfo {
  index: string;
  label: string;
  disabled: boolean;
  hasChildren: boolean;
  element: HTMLElement | null;
}

export const Menu = defineComponent({
  name: 'LytMenu',

  props: {
    mode: { type: String, default: 'horizontal' },
    defaultActive: { type: String, default: '' },
    defaultOpeneds: { type: Array, default: (): string[] => [] },
    uniqueOpened: { type: Boolean, default: false },
    class: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onSelect: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: MenuSlots }) {
    const p = props as unknown as MenuSetupProps;
    const activeIndex = signal(p.defaultActive);
    const openedIndexes = signal(new Set<string>(p.defaultOpeneds));
    const menuRef = signal<HTMLElement | null>(null);
    const currentSubmenu = signal<string | null>(null);
    const focusedIndex = signal(-1);
    const announcement = signal('');
    const previousActiveElement = signal<HTMLElement | null>(null);
    const menuId = signal(`lyt-menu-${Math.random().toString(36).substr(2, 9)}`);

    const announce = (message: string) => {
      announcement.set(message);
      setTimeout(() => announcement.set(''), 1000);
    };

    const getMenuItems = (): MenuItemInfo[] => {
      const items = slots.default?.() || [];
      const menuItems: MenuItemInfo[] = [];

      items.forEach((item: VNode) => {
        const itemProps = (
          item as unknown as {
            props: {
              index?: string;
              label?: string;
              icon?: unknown;
              children?: unknown[];
              disabled?: boolean;
            };
          }
        ).props;
        if (!itemProps || !itemProps.index) return;

        const hasChildren = !!(itemProps.children && (itemProps.children as unknown[]).length > 0);
        menuItems.push({
          index: itemProps.index,
          label: itemProps.label || '',
          disabled: !!itemProps.disabled,
          hasChildren,
          element: null,
        });
      });

      return menuItems;
    };

    const handleSelect = (index: string) => {
      activeIndex.set(index);
      announce(`已选择菜单项：${index}`);
      p.onSelect?.(index);
    };

    const toggleSubmenu = (index: string, itemLabel: string) => {
      const newOpened = new Set(openedIndexes());

      if (newOpened.has(index)) {
        newOpened.delete(index);
        announce(`已关闭子菜单：${itemLabel}`);
        p.onClose?.(index);
        currentSubmenu.set(null);

        const prevEl = previousActiveElement();
        if (prevEl && prevEl.focus) {
          prevEl.focus();
        }
      } else {
        if (p.uniqueOpened) {
          newOpened.clear();
          if (currentSubmenu()) {
            announce('已关闭其他子菜单');
          }
        }
        newOpened.add(index);
        announce(`已打开子菜单：${itemLabel}`);
        p.onOpen?.(index);
        currentSubmenu.set(index);

        previousActiveElement.set(document.activeElement as HTMLElement);
        setTimeout(() => {
          const menu = menuRef();
          if (menu) {
            const submenu = menu.querySelector(`[data-submenu-id="${index}"] ul`);
            if (submenu) {
              const firstItem = submenu.querySelector('[role="menuitem"]') as HTMLElement;
              firstItem?.focus();
            }
          }
        }, 10);
      }

      openedIndexes.set(newOpened);
    };

    const handleKeydown = (
      e: KeyboardEvent,
      itemIndex: string,
      hasChildren: boolean,
      itemLabel: string,
    ) => {
      const menuItems = getMenuItems();
      const currentIndex = menuItems.findIndex((item) => item.index === itemIndex);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (hasChildren && !openedIndexes().has(itemIndex)) {
            toggleSubmenu(itemIndex, itemLabel);
          } else {
            for (let i = 1; i <= menuItems.length; i++) {
              const nextIndex = (currentIndex + i) % menuItems.length;
              const nextItem = menuItems[nextIndex];
              if (nextItem && !nextItem.disabled) {
                announce(`导航到菜单项：${nextItem.label}`);
                focusedIndex.set(nextIndex);
                break;
              }
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          for (let i = 1; i <= menuItems.length; i++) {
            const prevIndex = (currentIndex - i + menuItems.length) % menuItems.length;
            const prevItem = menuItems[prevIndex];
            if (prevItem && !prevItem.disabled) {
              announce(`导航到菜单项：${prevItem.label}`);
              focusedIndex.set(prevIndex);
              break;
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          for (let i = 1; i <= menuItems.length; i++) {
            const nextIndex = (currentIndex + i) % menuItems.length;
            const nextItem = menuItems[nextIndex];
            if (nextItem && !nextItem.disabled) {
              announce(`导航到菜单项：${nextItem.label}`);
              focusedIndex.set(nextIndex);
              break;
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          for (let i = 1; i <= menuItems.length; i++) {
            const prevIndex = (currentIndex - i + menuItems.length) % menuItems.length;
            const prevItem = menuItems[prevIndex];
            if (prevItem && !prevItem.disabled) {
              announce(`导航到菜单项：${prevItem.label}`);
              focusedIndex.set(prevIndex);
              break;
            }
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (hasChildren) {
            toggleSubmenu(itemIndex, itemLabel);
          } else {
            handleSelect(itemIndex);
          }
          break;

        case 'Escape':
          if (openedIndexes().has(itemIndex)) {
            e.preventDefault();
            toggleSubmenu(itemIndex, itemLabel);
          }
          break;

        case 'Home': {
          e.preventDefault();
          const firstEnabled = menuItems.find((item) => !item.disabled);
          if (firstEnabled) {
            announce(`导航到第一个菜单项：${firstEnabled.label}`);
            focusedIndex.set(menuItems.indexOf(firstEnabled));
          }
          break;
        }

        case 'End':
          e.preventDefault();
          for (let i = menuItems.length - 1; i >= 0; i--) {
            const item = menuItems[i];
            if (item && !item.disabled) {
              announce(`导航到最后一个菜单项：${item.label}`);
              focusedIndex.set(i);
              break;
            }
          }
          break;
      }
    };

    return () => {
      const menuClass = ['lyt-menu', `lyt-menu--${p.mode}`, p.class].filter(Boolean).join(' ');

      const items = slots.default?.() || [];
      const menuListId = menuId();

      const menuItems: VNode[] = items.map((item: VNode, index: number) => {
        const itemProps = (
          item as unknown as {
            props: {
              index?: string;
              label?: string;
              icon?: unknown;
              children?: unknown[];
              disabled?: boolean;
            };
          }
        ).props;
        if (!itemProps) return item;

        const isActive = itemProps.index === activeIndex();
        const isOpened = openedIndexes().has(itemProps.index as string);
        const isFocused = focusedIndex() === index;

        const itemChildren: VNode[] = [];

        if (itemProps.icon) {
          itemChildren.push(
            createVNode('span', { class: 'lyt-menu__icon' }, [itemProps.icon as unknown as VNode]),
          );
        }
        itemChildren.push(
          createVNode('span', { class: 'lyt-menu__title' }, [
            createVNode('span', {}, String(itemProps.label || '')),
          ]),
        );

        const hasChildren = !!(itemProps.children && (itemProps.children as unknown[]).length > 0);
        const itemId = `${menuListId}-item-${itemProps.index}`;

        if (hasChildren) {
          itemChildren.push(
            createVNode(
              'span',
              {
                class: ['lyt-menu__arrow', isOpened ? 'lyt-menu__arrow--opened' : '']
                  .filter(Boolean)
                  .join(' '),
                'aria-hidden': 'true',
              },
              [createVNode('span', {}, isOpened ? '▲' : '▼')],
            ),
          );

          const submenuChildren: VNode[] = (itemProps.children as unknown[]).map(
            (child: unknown) => {
              const childItem = child as {
                index?: string;
                label?: string;
                icon?: unknown;
                disabled?: boolean;
              };
              const childItemId = `${itemId}-child-${childItem.index}`;
              const isChildActive = childItem.index === activeIndex();

              return createVNode(
                'li',
                {
                  key: childItem.index,
                  id: childItemId,
                  class: [
                    'lyt-menu__item',
                    'lyt-menu__submenu-item',
                    isChildActive ? 'lyt-menu__item--active' : '',
                    childItem.disabled ? 'lyt-menu__item--disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' '),
                  role: 'menuitem',
                  'aria-disabled': childItem.disabled,
                  onClick: () => {
                    if (childItem.disabled) return;
                    handleSelect(childItem.index as string);
                  },
                },
                [
                  childItem.icon
                    ? createVNode('span', { class: 'lyt-menu__icon' }, [
                        childItem.icon as unknown as VNode,
                      ])
                    : createVNode('span', {}, ''),
                  createVNode('span', { class: 'lyt-menu__title' }, [
                    createVNode('span', {}, String(childItem.label || '')),
                  ]),
                ],
              );
            },
          );

          itemChildren.push(
            createVNode(
              'div',
              {
                'data-submenu-id': itemProps.index,
                class: ['lyt-menu__submenu', isOpened ? 'lyt-menu__submenu--opened' : '']
                  .filter(Boolean)
                  .join(' '),
                'aria-label': itemProps.label,
              },
              [
                createVNode(
                  'ul',
                  {
                    class: 'lyt-menu__submenu-list',
                    role: 'menu',
                  },
                  submenuChildren,
                ),
              ],
            ),
          );
        }

        const itemMenuitemProps = {
          id: itemId,
          'aria-disabled': itemProps.disabled ? true : undefined,
          'aria-expanded': hasChildren ? isOpened : undefined,
          'aria-haspopup': hasChildren ? true : undefined,
        };

        return createVNode(
          'li',
          mergeA11yProps(itemMenuitemProps, {
            key: itemProps.index,
            class: [
              'lyt-menu__item',
              isActive ? 'lyt-menu__item--active' : '',
              isFocused ? 'lyt-menu__item--focused' : '',
              itemProps.disabled ? 'lyt-menu__item--disabled' : '',
            ]
              .filter(Boolean)
              .join(' '),
            role: 'menuitem',
            tabIndex: isFocused ? 0 : -1,
            'aria-haspopup': hasChildren,
            'aria-expanded': hasChildren ? isOpened : undefined,
            onClick: () => {
              if (itemProps.disabled) return;
              if (hasChildren) {
                toggleSubmenu(itemProps.index as string, itemProps.label || '');
              } else {
                handleSelect(itemProps.index as string);
              }
            },
            onKeydown: (e: KeyboardEvent) =>
              handleKeydown(e, itemProps.index as string, hasChildren, itemProps.label || ''),
          }),
          itemChildren,
        );
      });

      return createVNode(
        'div',
        {
          ref: (el: HTMLElement) => menuRef.set(el),
        },
        [
          createVNode(
            'ul',
            {
              class: menuClass,
              role: 'menubar',
              id: p.id || menuListId,
              'aria-label': p.ariaLabel || '主菜单',
            },
            menuItems,
          ),
          createVNode(
            'div',
            {
              class: 'lyt-menu__sro',
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
            },
            announcement(),
          ),
        ],
      );
    };
  },
});

export type { MenuProps } from './types';
