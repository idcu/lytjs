/**
 * Pager 分页器
 * Props: total, pageSize, currentPage, pageSizeOptions, showSizeChanger, showQuickJumper, showTotal, disabled, simple
 * Events: change, pageSizeChange, update:currentPage, update:pageSize
 * Features: 页码, 上一页/下一页, 每页大小选择器, 总数, 变更回调
 */

import { defineComponent } from '@lytjs/component'
import { reactive, watch } from '@lytjs/reactivity'

export const Pager = defineComponent({
  name: 'LytPager',

  props: {
    total: {
      type: Number,
      default: 0,
    },
    pageSize: {
      type: Number,
      default: 10,
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    pageSizeOptions: {
      type: Array as () => number[],
      default: () => [10, 20, 50, 100],
    },
    showSizeChanger: {
      type: Boolean,
      default: false,
    },
    showQuickJumper: {
      type: Boolean,
      default: false,
    },
    showTotal: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    simple: {
      type: Boolean,
      default: false,
    },
    maxPageButtons: {
      type: Number,
      default: 7,
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      current: props.currentPage,
      size: props.pageSize,
      jumperValue: '',
    })

    /** 总页数 */
    const totalPages = () => Math.max(1, Math.ceil(props.total / state.size))

    /** 生成页码数组 */
    const pages = () => {
      const total = totalPages()
      const current = state.current
      const maxButtons = props.maxPageButtons
      const result: (number | string)[] = []

      if (total <= maxButtons) {
        for (let i = 1; i <= total; i++) result.push(i)
      } else {
        result.push(1)
        const halfButtons = Math.floor((maxButtons - 2) / 2)
        let start = Math.max(2, current - halfButtons)
        let end = Math.min(total - 1, current + halfButtons)

        // 调整范围
        if (current - halfButtons < 2) {
          end = Math.min(total - 1, maxButtons - 1)
        }
        if (current + halfButtons > total - 1) {
          start = Math.max(2, total - maxButtons + 2)
        }

        if (start > 2) result.push('...')
        for (let i = start; i <= end; i++) result.push(i)
        if (end < total - 1) result.push('...')
        result.push(total)
      }

      return result
    }

    /** 跳转到指定页 */
    const goTo = (page: number) => {
      if (props.disabled) return
      const total = totalPages()
      if (page < 1) page = 1
      if (page > total) page = total
      state.current = page
      emit('change', page)
      emit('update:currentPage', page)
    }

    const handlePrev = () => goTo(state.current - 1)
    const handleNext = () => goTo(state.current + 1)
    const handlePageClick = (page: number | string) => {
      if (typeof page === 'number') goTo(page)
    }

    /** 每页大小变更 */
    const handleSizeChange = (e: Event) => {
      if (props.disabled) return
      const target = e.target as HTMLSelectElement
      state.size = Number(target.value)
      state.current = 1
      emit('pageSizeChange', state.size)
      emit('update:pageSize', state.size)
      emit('change', 1)
    }

    /** 跳转输入 */
    const handleJumper = () => {
      const page = parseInt(state.jumperValue, 10)
      if (!isNaN(page)) {
        goTo(page)
        state.jumperValue = ''
      }
    }

    const handleJumperKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleJumper()
    }

    const handleJumperInput = (e: Event) => {
      state.jumperValue = (e.target as HTMLInputElement).value
    }

    /** 简单模式跳转 */
    const handleSimplePrev = () => goTo(state.current - 1)
    const handleSimpleNext = () => goTo(state.current + 1)
    const handleSimpleInput = (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10)
      if (!isNaN(val)) {
        goTo(val)
      }
    }

    watch(() => props.currentPage, (val: any) => {
      state.current = val
    })

    watch(() => props.pageSize, (val: any) => {
      state.size = val
    })

    return {
      state, totalPages, pages,
      goTo, handlePrev, handleNext, handlePageClick,
      handleSizeChange, handleJumper, handleJumperKeydown, handleJumperInput,
      handleSimplePrev, handleSimpleNext, handleSimpleInput,
    }
  },

  template: `
    <div class="lyt-pager {disabled ? 'lyt-pager--disabled' : ''}">
      <!-- 简单模式 -->
      <template v-if="simple">
        <span
          class="lyt-pager__item lyt-pager__prev {state.current <= 1 ? 'lyt-pager__item--disabled' : ''}"
          @click="handleSimplePrev"
        >&laquo;</span>
        <span class="lyt-pager__simple">
          <input
            class="lyt-pager__simple-input"
            type="number"
            :value="state.current"
            @change="handleSimpleInput"
            min="1"
            :max="totalPages()"
          />
          <span class="lyt-pager__simple-slash">/</span>
          <span class="lyt-pager__simple-total">{{ totalPages() }}</span>
        </span>
        <span
          class="lyt-pager__item lyt-pager__next {state.current >= totalPages() ? 'lyt-pager__item--disabled' : ''}"
          @click="handleSimpleNext"
        >&raquo;</span>
      </template>

      <!-- 完整模式 -->
      <template v-else>
        <span class="lyt-pager__total" v-if="showTotal && total > 0">共 {{ total }} 条</span>
        <span
          class="lyt-pager__item lyt-pager__prev {state.current <= 1 ? 'lyt-pager__item--disabled' : ''}"
          @click="handlePrev"
        >&laquo;</span>
        <span
          v-for="page in pages()"
          class="lyt-pager__item {page === state.current ? 'lyt-pager__item--active' : ''} {page === '...' ? 'lyt-pager__item--ellipsis' : ''}"
          @click="handlePageClick(page)"
        >{{ page }}</span>
        <span
          class="lyt-pager__item lyt-pager__next {state.current >= totalPages() ? 'lyt-pager__item--disabled' : ''}"
          @click="handleNext"
        >&raquo;</span>
        <select
          class="lyt-pager__size-changer"
          v-if="showSizeChanger"
          :value="state.size"
          @change="handleSizeChange"
        >
          <option v-for="size in pageSizeOptions" :value="size" :key="size">{{ size }} 条/页</option>
        </select>
        <span class="lyt-pager__jumper" v-if="showQuickJumper">
          跳至
          <input
            class="lyt-pager__jumper-input"
            type="number"
            :value="state.jumperValue"
            @input="handleJumperInput"
            @keydown="handleJumperKeydown"
            min="1"
            :max="totalPages()"
          />
          页
        </span>
      </template>
    </div>
  `,

  styles: `
    .lyt-pager {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #606266;
      flex-wrap: wrap;
      user-select: none;
    }
    .lyt-pager--disabled { opacity: 0.6; pointer-events: none; }
    .lyt-pager__item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      color: #606266;
    }
    .lyt-pager__item:hover { color: #409eff; border-color: #409eff; }
    .lyt-pager__item--active { background-color: #409eff; border-color: #409eff; color: #fff; }
    .lyt-pager__item--active:hover { background-color: #66b1ff; border-color: #66b1ff; color: #fff; }
    .lyt-pager__item--disabled { color: #c0c4cc; cursor: not-allowed; pointer-events: none; }
    .lyt-pager__item--ellipsis { border: none; cursor: default; }
    .lyt-pager__item--ellipsis:hover { color: #606266; }
    .lyt-pager__total { margin: 0 8px; color: #606266; font-size: 13px; }
    .lyt-pager__size-changer {
      height: 32px;
      padding: 0 8px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #606266;
      outline: none;
      cursor: pointer;
      margin-left: 8px;
      background-color: #fff;
    }
    .lyt-pager__size-changer:focus { border-color: #409eff; }
    .lyt-pager__jumper {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
      font-size: 13px;
    }
    .lyt-pager__jumper-input {
      width: 50px;
      height: 32px;
      text-align: center;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #606266;
      outline: none;
    }
    .lyt-pager__jumper-input:focus { border-color: #409eff; }
    .lyt-pager__simple {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 0 8px;
    }
    .lyt-pager__simple-input {
      width: 46px;
      height: 32px;
      text-align: center;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #606266;
      outline: none;
    }
    .lyt-pager__simple-input:focus { border-color: #409eff; }
    .lyt-pager__simple-slash { color: #909399; }
    .lyt-pager__simple-total { color: #606266; }
  `,
})
