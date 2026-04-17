/**
 * TabNav 标签导航
 * Props: activeKey, items, type, closable, animated, lazy
 * Events: change, close, add
 * Features: 活跃标签跟踪, 懒加载渲染, 标签变更回调, 禁用标签
 */

import { defineComponent } from '@lytjs/component'

export interface TabNavItem {
  key: string | number
  label: string
  disabled?: boolean
  closable?: boolean
  icon?: string
}

export const TabNav = defineComponent({
  name: 'LytTabNav',

  props: {
    activeKey: {
      type: [String, Number],
      default: '',
    },
    items: {
      type: Array as () => TabNavItem[],
      default: () => [],
    },
    type: {
      type: String,
      default: 'line',
      validator: (v: string) => ['line', 'card', 'segment'].includes(v),
    },
    closable: {
      type: Boolean,
      default: false,
    },
    animated: {
      type: Boolean,
      default: true,
    },
    lazy: {
      type: Boolean,
      default: false,
    },
    addable: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      currentKey: props.activeKey,
      renderedKeys: new Set<string | number>(),
    })

    /** 初始化已渲染的标签 */
    const initRenderedKeys = () => {
      if (props.activeKey) {
        state.renderedKeys.add(props.activeKey)
      }
    }
    initRenderedKeys()

    /** 切换标签 */
    const handleTabClick = (item: TabNavItem) => {
      if (item.disabled) return
      state.currentKey = item.key
      if (props.lazy) {
        state.renderedKeys.add(item.key)
      }
      emit('change', item.key)
      emit('update:activeKey', item.key)
    }

    /** 关闭标签 */
    const handleTabClose = (key: string | number, e: Event) => {
      e.stopPropagation()
      emit('close', key)
    }

    /** 添加标签 */
    const handleAdd = () => {
      emit('add')
    }

    /** 判断标签是否活跃 */
    const isActive = (key: string | number): boolean => {
      return state.currentKey === key
    }

    /** 判断标签是否已渲染（懒加载） */
    const isRendered = (key: string | number): boolean => {
      if (!props.lazy) return true
      return state.renderedKeys.has(key)
    }

    /** 判断标签是否可关闭 */
    const isClosable = (item: TabNavItem): boolean => {
      return item.closable !== undefined ? item.closable : props.closable
    }

    watch(() => props.activeKey, (val) => {
      state.currentKey = val
      if (props.lazy && val) {
        state.renderedKeys.add(val)
      }
    })

    return {
      state, handleTabClick, handleTabClose, handleAdd,
      isActive, isRendered, isClosable, slots,
    }
  },

  template: `
    <div class="lyt-tabnav lyt-tabnav--{type} lyt-tabnav--{size}">
      <div class="lyt-tabnav__header">
        <div class="lyt-tabnav__nav">
          <div
            v-for="item in items"
            class="lyt-tabnav__item {isActive(item.key) ? 'lyt-tabnav__item--active' : ''} {item.disabled ? 'lyt-tabnav__item--disabled' : ''}"
            @click="handleTabClick(item)"
          >
            <span class="lyt-tabnav__item-label">{{ item.label }}</span>
            <span
              class="lyt-tabnav__item-close"
              v-if="isClosable(item)"
              @click="handleTabClose(item.key, $event)"
            >&times;</span>
          </div>
        </div>
        <span class="lyt-tabnav__add" v-if="addable" @click="handleAdd">+</span>
      </div>
      <div class="lyt-tabnav__content {animated ? 'lyt-tabnav__content--animated' : ''}">
        <div
          v-for="item in items"
          class="lyt-tabnav__panel {isActive(item.key) ? 'lyt-tabnav__panel--active' : ''}"
          v-if="isRendered(item.key)"
        >
          <slot :name="'panel-' + item.key" :item="item">{{ item.label }} 内容</slot>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-tabnav { box-sizing: border-box; }
    .lyt-tabnav__header { display: flex; align-items: center; }
    .lyt-tabnav__nav {
      display: flex;
      border-bottom: 2px solid #e4e7ed;
      flex: 1;
      overflow-x: auto;
    }
    .lyt-tabnav--card .lyt-tabnav__nav { border-bottom: 1px solid #e4e7ed; }
    .lyt-tabnav--segment .lyt-tabnav__nav { border-bottom: none; background-color: #f5f7fa; border-radius: 4px; padding: 2px; }
    .lyt-tabnav__item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 10px 20px;
      font-size: 14px;
      color: #606266;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
      position: relative;
      user-select: none;
    }
    .lyt-tabnav--small .lyt-tabnav__item { padding: 6px 14px; font-size: 12px; }
    .lyt-tabnav--large .lyt-tabnav__item { padding: 14px 24px; font-size: 16px; }
    .lyt-tabnav__item:hover { color: #409eff; }
    .lyt-tabnav__item--active { color: #409eff; font-weight: 500; }
    .lyt-tabnav__item--disabled { color: #c0c4cc; cursor: not-allowed; }
    .lyt-tabnav__item--disabled:hover { color: #c0c4cc; }
    .lyt-tabnav--line .lyt-tabnav__item--active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: #409eff;
    }
    .lyt-tabnav--card .lyt-tabnav__item {
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      margin-bottom: -1px;
      background-color: #f5f7fa;
    }
    .lyt-tabnav--card .lyt-tabnav__item--active {
      background-color: #fff;
      border-color: #e4e7ed;
      color: #409eff;
    }
    .lyt-tabnav--segment .lyt-tabnav__item {
      border-radius: 3px;
      margin: 0 1px;
    }
    .lyt-tabnav--segment .lyt-tabnav__item--active {
      background-color: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      color: #409eff;
    }
    .lyt-tabnav__item-close {
      font-size: 12px;
      color: #909399;
      cursor: pointer;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .lyt-tabnav__item-close:hover { background-color: #f56c6c; color: #fff; }
    .lyt-tabnav__add {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-left: 8px;
      font-size: 18px;
      color: #606266;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .lyt-tabnav__add:hover { background-color: #f5f7fa; color: #409eff; }
    .lyt-tabnav__content { position: relative; }
    .lyt-tabnav__panel { display: none; padding: 16px 0; }
    .lyt-tabnav__panel--active { display: block; }
    .lyt-tabnav__content--animated .lyt-tabnav__panel {
      animation: lyt-tabnav-fade 0.3s ease;
    }
    @keyframes lyt-tabnav-fade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
})
