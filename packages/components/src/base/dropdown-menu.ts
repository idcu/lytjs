/**
 * DropdownMenu 下拉菜单
 * Props: trigger(hover/click/contextMenu), placement(bottom/top/left/right), visible, disabled
 * Events: click, visibleChange
 * 支持菜单项分组和分割线
 *
 * A11y: aria-expanded、aria-haspopup、键盘导航、Escape 关闭
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';
import { generateId } from '../a11y/aria-utils';
import { handleArrowKeys } from '../a11y/keyboard-nav';

export const DropdownMenu = defineComponent({
  name: 'LytDropdownMenu',

  props: {
    trigger: {
      type: String,
      default: 'hover',
      validator: (v: string) => ['hover', 'click', 'contextMenu'].includes(v),
    },
    placement: {
      type: String,
      default: 'bottom',
      validator: (v: string) => ['bottom', 'top', 'left', 'right'].includes(v),
    },
    visible: {
      type: Boolean,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    items: {
      type: Array as () => Array<{
        key?: string | number;
        label: string;
        icon?: string;
        disabled?: boolean;
        divided?: boolean;
        type?: 'item' | 'group' | 'divider';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children?: Array<any>;
      }>,
      default: () => [],
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isVisible: false,
      focusedIndex: -1,
    });

    // 生成唯一 ID
    const menuId = generateId('lyt-dropdown-menu');
    const triggerId = generateId('lyt-dropdown-trigger');

    const show = () => {
      if (props.disabled) return;
      state.isVisible = true;
      emit('visibleChange', true);
    };

    const hide = () => {
      state.isVisible = false;
      emit('visibleChange', false);
    };

    const toggle = () => {
      if (state.isVisible) hide();
      else show();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = (item: any) => {
      if (item.disabled || item.type === 'divider' || item.type === 'group') return;
      emit('click', item);
      hide();
    };

    const handleTriggerClick = (e: Event) => {
      e.stopPropagation();
      if (props.trigger === 'click') {
        toggle();
      }
    };

    const handleTriggerHover = () => {
      if (props.trigger === 'hover') {
        show();
      }
    };

    const handleTriggerLeave = () => {
      if (props.trigger === 'hover') {
        hide();
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      if (props.trigger === 'contextMenu') {
        show();
      }
    };

    const handleClickOutside = () => {
      if (state.isVisible) {
        hide();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDivider = (item: any) => item.type === 'divider' || item.divided;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isGroup = (item: any) => item.type === 'group';

    /** 获取可聚焦的菜单项 */
    const getFocusableItems = () => {
      const result: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props.items.forEach((item: any) => {
        if (isDivider(item)) return;
        if (isGroup(item) && item.children) {
          item.children.forEach((child: any) => {
            if (!child.disabled) result.push(child);
          });
        } else if (!item.disabled) {
          result.push(item);
        }
      });
      return result;
    };

    /** 键盘导航 */
    const handleTriggerKeydown = (e: KeyboardEvent) => {
      if (props.disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          if (props.trigger === 'click') {
            e.preventDefault();
            toggle();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!state.isVisible) {
            show();
          }
          state.focusedIndex = 0;
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!state.isVisible) {
            show();
          }
          const focusable = getFocusableItems();
          state.focusedIndex = focusable.length - 1;
          break;
        case 'Escape':
          if (state.isVisible) {
            e.preventDefault();
            hide();
          }
          break;
      }
    };

    const handleMenuKeydown = (e: KeyboardEvent) => {
      const focusable = getFocusableItems();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          state.focusedIndex = handleArrowKeys(state.focusedIndex, focusable.length, 'down', true);
          break;
        case 'ArrowUp':
          e.preventDefault();
          state.focusedIndex = handleArrowKeys(state.focusedIndex, focusable.length, 'up', true);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (state.focusedIndex >= 0 && state.focusedIndex < focusable.length) {
            handleClick(focusable[state.focusedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          hide();
          break;
        case 'Home':
          e.preventDefault();
          state.focusedIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          state.focusedIndex = focusable.length - 1;
          break;
        case 'Tab':
          hide();
          break;
      }
    };

    const isItemFocused = (index: number) => state.focusedIndex === index;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.visible, (val: any) => {
      if (val !== undefined) {
        state.isVisible = val;
      }
    });

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      state, show, hide, toggle, handleClick,
      handleTriggerClick, handleTriggerHover, handleTriggerLeave,
      handleContextMenu, isDivider, isGroup, slots,
      handleTriggerKeydown, handleMenuKeydown, isItemFocused,
      menuId, triggerId,
    };
  },

  template: `
    <div class="lyt-dropdown {state.isVisible ? 'lyt-dropdown--visible' : ''} {disabled ? 'lyt-dropdown--disabled' : ''}">
      <div
        class="lyt-dropdown__trigger"
        :id="triggerId"
        :aria-expanded="state.isVisible ? 'true' : 'false'"
        :aria-haspopup="'menu'"
        :aria-controls="state.isVisible ? menuId : undefined"
        @click="handleTriggerClick"
        @mouseenter="handleTriggerHover"
        @mouseleave="handleTriggerLeave"
        @contextmenu="handleContextMenu"
        @keydown="handleTriggerKeydown"
      >
        <slot></slot>
      </div>
      <div
        class="lyt-dropdown__menu lyt-dropdown__menu--{placement}"
        v-if="state.isVisible"
        :id="menuId"
        role="menu"
        :aria-labelledby="triggerId"
        @keydown="handleMenuKeydown"
      >
        <template v-for="(item, index) in items">
          <div class="lyt-dropdown__divider" v-if="isDivider(item)" role="separator"></div>
          <div class="lyt-dropdown__group" v-else-if="isGroup(item)">
            <div class="lyt-dropdown__group-title" role="presentation">{{ item.label }}</div>
            <div
              v-for="child in item.children"
              class="lyt-dropdown__item {child.disabled ? 'lyt-dropdown__item--disabled' : ''}"
              role="menuitem"
              :aria-disabled="child.disabled ? 'true' : undefined"
              tabindex="-1"
              @click="handleClick(child)"
            >
              <span class="lyt-dropdown__item-icon" v-if="child.icon" aria-hidden="true">{{ child.icon }}</span>
              <span class="lyt-dropdown__item-label">{{ child.label }}</span>
            </div>
          </div>
          <div
            v-else
            class="lyt-dropdown__item {item.disabled ? 'lyt-dropdown__item--disabled' : ''}"
            role="menuitem"
            :aria-disabled="item.disabled ? 'true' : undefined"
            tabindex="-1"
            @click="handleClick(item)"
          >
            <span class="lyt-dropdown__item-icon" v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span class="lyt-dropdown__item-label">{{ item.label }}</span>
          </div>
        </template>
      </div>
    </div>
  `,

  styles: `
    .lyt-dropdown {
      display: inline-block;
      position: relative;
      box-sizing: border-box;
    }
    .lyt-dropdown--disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .lyt-dropdown__trigger {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }
    .lyt-dropdown__menu {
      position: absolute;
      z-index: 1000;
      min-width: 120px;
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: var(--lyt-shadow-md);
      padding: 4px 0;
      animation: lyt-dropdown-fade-in 0.15s ease-in-out;
    }
    .lyt-dropdown__menu--bottom {
      top: calc(100% + 6px);
      left: 0;
    }
    .lyt-dropdown__menu--top {
      bottom: calc(100% + 6px);
      left: 0;
    }
    .lyt-dropdown__menu--left {
      right: calc(100% + 6px);
      top: 0;
    }
    .lyt-dropdown__menu--right {
      left: calc(100% + 6px);
      top: 0;
    }
    @keyframes lyt-dropdown-fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .lyt-dropdown__item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .lyt-dropdown__item:hover {
      background-color: var(--lyt-color-primary);
      color: #fff;
    }
    .lyt-dropdown__item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-dropdown__item--disabled:hover {
      background-color: transparent;
      color: var(--lyt-color-muted);
    }
    .lyt-dropdown__item-icon {
      font-size: var(--lyt-font-size-base);
      display: inline-flex;
      align-items: center;
    }
    .lyt-dropdown__divider {
      height: 1px;
      margin: 4px 0;
      background-color: var(--lyt-color-border);
    }
    .lyt-dropdown__group {
      padding: 0;
    }
    .lyt-dropdown__group-title {
      padding: 8px 16px 4px;
      font-size: var(--lyt-font-size-sm);
      color: var(--lyt-color-info);
      font-weight: 600;
    }
  `,
});
