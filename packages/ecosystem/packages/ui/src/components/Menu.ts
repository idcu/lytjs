/**
 * @lytjs/ui - Menu 组件
 *
 * 导航菜单组件，支持垂直和水平模式，子菜单可折叠
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

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

    return () => {
      const menuClass = [
        'lyt-menu',
        `lyt-menu--${p.mode}`,
        p.class,
      ].filter(Boolean).join(' ');

      const items = slots.default?.() || [];

      const menuItems: VNode[] = items.map((item: VNode) => {
        const itemProps = (item as unknown as { props: { index?: string; label?: string; icon?: unknown; children?: unknown[]; disabled?: boolean } }).props;
        if (!itemProps) return item;

        const isActive = itemProps.index === activeIndex();
        const isOpened = openedIndexes().has(itemProps.index as string);

        const itemChildren: VNode[] = [];

        if (itemProps.icon) {
          itemChildren.push(createVNode('span', { class: 'lyt-menu__icon' }, [itemProps.icon as unknown as VNode]));
        }
        itemChildren.push(createVNode('span', { class: 'lyt-menu__title' }, [createVNode('span', {}, String(itemProps.label || ''))]));

        if (itemProps.children && (itemProps.children as unknown[]).length > 0) {
          itemChildren.push(createVNode('span', {
            class: ['lyt-menu__arrow', isOpened ? 'lyt-menu__arrow--opened' : ''].filter(Boolean).join(' '),
          }, [createVNode('span', {}, isOpened ? '▲' : '▼')]));

          const submenuChildren: VNode[] = (itemProps.children as unknown[]).map((child: unknown) => {
            const childItem = child as { index?: string; label?: string; icon?: unknown; disabled?: boolean };
            const childBtnProps = getButtonA11yProps({
              ariaLabel: childItem.label,
              disabled: childItem.disabled,
            });

            return createVNode('li', mergeA11yProps(childBtnProps, {
              key: childItem.index,
              class: [
                'lyt-menu__item',
                childItem.index === activeIndex() ? 'lyt-menu__item--active' : '',
                childItem.disabled ? 'lyt-menu__item--disabled' : '',
              ].filter(Boolean).join(' '),
              onClick: () => {
                if (childItem.disabled) return;
                handleSelect(childItem.index as string);
              },
            }), [
              childItem.icon ? createVNode('span', { class: 'lyt-menu__icon' }, [childItem.icon as unknown as VNode]) : createVNode('span', {}, ''),
              createVNode('span', { class: 'lyt-menu__title' }, [createVNode('span', {}, String(childItem.label || ''))]),
            ]);
          });

          itemChildren.push(createVNode('ul', { class: 'lyt-menu__submenu' }, submenuChildren));
        }

        const itemBtnProps = getButtonA11yProps({
          ariaLabel: itemProps.label,
          disabled: itemProps.disabled,
        });

        return createVNode('li', mergeA11yProps(itemBtnProps, {
          key: itemProps.index,
          class: [
            'lyt-menu__item',
            isActive ? 'lyt-menu__item--active' : '',
            itemProps.disabled ? 'lyt-menu__item--disabled' : '',
          ].filter(Boolean).join(' '),
          onClick: () => {
            if (itemProps.disabled) return;
            if (itemProps.children && (itemProps.children as unknown[]).length > 0) {
              toggleSubmenu(itemProps.index as string);
            } else {
              handleSelect(itemProps.index as string);
            }
          },
        }), itemChildren);
      });

      return createVNode('ul', { class: menuClass, role: 'menubar', id: p.id, 'aria-label': p.ariaLabel }, menuItems);
    };
  },
});

export type { MenuProps } from './types';
