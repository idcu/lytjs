/**
 * DropdownMenu 下拉菜单
 * Props: trigger(hover/click/contextMenu), placement(bottom/top/left/right), visible, disabled
 * Events: click, visibleChange
 * 支持菜单项分组和分割线
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

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
        children?: Array<any>;
      }>,
      default: () => [],
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      isVisible: false,
    });

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

    const isDivider = (item: any) => item.type === 'divider' || item.divided;
    const isGroup = (item: any) => item.type === 'group';

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
    };
  },

  template: `
    <div class="lyt-dropdown {state.isVisible ? 'lyt-dropdown--visible' : ''} {disabled ? 'lyt-dropdown--disabled' : ''}">
      <div
        class="lyt-dropdown__trigger"
        @click="handleTriggerClick"
        @mouseenter="handleTriggerHover"
        @mouseleave="handleTriggerLeave"
        @contextmenu="handleContextMenu"
      >
        <slot></slot>
      </div>
      <div class="lyt-dropdown__menu lyt-dropdown__menu--{placement}" v-if="state.isVisible">
        <template v-for="item in items">
          <div class="lyt-dropdown__divider" v-if="isDivider(item)"></div>
          <div class="lyt-dropdown__group" v-else-if="isGroup(item)">
            <div class="lyt-dropdown__group-title">{{ item.label }}</div>
            <div
              v-for="child in item.children"
              class="lyt-dropdown__item {child.disabled ? 'lyt-dropdown__item--disabled' : ''}"
              @click="handleClick(child)"
            >
              <span class="lyt-dropdown__item-icon" v-if="child.icon">{{ child.icon }}</span>
              <span class="lyt-dropdown__item-label">{{ child.label }}</span>
            </div>
          </div>
          <div
            v-else
            class="lyt-dropdown__item {item.disabled ? 'lyt-dropdown__item--disabled' : ''}"
            @click="handleClick(item)"
          >
            <span class="lyt-dropdown__item-icon" v-if="item.icon">{{ item.icon }}</span>
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
