/**
 * Dropdown 下拉选择
 * Props: options, placeholder, disabled, multiple, searchable, clearable, loading
 * Events: change, select, clear, search, update:modelValue
 * Features: 选项列表, 搜索过滤, 多选, 占位符, 禁用选项
 *
 * A11y: role="combobox"/"listbox"/"option"、aria-selected、aria-expanded、键盘导航
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component'
import { reactive } from '@lytjs/reactivity'
import { generateId } from './a11y/aria-utils'
import { handleArrowKeys } from './a11y/keyboard-nav'

export interface DropdownOption {
  label: string
  value: string | number
  disabled?: boolean
  group?: string
  icon?: string
  description?: string
}

export const Dropdown = defineComponent({
  name: 'LytDropdown',

  props: {
    options: {
      type: Array as () => DropdownOption[],
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
    searchable: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [String, Number, Array] as any,
      default: undefined,
    },
    maxTagCount: {
      type: Number,
      default: 0,
    },
    filterMethod: {
      type: Function as any,
      default: null,
    },
    /** 无障碍标签 */
    ariaLabel: {
      type: String,
      default: '',
    },
    /** 关联的 label 元素 ID */
    ariaLabelledby: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isOpen: false,
      selectedValue: props.multiple ? [] : props.modelValue,
      searchText: '',
      activeIndex: -1,
    })

    // 生成唯一 ID
    const listboxId = generateId('lyt-dropdown-listbox')
    const triggerId = generateId('lyt-dropdown-trigger')

    /** 显示文本 */
    const displayLabel = () => {
      if (props.multiple) {
        const selected = state.selectedValue as Array<string | number>
        const labels = selected.map((val: any) => {
          const opt = props.options.find((o: any) => o.value === val)
          return opt ? opt.label : String(val)
        })
        if (props.maxTagCount > 0 && labels.length > props.maxTagCount) {
          return labels.slice(0, props.maxTagCount).join(', ') + ` +${labels.length - props.maxTagCount}`
        }
        return labels.join(', ')
      }
      const opt = props.options.find((o: any) => o.value === state.selectedValue)
      return opt ? opt.label : ''
    }

    /** 是否有值 */
    const hasValue = () => {
      if (props.multiple) {
        return (state.selectedValue as Array<string | number>).length > 0
      }
      return state.selectedValue !== undefined && state.selectedValue !== ''
    }

    /** 切换下拉 */
    const toggleDropdown = () => {
      if (props.disabled || props.loading) return
      state.isOpen = !state.isOpen
      if (!state.isOpen) state.searchText = ''
      if (state.isOpen) state.activeIndex = -1
    }

    /** 关闭下拉 */
    const closeDropdown = () => {
      state.isOpen = false
      state.searchText = ''
      state.activeIndex = -1
    }

    /** 选择选项 */
    const handleSelect = (option: DropdownOption) => {
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

      emit('select', option.value, option)
      emit('change', state.selectedValue)
      emit('update:modelValue', state.selectedValue)
    }

    /** 判断是否选中 */
    const isSelected = (value: string | number) => {
      if (props.multiple) {
        return (state.selectedValue as Array<string | number>).includes(value)
      }
      return state.selectedValue === value
    }

    /** 清除 */
    const handleClear = (e: Event) => {
      e.stopPropagation()
      state.selectedValue = props.multiple ? [] : undefined
      emit('clear')
      emit('change', state.selectedValue)
      emit('update:modelValue', state.selectedValue)
    }

    /** 过滤选项 */
    const filteredOptions = () => {
      if (!state.searchText) return props.options
      if (props.filterMethod) {
        return props.options.filter((o: any) => props.filterMethod(state.searchText, o))
      }
      return props.options.filter((o: any) =>
        o.label.toLowerCase().includes(state.searchText.toLowerCase())
      )
    }

    /** 搜索处理 */
    const handleSearch = (e: Event) => {
      const target = e.target as HTMLInputElement
      state.searchText = target.value
      emit('search', state.searchText)
    }

    /** 点击外部关闭 */
    const handleClickOutside = () => {
      if (state.isOpen) closeDropdown()
    }

    /** 触发器点击 */
    const handleTriggerClick = (e: Event) => {
      e.stopPropagation()
      toggleDropdown()
    }

    /** 键盘导航处理 */
    const handleTriggerKeydown = (e: KeyboardEvent) => {
      if (props.disabled || props.loading) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          toggleDropdown()
          break
        case 'ArrowDown':
          e.preventDefault()
          if (!state.isOpen) {
            state.isOpen = true
          }
          state.activeIndex = 0
          break
        case 'ArrowUp':
          e.preventDefault()
          if (!state.isOpen) {
            state.isOpen = true
            const opts = filteredOptions()
            state.activeIndex = opts.length - 1
          }
          break
        case 'Escape':
          if (state.isOpen) {
            e.preventDefault()
            closeDropdown()
          }
          break
      }
    }

    const handleListKeydown = (e: KeyboardEvent) => {
      const opts = filteredOptions()
      const enabledOpts = opts.filter((o: any) => !o.disabled)

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          state.activeIndex = handleArrowKeys(state.activeIndex, enabledOpts.length, 'down', true)
          break
        case 'ArrowUp':
          e.preventDefault()
          state.activeIndex = handleArrowKeys(state.activeIndex, enabledOpts.length, 'up', true)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (state.activeIndex >= 0 && state.activeIndex < enabledOpts.length) {
            handleSelect(enabledOpts[state.activeIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          closeDropdown()
          break
        case 'Home':
          e.preventDefault()
          state.activeIndex = 0
          break
        case 'End':
          e.preventDefault()
          state.activeIndex = enabledOpts.length - 1
          break
      }
    }

    const isActiveOption = (index: number) => state.activeIndex === index

    /** 移除多选标签 */
    const handleRemoveTag = (value: string | number, e: Event) => {
      e.stopPropagation()
      const selected = state.selectedValue as Array<string | number>
      const index = selected.indexOf(value)
      if (index > -1) {
        selected.splice(index, 1)
        state.selectedValue = [...selected]
        emit('change', state.selectedValue)
        emit('update:modelValue', state.selectedValue)
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      state, displayLabel, hasValue, toggleDropdown, closeDropdown,
      handleSelect, isSelected, handleClear, filteredOptions,
      handleSearch, handleTriggerClick, handleRemoveTag,
      handleTriggerKeydown, handleListKeydown, isActiveOption,
      listboxId, triggerId,
    }
  },

  template: `
    <div class="lyt-dropdown {disabled ? 'lyt-dropdown--disabled' : ''} {state.isOpen ? 'lyt-dropdown--open' : ''}">
      <div
        class="lyt-dropdown__trigger"
        :id="triggerId"
        role="combobox"
        :aria-expanded="state.isOpen ? 'true' : 'false'"
        :aria-haspopup="multiple ? 'dialog' : 'listbox'"
        :aria-controls="state.isOpen ? listboxId : undefined"
        :aria-label="ariaLabel || undefined"
        :aria-labelledby="ariaLabelledby || undefined"
        :aria-disabled="disabled ? 'true' : undefined"
        tabindex="0"
        @click="handleTriggerClick"
        @keydown="handleTriggerKeydown"
      >
        <span class="lyt-dropdown__value {hasValue() ? '' : 'lyt-dropdown__value--placeholder'}">
          {{ hasValue() ? displayLabel() : placeholder }}
        </span>
        <span class="lyt-dropdown__clear" v-if="clearable && hasValue() && !disabled" @click="handleClear" role="button" tabindex="0" aria-label="清除选择">&times;</span>
        <span class="lyt-dropdown__arrow {state.isOpen ? 'lyt-dropdown__arrow--open' : ''}" aria-hidden="true">
          <svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M488.832 344.32l-339.84 356.672a32 32 0 0 0 0 44.16l.384.384a29.44 29.44 0 0 0 42.688 0l320-335.872 319.872 335.872a29.44 29.44 0 0 0 42.688 0l.384-.384a32 32 0 0 0 0-44.16L535.168 344.32a29.44 29.44 0 0 0-46.336 0z"/></svg>
        </span>
      </div>
      <div class="lyt-dropdown__dropdown" v-if="state.isOpen" :id="listboxId" role="listbox" :aria-multiselectable="multiple ? 'true' : undefined" :aria-labelledby="ariaLabelledby || triggerId" @keydown="handleListKeydown">
        <div class="lyt-dropdown__search-wrapper" v-if="searchable">
          <input
            class="lyt-dropdown__search"
            :value="state.searchText"
            @input="handleSearch"
            placeholder="搜索..."
            :aria-label="'搜索选项'"
          />
        </div>
        <ul class="lyt-dropdown__list" role="presentation">
          <li
            v-for="(option, index) in filteredOptions()"
            class="lyt-dropdown__option {isSelected(option.value) ? 'lyt-dropdown__option--selected' : ''} {option.disabled ? 'lyt-dropdown__option--disabled' : ''} {isActiveOption(index) ? 'lyt-dropdown__option--active' : ''}"
            role="option"
            :aria-selected="isSelected(option.value) ? 'true' : 'false'"
            :aria-disabled="option.disabled ? 'true' : undefined"
            @click="handleSelect(option)"
            @mouseenter="state.activeIndex = index"
          >
            <span v-if="multiple && isSelected(option.value)" class="lyt-dropdown__option-check" aria-hidden="true">&#10003;</span>
            <span class="lyt-dropdown__option-label">{{ option.label }}</span>
            <span class="lyt-dropdown__option-desc" v-if="option.description">{{ option.description }}</span>
          </li>
          <li class="lyt-dropdown__option lyt-dropdown__option--empty" v-if="filteredOptions().length === 0 && !loading" role="presentation">
            无匹配数据
          </li>
          <li class="lyt-dropdown__option lyt-dropdown__option--loading" v-if="loading" role="presentation">
            加载中...
          </li>
        </ul>
      </div>
    </div>
  `,

  styles: `
    .lyt-dropdown {
      display: inline-block;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      font-size: 14px;
    }
    .lyt-dropdown__trigger {
      display: flex;
      align-items: center;
      min-height: 36px;
      padding: 0 30px 0 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      transition: border-color 0.3s;
      position: relative;
    }
    .lyt-dropdown--open .lyt-dropdown__trigger { border-color: #409eff; box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2); }
    .lyt-dropdown--disabled .lyt-dropdown__trigger { background-color: #f5f7fa; border-color: #e4e7ed; cursor: not-allowed; color: #c0c4cc; }
    .lyt-dropdown__value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #606266; line-height: 36px; }
    .lyt-dropdown__value--placeholder { color: #c0c4cc; }
    .lyt-dropdown__clear {
      position: absolute;
      right: 28px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: #c0c4cc;
      font-size: 16px;
      z-index: 1;
    }
    .lyt-dropdown__clear:hover { color: #909399; }
    .lyt-dropdown__arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      transition: transform 0.3s;
      color: #c0c4cc;
      display: flex;
      align-items: center;
    }
    .lyt-dropdown__arrow--open { transform: translateY(-50%) rotate(180deg); }
    .lyt-dropdown__dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      background-color: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
      z-index: 1000;
      max-height: 274px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .lyt-dropdown__search-wrapper {
      padding: 8px;
      border-bottom: 1px solid #e4e7ed;
    }
    .lyt-dropdown__search {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
    .lyt-dropdown__search:focus { border-color: #409eff; }
    .lyt-dropdown__list {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      overflow-y: auto;
      flex: 1;
    }
    .lyt-dropdown__option {
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      color: #606266;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
    }
    .lyt-dropdown__option:hover { background-color: #f5f7fa; }
    .lyt-dropdown__option--selected { color: #409eff; font-weight: 500; }
    .lyt-dropdown__option--disabled { color: #c0c4cc; cursor: not-allowed; }
    .lyt-dropdown__option--disabled:hover { background-color: transparent; }
    .lyt-dropdown__option--empty { color: #909399; text-align: center; cursor: default; justify-content: center; }
    .lyt-dropdown__option--loading { color: #909399; text-align: center; cursor: default; justify-content: center; }
    .lyt-dropdown__option-check { font-size: 12px; flex-shrink: 0; }
    .lyt-dropdown__option-label { flex: 1; }
    .lyt-dropdown__option-desc { font-size: 12px; color: #909399; }
  `,
})
