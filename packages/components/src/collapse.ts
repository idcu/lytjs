/**
 * Collapse 折叠面板
 * Props: activeKey, accordion, bordered
 * Events: change
 * Features: 多项展开, 手风琴模式, 变更回调
 */

import { defineComponent } from '@lytjs/component'

export const Collapse = defineComponent({
  name: 'LytCollapse',

  props: {
    /** 当前展开的面板 key（受控模式） */
    activeKey: {
      type: [String, Number, Array] as any,
      default: undefined,
    },
    /** 默认展开的面板 key */
    defaultActiveKey: {
      type: [String, Number, Array] as any,
      default: () => [],
    },
    /** 手风琴模式（同时只展开一个） */
    accordion: {
      type: Boolean,
      default: false,
    },
    /** 是否显示边框 */
    bordered: {
      type: Boolean,
      default: true,
    },
    /** 是否可折叠已展开的面板 */
    collapsible: {
      type: Boolean,
      default: true,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      activeKeys: [] as Array<string | number>,
    })

    /** 初始化 activeKeys */
    const initActiveKeys = () => {
      if (props.activeKey !== undefined) {
        state.activeKeys = Array.isArray(props.activeKey) ? [...props.activeKey] : [props.activeKey]
      } else {
        const defaultVal = props.defaultActiveKey
        state.activeKeys = Array.isArray(defaultVal) ? [...defaultVal] : (defaultVal !== undefined ? [defaultVal] : [])
      }
    }

    initActiveKeys()

    /** 判断面板是否展开 */
    const isActive = (key: string | number): boolean => {
      return state.activeKeys.includes(key)
    }

    /** 切换面板 */
    const toggle = (key: string | number) => {
      if (!props.collapsible && isActive(key)) return

      if (props.accordion) {
        if (isActive(key)) {
          state.activeKeys = []
        } else {
          state.activeKeys = [key]
        }
      } else {
        const index = state.activeKeys.indexOf(key)
        if (index > -1) {
          state.activeKeys.splice(index, 1)
        } else {
          state.activeKeys.push(key)
        }
      }

      const result = props.accordion
        ? (state.activeKeys.length > 0 ? state.activeKeys[0] : null)
        : [...state.activeKeys]

      emit('change', result)
      emit('update:activeKey', result)
    }

    /** 解析 slot 获取面板信息 */
    const panels = () => {
      const result: Array<{ key: string | number; title: string; disabled?: boolean }> = []
      if (slots.default) {
        const children = slots.default()
        if (Array.isArray(children)) {
          children.forEach((child: any, index: number) => {
            if (child.props) {
              result.push({
                key: child.props.panelKey || child.props.key || index,
                title: child.props.title || child.props.header || `面板 ${index + 1}`,
                disabled: child.props.disabled || false,
              })
            }
          })
        }
      }
      return result
    }

    /** 监听 activeKey 变化 */
    watch(() => props.activeKey, (val) => {
      if (val !== undefined) {
        state.activeKeys = Array.isArray(val) ? [...val] : [val]
      }
    })

    return { state, isActive, toggle, panels, slots }
  },

  template: `
    <div class="lyt-collapse {bordered ? 'lyt-collapse--bordered' : ''}">
      <div
        v-for="panel in panels()"
        class="lyt-collapse__item {isActive(panel.key) ? 'lyt-collapse__item--active' : ''} {panel.disabled ? 'lyt-collapse__item--disabled' : ''}"
      >
        <div
          class="lyt-collapse__header"
          @click="!panel.disabled && toggle(panel.key)"
        >
          <span class="lyt-collapse__title">{{ panel.title }}</span>
          <span class="lyt-collapse__arrow {isActive(panel.key) ? 'lyt-collapse__arrow--active' : ''}">&rsaquo;</span>
        </div>
        <div class="lyt-collapse__content {isActive(panel.key) ? 'lyt-collapse__content--active' : ''}">
          <div class="lyt-collapse__body">
            <slot :name="'panel-' + panel.key">{{ panel.title }} 的内容区域</slot>
          </div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-collapse {
      box-sizing: border-box;
      border-radius: 4px;
      font-size: 14px;
      color: #606266;
    }
    .lyt-collapse--bordered {
      border: 1px solid #e4e7ed;
      border-radius: 4px;
    }
    .lyt-collapse__item {
      border-bottom: 1px solid #e4e7ed;
    }
    .lyt-collapse--bordered .lyt-collapse__item:last-child { border-bottom: none; }
    .lyt-collapse__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background-color: #fff;
      cursor: pointer;
      transition: background-color 0.3s;
      user-select: none;
    }
    .lyt-collapse__header:hover { background-color: #f5f7fa; }
    .lyt-collapse__item--disabled .lyt-collapse__header { color: #c0c4cc; cursor: not-allowed; }
    .lyt-collapse__item--disabled .lyt-collapse__header:hover { background-color: #fff; }
    .lyt-collapse__title { flex: 1; font-weight: 500; color: #303133; }
    .lyt-collapse__arrow {
      font-size: 18px;
      color: #909399;
      transition: transform 0.3s;
      transform: rotate(90deg);
    }
    .lyt-collapse__arrow--active { transform: rotate(-90deg); }
    .lyt-collapse__content {
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.3s ease;
    }
    .lyt-collapse__content--active { max-height: 500px; }
    .lyt-collapse__body {
      padding: 12px 16px;
      color: #606266;
      line-height: 1.6;
    }
  `,
})
