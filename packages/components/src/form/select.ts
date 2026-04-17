/**
 * Select 选择器
 * Props: options(数组), placeholder, disabled, multiple, clearable
 * Events: change, select, clear
 * State: isOpen, selectedValue, searchText
 */

import { defineComponent } from '@lytjs/component'

export const Select = defineComponent({
  name: 'LytSelect',

  props: {
    options: {
      type: Array as () => Array<{ label: string; value: string | number; disabled?: boolean }>,
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
    multiple: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [String, Number, Array] as any,
      default: undefined,
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isOpen: false,
      selectedValue: props.multiple ? [] : props.modelValue,
      searchText: '',
    })

    const displayLabel = () => {
      if (props.multiple) {
        const selected = (state.selectedValue as Array<string | number>)
        return selected
          .map((val) => {
            const opt = props.options.find((o) => o.value === val)
            return opt ? opt.label : val
          })
          .join(', ')
      }
      const opt = props.options.find((o) => o.value === state.selectedValue)
      return opt ? opt.label : ''
    }

    const hasValue = () => {
      if (props.multiple) {
        return (state.selectedValue as Array<string | number>).length > 0
      }
      return state.selectedValue !== undefined && state.selectedValue !== ''
    }

    const toggleDropdown = () => {
      if (props.disabled) return
      state.isOpen = !state.isOpen
    }

    const closeDropdown = () => {
      state.isOpen = false
      state.searchText = ''
    }

    const handleSelect = (option: { label: string; value: string | number; disabled?: boolean }) => {
      if (option.disabled) return

      if (props.multiple) {
        const selected = state.selectedValue as Array<string | number>
        const index = selected.indexOf(option.value)
        if (index > -1) {
          selected.splice(index, 1)
        } else {
          selected.push(option.value)
        }
        state.selectedValue = [...selected]
      } else {
        state.selectedValue = option.value
        closeDropdown()
      }

      emit('select', option.value)
      emit('change', state.selectedValue)
      emit('update:modelValue', state.selectedValue)
    }

    const isSelected = (value: string | number) => {
      if (props.multiple) {
        return (state.selectedValue as Array<string | number>).includes(value)
      }
      return state.selectedValue === value
    }

    const handleClear = (e: Event) => {
      e.stopPropagation()
      if (props.multiple) {
        state.selectedValue = []
      } else {
        state.selectedValue = undefined
      }
      emit('clear')
      emit('change', state.selectedValue)
      emit('update:modelValue', state.selectedValue)
    }

    const handleClickOutside = () => {
      if (state.isOpen) {
        closeDropdown()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    const handleTriggerClick = (e: Event) => {
      e.stopPropagation()
      toggleDropdown()
    }

    const filteredOptions = () => {
      if (!state.searchText) return props.options
      return props.options.filter((o) =>
        o.label.toLowerCase().includes(state.searchText.toLowerCase())
      )
    }

    return {
      state, displayLabel, hasValue, toggleDropdown, closeDropdown,
      handleSelect, isSelected, handleClear, handleTriggerClick,
      filteredOptions,
    }
  },

  template: `
    <div class="lyt-select {disabled ? 'lyt-select--disabled' : ''} {state.isOpen ? 'lyt-select--open' : ''}">
      <div class="lyt-select__trigger" @click="handleTriggerClick">
        <span class="lyt-select__value {hasValue() ? '' : 'lyt-select__value--placeholder'}">
          {{ hasValue() ? displayLabel() : placeholder }}
        </span>
        <span class="lyt-select__clear" v-if="clearable && hasValue()" @click="handleClear">&times;</span>
        <span class="lyt-select__arrow {state.isOpen ? 'lyt-select__arrow--open' : ''}">
          <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M488.832 344.32l-339.84 356.672a32 32 0 0 0 0 44.16l.384.384a29.44 29.44 0 0 0 42.688 0l320-335.872 319.872 335.872a29.44 29.44 0 0 0 42.688 0l.384-.384a32 32 0 0 0 0-44.16L535.168 344.32a29.44 29.44 0 0 0-46.336 0z"/></svg>
        </span>
      </div>
      <div class="lyt-select__dropdown" v-if="state.isOpen">
        <input
          class="lyt-select__search"
          :value="state.searchText"
          @input="state.searchText = $event.target.value"
          placeholder="搜索..."
        />
        <ul class="lyt-select__list">
          <li
            v-for="option in filteredOptions()"
            class="lyt-select__option {isSelected(option.value) ? 'lyt-select__option--selected' : ''} {option.disabled ? 'lyt-select__option--disabled' : ''}"
            @click="handleSelect(option)"
          >
            <span v-if="multiple && isSelected(option.value)" class="lyt-select__option-check">&#10003;</span>
            {{ option.label }}
          </li>
          <li class="lyt-select__option lyt-select__option--empty" v-if="filteredOptions().length === 0">
            无匹配数据
          </li>
        </ul>
      </div>
    </div>
  `,

  styles: `
    .lyt-select {
      display: inline-block;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-select__trigger {
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
    .lyt-select--open .lyt-select__trigger { border-color: var(--lyt-color-primary); }
    .lyt-select--disabled .lyt-select__trigger { background-color: var(--lyt-color-bg); border-color: var(--lyt-color-border); cursor: not-allowed; color: var(--lyt-color-muted); opacity: 0.6; }
    .lyt-select__value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--lyt-color-muted); }
    .lyt-select__value--placeholder { color: var(--lyt-color-muted); opacity: 0.5; }
    .lyt-select__clear {
      position: absolute;
      right: 28px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: var(--lyt-color-muted);
      font-size: var(--lyt-font-size-lg);
      z-index: 1;
    }
    .lyt-select__clear:hover { color: var(--lyt-color-info); }
    .lyt-select__arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      transition: transform 0.3s;
      color: var(--lyt-color-muted);
      display: flex;
      align-items: center;
    }
    .lyt-select__arrow--open { transform: translateY(-50%) rotate(180deg); }
    .lyt-select__dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      background-color: var(--lyt-color-bg);
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      box-shadow: var(--lyt-shadow-md);
      z-index: 1000;
      max-height: 274px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .lyt-select__search {
      padding: 8px 12px;
      border: none;
      border-bottom: 1px solid var(--lyt-color-border);
      outline: none;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-select__list {
      list-style: none;
      margin: 0;
      padding: 6px 0;
      overflow-y: auto;
      flex: 1;
    }
    .lyt-select__option {
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.3s;
      color: var(--lyt-color-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .lyt-select__option:hover { background-color: var(--lyt-color-bg); opacity: 0.85; }
    .lyt-select__option--selected { color: var(--lyt-color-primary); font-weight: 600; }
    .lyt-select__option--disabled { color: var(--lyt-color-muted); cursor: not-allowed; opacity: 0.5; }
    .lyt-select__option--disabled:hover { background-color: transparent; }
    .lyt-select__option--empty { color: var(--lyt-color-info); text-align: center; cursor: default; }
    .lyt-select__option-check { font-size: var(--lyt-font-size-sm); }
  `,
})
