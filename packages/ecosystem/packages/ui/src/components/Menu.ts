/**
 * @lytjs/ui - Menu 组件
 *
 * 导航菜单组件，支持折叠收起、多级路由联动等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * MenuItem 数据结构
 */
interface MenuItem {
  id: string | number;
  label: string;
  icon?: string;
  disabled?: boolean;
  children?: MenuItem[];
}

/**
 * Menu 组件
 */
export const Menu = defineComponent({
  name: 'LytMenu',

  props: {
    data: { type: Array, default: () => [] },
    defaultOpenKeys: { type: Array, default: () => [] },
    defaultSelectedKeys: { type: Array, default: () => [] },
    mode: { type: String, default: 'vertical' },
    theme: { type: String, default: 'light' },
    collapsible: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onClick: { type: Function, default: undefined },
    onOpenChange: { type: Function, default: undefined },
  },

  setup(props: any, { emit }: any) {
    // 展开的子菜单
    const openKeys = signal<Set<string | number>>(new Set(props.defaultOpenKeys));

    // 选中的菜单项
    const selectedKeys = signal<Set<string | number>>(new Set(props.defaultSelectedKeys));

    // 内部折叠状态
    const isCollapsed = signal(props.collapsed);

    // 初始化展开状态
    const initOpenKeys = () => {
      if (props.defaultOpenKeys.length > 0) {
        props.defaultOpenKeys.forEach((key: string | number) => {
          openKeys().add(key);
        });
      }
    };

    // 切换折叠
    const toggleCollapse = () => {
      isCollapsed.set(!isCollapsed());
      emit('collapsedChange', !isCollapsed());
    };

    // 切换子菜单展开/收起
    const toggleOpen = (item: MenuItem) => {
      if (item.disabled) return;

      const keys = openKeys();
      if (keys.has(item.id)) {
        keys.delete(item.id);
      } else {
        keys.add(item.id);
      }
      openKeys.set(new Set(keys));
      props.onOpenChange?.(Array.from(keys));
    };

    // 点击菜单项
    const handleItemClick = (item: MenuItem, e: Event) => {
      e.stopPropagation();
      if (item.disabled) return;

      selectedKeys.set(new Set([item.id]));
      props.onClick?.(item);
      emit('select', item);
    };

    // 渲染菜单项
    const renderItem = (item: MenuItem, level: number = 0): any => {
      const hasChildren = item.children && item.children.length > 0;
      const isOpen = openKeys().has(item.id);
      const isSelected = selectedKeys().has(item.id);

      const children: any[] = [];

      // 内容
      const contentChildren: any[] = [];

      // 图标
      if (item.icon) {
        contentChildren.push(
          createVNode('span', { class: 'lyt-menu__icon' }, item.icon)
        );
      }

      // 标签
      contentChildren.push(
        createVNode('span', { class: 'lyt-menu__label' }, item.label)
      );

      // 展开/折叠图标（如果有子菜单）
      if (hasChildren) {
        contentChildren.push(
          createVNode('span', {
            class: `lyt-menu__arrow ${isOpen ? 'lyt-menu__arrow--open' : ''}`,
          }, '▶')
        );
      }

      // 菜单项内容
      children.push(
        createVNode('div', {
          class: `lyt-menu__item-content
            ${isSelected ? 'lyt-menu__item-content--selected' : ''}
            ${item.disabled ? 'lyt-menu__item-content--disabled' : ''}
          `,
          style: `padding-left: ${isCollapsed() ? 16 : level * 20 + 16}px;`,
          onClick: (e: Event) => {
            if (hasChildren) {
              toggleOpen(item);
            } else {
              handleItemClick(item, e);
            }
          },
        }, contentChildren)
      );

      // 子菜单
      if (hasChildren) {
        const subItems = item.children!.map(child => renderItem(child, level + 1));
        children.push(
          createVNode('div', {
            class: `lyt-menu__submenu ${isOpen ? 'lyt-menu__submenu--open' : ''}`,
          }, subItems)
        );
      }

      return createVNode('div', {
        class: 'lyt-menu__item',
        'data-id': item.id,
      }, children);
    };

    // 生成类名
    const getMenuClass = () => {
      const classes = ['lyt-menu'];
      if (props.mode) classes.push(`lyt-menu--${props.mode}`);
      if (props.theme) classes.push(`lyt-menu--${props.theme}`);
      if (isCollapsed()) classes.push('lyt-menu--collapsed');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      initOpenKeys();

      const items = props.data.map((item: MenuItem) => renderItem(item));

      const menuChildren: any[] = [];

      // 折叠按钮（如果可折叠）
      if (props.collapsible) {
        menuChildren.push(
          createVNode('div', {
            class: 'lyt-menu__collapse-btn',
            onClick: toggleCollapse,
          }, isCollapsed() ? '»' : '«')
        );
      }

      menuChildren.push(...items);

      return createVNode('div', { class: getMenuClass() }, menuChildren);
    };
  },
});

export default Menu;
export type { MenuItem };
