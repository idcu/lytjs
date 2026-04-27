/**
 * Cascader 级联选择器
 * Props: options, value, placeholder, disabled, clearable, multiple, expandTrigger(click/hover), changeOnSelect
 * Events: change, expandChange
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Cascader = defineComponent({
  name: 'LytCascader',

  props: {
    options: {
      type: Array as () => Array<{
        value: string | number;
        label: string;
        disabled?: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children?: Array<any>;
      }>,
      default: () => [],
    },
    value: {
      type: Array as () => Array<string | number>,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: '请选择',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    expandTrigger: {
      type: String,
      default: 'click',
      validator: (v: string) => ['click', 'hover'].includes(v),
    },
    changeOnSelect: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isOpen: false,
      selectedValues: [...props.value],
      activeMenus: [props.options],
      hoveredIndex: -1,
    });

    const displayLabel = () => {
      if (state.selectedValues.length === 0) return '';
      const labels: string[] = [];
      let currentOptions = props.options;
      for (const val of state.selectedValues) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const option = currentOptions.find((o: any) => o.value === val);
        if (option) {
          labels.push(option.label);
          currentOptions = option.children || [];
        }
      }
      return labels.join(' / ');
    };

    const hasValue = () => state.selectedValues.length > 0;

    const toggleDropdown = () => {
      if (props.disabled) return;
      state.isOpen = !state.isOpen;
    };

    const closeDropdown = () => {
      state.isOpen = false;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelect = (option: any, level: number) => {
      if (option.disabled) return;

      const newValues = state.selectedValues.slice(0, level);
      newValues.push(option.value);
      state.selectedValues = newValues;

      if (option.children && option.children.length > 0) {
        state.activeMenus = state.activeMenus.slice(0, level + 1);
        state.activeMenus.push(option.children);
        emit('expandChange', newValues, option);
      }

      if (props.changeOnSelect || !option.children || option.children.length === 0) {
        emit('change', newValues);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isActiveOption = (option: any, level: number) => {
      return state.selectedValues[level] === option.value;
    };

    const handleClear = (e: Event) => {
      e.stopPropagation();
      state.selectedValues = [];
      state.activeMenus = [props.options];
      emit('change', []);
    };

    const handleClickOutside = () => {
      if (state.isOpen) {
        closeDropdown();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNodeHover = (option: any, level: number) => {
      if (props.expandTrigger !== 'hover') return;
      if (option.disabled) return;
      if (option.children && option.children.length > 0) {
        state.activeMenus = state.activeMenus.slice(0, level + 1);
        state.activeMenus.push(option.children);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.value, (val: any) => {
      state.selectedValues = [...val];
    });

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      state, displayLabel, hasValue, toggleDropdown, closeDropdown,
      handleSelect, isActiveOption, handleClear, handleNodeHover,
    };
  },

  template: `
    <div class="lyt-cascader {disabled ? 'lyt-cascader--disabled' : ''} {state.isOpen ? 'lyt-cascader--open' : ''}">
      <div class="lyt-cascader__trigger" @click="toggleDropdown">
        <span class="lyt-cascader__value {hasValue() ? '' : 'lyt-cascader__value--placeholder'}">
          {{ hasValue() ? displayLabel() : placeholder }}
        </span>
        <span class="lyt-cascader__clear" v-if="clearable && hasValue()" @click="handleClear">&times;</span>
        <span class="lyt-cascader__arrow {state.isOpen ? 'lyt-cascader__arrow--open' : ''}">
          <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M488.832 344.32l-339.84 356.672a32 32 0 0 0 0 44.16l.384.384a29.44 29.44 0 0 0 42.688 0l320-335.872 319.872 335.872a29.44 29.44 0 0 0 42.688 0l.384-.384a32 32 0 0 0 0-44.16L535.168 344.32a29.44 29.44 0 0 0-46.336 0z"/></svg>
        </span>
      </div>
      <div class="lyt-cascader__dropdown" v-if="state.isOpen">
        <div
          v-for="(menu, menuIndex) in state.activeMenus"
          class="lyt-cascader__menu"
        >
          <div
            v-for="option in menu"
            class="lyt-cascader__node {isActiveOption(option, menuIndex) ? 'lyt-cascader__node--active' : ''} {option.disabled ? 'lyt-cascader__node--disabled' : ''}"
            @click="handleSelect(option, menuIndex)"
            @mouseenter="handleNodeHover(option, menuIndex)"
          >
            <span class="lyt-cascader__node-label">{{ option.label }}</span>
            <span class="lyt-cascader__node-expand" v-if="option.children && option.children.length > 0">
              <svg viewBox="0 0 1024 1024" width="12" height="12"><path d="M715.264 349.376l-202.752 202.752a32 32 0 0 1-45.248 0L264.512 349.376a32 32 0 0 1 45.248-45.248l180.032 180.032 180.16-180.032a32 32 0 1 1 45.312 45.248z"/></svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-cascader {
      display: inline-block;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-cascader__trigger {
      display: flex;
      align-items: center;
      height: 36px;
      padding: 0 30px 0 12px;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      background-color: var(--lyt-color-bg);
      cursor: pointer;
      transition: border-color 0.3s;
      position: relative;
    }
    .lyt-cascader--open .lyt-cascader__trigger { border-color: var(--lyt-color-primary); }
    .lyt-cascader--disabled .lyt-cascader__trigger { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); cursor: not-allowed; color: var(--lyt-color-muted); opacity: 0.6; }
    .lyt-cascader__value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--lyt-color-muted); }
    .lyt-cascader__value--placeholder { color: var(--lyt-color-muted); opacity: 0.5; }
    .lyt-cascader__clear {
      position: absolute;
      right: 28px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: var(--lyt-color-muted);
      font-size: var(--lyt-font-size-lg);
      z-index: 1;
    }
    .lyt-cascader__clear:hover { color: var(--lyt-color-info); }
    .lyt-cascader__arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      transition: transform 0.3s;
      color: var(--lyt-color-muted);
      display: flex;
      align-items: center;
    }
    .lyt-cascader__arrow--open { transform: translateY(-50%) rotate(180deg); }
    .lyt-cascader__dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      display: flex;
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: var(--lyt-shadow-md);
      z-index: 1000;
      animation: lyt-dropdown-fade-in 0.15s ease-in-out;
    }
    @keyframes lyt-dropdown-fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .lyt-cascader__menu {
      min-width: 160px;
      max-height: 274px;
      overflow-y: auto;
      border-right: 1px solid var(--lyt-color-border);
      padding: 4px 0;
    }
    .lyt-cascader__menu:last-child { border-right: none; }
    .lyt-cascader__node {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--lyt-color-muted);
      white-space: nowrap;
    }
    .lyt-cascader__node:hover { background-color: var(--lyt-color-primary); color: #fff; }
    .lyt-cascader__node--active { color: var(--lyt-color-primary); font-weight: 600; }
    .lyt-cascader__node--active:hover { background-color: var(--lyt-color-primary); color: #fff; }
    .lyt-cascader__node--disabled { opacity: 0.5; cursor: not-allowed; }
    .lyt-cascader__node--disabled:hover { background-color: transparent; color: var(--lyt-color-muted); }
    .lyt-cascader__node-expand {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
      color: var(--lyt-color-info);
    }
    .lyt-cascader__node:hover .lyt-cascader__node-expand { color: #fff; }
  `,
});
