/**
 * @lytjs/ui - Menu 组件
 *
 * 导航菜单组件，支持垂直和水平模式，子菜单可折叠
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { getButtonA11yProps, mergeA11yProps, getGroupA11yProps } from '@lytjs/common-a11y';
import type { MenuItem, MenuSetupProps, MenuSlots } from './types';

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
    const p = props as MenuSetupProps;
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
        const itemProps = (item as unknown as { props: MenuItem }).props;
        if (!itemProps) return item;

        const isActive = itemProps.index === activeIndex();
        const isOpened = openedIndexes().has(itemProps.index);

        const itemChildren: VNode[] = [];

        if (itemProps.icon) {
          itemChildren.push(createVNode('span', { class: 'lyt-menu__icon' }, [itemProps.icon as unknown as VNode]));
        }
        itemChildren.push(createVNode('span', { class: 'lyt-menu__title' }, [createVNode('span', {}, String(itemProps.label))]));

        if (itemProps.children && itemProps.children.length > 0) {
          itemChildren.push(createVNode('span', {
            class: ['lyt-menu__arrow', isOpened ? 'lyt-menu__arrow--opened' : ''].filter(Boolean).join(' '),
          }, [createVNode('span', {}, isOpened ? '▲' : '▼')]));

          const submenuChildren: VNode[] = itemProps.children.map((child: MenuItem) => {
            const childBtnProps = getButtonA11yProps({ 
              ariaLabel: child.label, 
              disabled: child.disabled 
            });
            
            return createVNode('li', mergeA11yProps(childBtnProps, {
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
            }), [
              child.icon ? createVNode('span', { class: 'lyt-menu__icon' }, [child.icon as unknown as VNode]) : createVNode('span', {}, ''),
              createVNode('span', { class: 'lyt-menu__title' }, [createVNode('span', {}, String(child.label))]),
            ]);
          });

          itemChildren.push(createVNode('ul', { class: 'lyt-menu__submenu' }, submenuChildren));
        }

        const itemBtnProps = getButtonA11yProps({ 
          ariaLabel: itemProps.label, 
          disabled: itemProps.disabled 
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
            if (itemProps.children && itemProps.children.length > 0) {
              toggleSubmenu(itemProps.index);
            } else {
              handleSelect(itemProps.index);
            }
          },
        }), itemChildren);
      });

      const a11yProps = getGroupA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel,
        ariaDescribedBy: p.ariaDescribedBy,
        role: 'menubar'
      });

      return createVNode('ul', mergeA11yProps(a11yProps, { class: menuClass }), menuItems);
    };
  },
});

export type { MenuProps, MenuSlots, MenuItem, MenuSetupProps } from './types';
