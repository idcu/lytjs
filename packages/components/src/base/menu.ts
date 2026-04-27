/**
 * Menu 导航菜单
 * Props: mode(horizontal/vertical), collapsed, theme(light/dark), defaultActiveKey, accordion
 * Events: select, openChange
 * 支持子菜单嵌套，水平/垂直两种模式
 */

import { defineComponent } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Menu = defineComponent({
  name: 'LytMenu',

  props: {
    mode: {
      type: String,
      default: 'vertical',
      validator: (v: string) => ['horizontal', 'vertical'].includes(v),
    },
    collapsed: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      default: 'light',
      validator: (v: string) => ['light', 'dark'].includes(v),
    },
    defaultActiveKey: {
      type: [String, Number],
      default: '',
    },
    accordion: {
      type: Boolean,
      default: false,
    },
    items: {
      type: Array as () => Array<{
        key: string | number;
        label: string;
        icon?: string;
        disabled?: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children?: Array<any>;
      }>,
      default: () => [],
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      activeKey: props.defaultActiveKey,
      openKeys: [] as Array<string | number>,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelect = (item: any) => {
      if (item.disabled) return;
      state.activeKey = item.key;
      emit('select', item.key, item);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSubmenuClick = (item: any) => {
      if (item.disabled) return;
      const index = state.openKeys.indexOf(item.key);
      if (index > -1) {
        state.openKeys.splice(index, 1);
      } else {
        if (props.accordion) {
          state.openKeys = [item.key];
        } else {
          state.openKeys.push(item.key);
        }
      }
      emit('openChange', [...state.openKeys]);
    };

    const isOpen = (key: string | number) => {
      return state.openKeys.includes(key);
    };

    const isActive = (key: string | number) => {
      return state.activeKey === key;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasChildren = (item: any) => {
      return item.children && item.children.length > 0;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.defaultActiveKey, (val: any) => {
      state.activeKey = val;
    });

    return { state, handleSelect, handleSubmenuClick, isOpen, isActive, hasChildren, slots };
  },

  template: `
    <div class="lyt-menu lyt-menu--{mode} lyt-menu--{theme} {collapsed ? 'lyt-menu--collapsed' : ''}">
      <slot>
        <template v-for="item in items">
          <div
            v-if="!hasChildren(item)"
            class="lyt-menu__item {isActive(item.key) ? 'lyt-menu__item--active' : ''} {item.disabled ? 'lyt-menu__item--disabled' : ''}"
            @click="handleSelect(item)"
          >
            <span class="lyt-menu__item-icon" v-if="item.icon">{{ item.icon }}</span>
            <span class="lyt-menu__item-label">{{ item.label }}</span>
          </div>
          <div
            v-else
            class="lyt-menu__submenu {isOpen(item.key) ? 'lyt-menu__submenu--open' : ''} {item.disabled ? 'lyt-menu__submenu--disabled' : ''}"
          >
            <div class="lyt-menu__submenu-title" @click="handleSubmenuClick(item)">
              <span class="lyt-menu__item-icon" v-if="item.icon">{{ item.icon }}</span>
              <span class="lyt-menu__item-label">{{ item.label }}</span>
              <span class="lyt-menu__submenu-arrow {isOpen(item.key) ? 'lyt-menu__submenu-arrow--open' : ''}">
                <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M488.832 344.32l-339.84 356.672a32 32 0 0 0 0 44.16l.384.384a29.44 29.44 0 0 0 42.688 0l320-335.872 319.872 335.872a29.44 29.44 0 0 0 42.688 0l.384-.384a32 32 0 0 0 0-44.16L535.168 344.32a29.44 29.44 0 0 0-46.336 0z"/></svg>
              </span>
            </div>
            <div class="lyt-menu__submenu-content" v-if="isOpen(item.key)">
              <div
                v-for="child in item.children"
                class="lyt-menu__item {isActive(child.key) ? 'lyt-menu__item--active' : ''} {child.disabled ? 'lyt-menu__item--disabled' : ''}"
                @click="handleSelect(child)"
              >
                <span class="lyt-menu__item-label">{{ child.label }}</span>
              </div>
            </div>
          </div>
        </template>
      </slot>
    </div>
  `,

  styles: `
    .lyt-menu {
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
      list-style: none;
      margin: 0;
      padding: 4px 0;
      transition: all 0.3s;
    }
    .lyt-menu--horizontal {
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--lyt-color-border);
      background-color: var(--lyt-color-bg);
      line-height: 46px;
      padding: 0;
    }
    .lyt-menu--vertical {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .lyt-menu--light {
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-muted);
    }
    .lyt-menu--dark {
      background-color: var(--lyt-color-fg);
      color: var(--lyt-color-bg);
    }
    .lyt-menu--collapsed {
      width: 64px;
    }
    .lyt-menu--collapsed .lyt-menu__item-label,
    .lyt-menu--collapsed .lyt-menu__submenu-title .lyt-menu__item-label,
    .lyt-menu--collapsed .lyt-menu__submenu-arrow {
      display: none;
    }
    .lyt-menu--collapsed .lyt-menu__item,
    .lyt-menu--collapsed .lyt-menu__submenu-title {
      justify-content: center;
      padding: 0 16px;
    }
    .lyt-menu__item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
      height: 40px;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
      color: inherit;
    }
    .lyt-menu__item:hover {
      background-color: var(--lyt-color-primary);
      color: #fff;
    }
    .lyt-menu__item--active {
      background-color: var(--lyt-color-primary);
      color: #fff;
    }
    .lyt-menu__item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-menu__item--disabled:hover {
      background-color: transparent;
      color: inherit;
    }
    .lyt-menu--horizontal .lyt-menu__item {
      padding: 0 16px;
      height: 46px;
      border-bottom: 2px solid transparent;
    }
    .lyt-menu--horizontal .lyt-menu__item--active {
      border-bottom-color: var(--lyt-color-primary);
      background-color: transparent;
      color: var(--lyt-color-primary);
    }
    .lyt-menu--horizontal .lyt-menu__item:hover {
      background-color: transparent;
      color: var(--lyt-color-primary);
    }
    .lyt-menu__item-icon {
      font-size: var(--lyt-font-size-lg);
      display: inline-flex;
      align-items: center;
    }
    .lyt-menu__submenu {
      display: flex;
      flex-direction: column;
    }
    .lyt-menu__submenu-title {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
      height: 40px;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
      color: inherit;
    }
    .lyt-menu__submenu-title:hover {
      background-color: var(--lyt-color-primary);
      color: #fff;
    }
    .lyt-menu--horizontal .lyt-menu__submenu-title {
      height: 46px;
      padding: 0 16px;
    }
    .lyt-menu--horizontal .lyt-menu__submenu-title:hover {
      background-color: transparent;
      color: var(--lyt-color-primary);
    }
    .lyt-menu__submenu-arrow {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      transition: transform 0.3s;
    }
    .lyt-menu__submenu-arrow--open {
      transform: rotate(180deg);
    }
    .lyt-menu__submenu-content {
      overflow: hidden;
      transition: all 0.3s;
    }
    .lyt-menu--horizontal .lyt-menu__submenu {
      position: relative;
    }
    .lyt-menu--horizontal .lyt-menu__submenu-content {
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 160px;
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: var(--lyt-shadow-md);
      z-index: 1000;
      padding: 4px 0;
    }
    .lyt-menu--horizontal .lyt-menu__submenu-content .lyt-menu__item {
      color: var(--lyt-color-muted);
    }
    .lyt-menu--horizontal .lyt-menu__submenu-content .lyt-menu__item:hover {
      background-color: var(--lyt-color-primary);
      color: #fff;
    }
  `,
});
