/**
 * Tabs 标签页
 * Props: activeKey, type(line/card), closable
 * Events: change, close
 * Slots: default(每个 tab-pane)
 */

import { defineComponent } from '@lytjs/component'
import { reactive, watch, ref } from '@lytjs/reactivity'

export const Tabs = defineComponent({
  name: 'LytTabs',

  props: {
    activeKey: {
      type: [String, Number],
      default: '',
    },
    type: {
      type: String,
      default: 'line',
      validator: (v: string) => ['line', 'card'].includes(v),
    },
    closable: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      currentKey: props.activeKey,
    })

    const tabs = ref<Array<{ key: string | number; label: string; closable?: boolean }>>([])

    const parseSlots = () => {
      const result: Array<{ key: string | number; label: string; closable?: boolean }> = []
      // 从 slot 中解析 tab-pane 信息
      if (slots.default) {
        const children = slots.default()
        if (Array.isArray(children)) {
          children.forEach((child: any) => {
            if (child.props) {
              result.push({
                key: child.props.tabKey || child.props.key || result.length,
                label: child.props.tab || child.props.label || '',
                closable: child.props.closable !== undefined ? child.props.closable : props.closable,
              })
            }
          })
        }
      }
      tabs.value = result
      return result
    }

    const handleTabClick = (key: string | number) => {
      state.currentKey = key
      emit('change', key)
      emit('update:activeKey', key)
    }

    const handleTabClose = (key: string | number, e: Event) => {
      e.stopPropagation()
      emit('close', key)
    }

    watch(() => props.activeKey, (val: any) => {
      state.currentKey = val
    })

    return { state, tabs, parseSlots, handleTabClick, handleTabClose, slots }
  },

  template: `
    <div class="lyt-tabs lyt-tabs--{type}">
      <div class="lyt-tabs__header">
        <div class="lyt-tabs__nav">
          <div
            v-for="tab in parseSlots()"
            class="lyt-tabs__item {state.currentKey === tab.key ? 'lyt-tabs__item--active' : ''}"
            @click="handleTabClick(tab.key)"
          >
            <span class="lyt-tabs__item-label">{{ tab.label }}</span>
            <span
              class="lyt-tabs__item-close"
              v-if="tab.closable"
              @click="handleTabClose(tab.key, $event)"
            >&times;</span>
          </div>
        </div>
      </div>
      <div class="lyt-tabs__content">
        <slot></slot>
      </div>
    </div>
  `,

  styles: `
    .lyt-tabs { box-sizing: border-box; }
    .lyt-tabs__header { position: relative; }
    .lyt-tabs__nav {
      display: flex;
      border-bottom: 2px solid var(--lyt-color-border);
    }
    .lyt-tabs--card .lyt-tabs__nav { border-bottom: 1px solid var(--lyt-color-border); }
    .lyt-tabs__item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 10px 20px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      cursor: pointer;
      transition: color 0.3s;
      white-space: nowrap;
      position: relative;
    }
    .lyt-tabs__item:hover { color: var(--lyt-color-primary); }
    .lyt-tabs__item--active { color: var(--lyt-color-primary); }
    .lyt-tabs--line .lyt-tabs__item--active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: var(--lyt-color-primary);
    }
    .lyt-tabs--card .lyt-tabs__item {
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: var(--lyt-radius-sm) var(--lyt-radius-sm) 0 0;
      margin-bottom: -1px;
      background-color: var(--lyt-color-bg);
    }
    .lyt-tabs--card .lyt-tabs__item--active {
      background-color: var(--lyt-color-bg);
      border-color: var(--lyt-color-border);
      color: var(--lyt-color-primary);
    }
    .lyt-tabs__item-close {
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-info);
      cursor: pointer;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    .lyt-tabs__item-close:hover { background-color: var(--lyt-color-danger); color: #fff; }
    .lyt-tabs__content {
      padding: 16px 0;
    }
  `,
})
