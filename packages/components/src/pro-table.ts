/**
 * ProTable 高级表格组件
 *
 * 搜索表单 + DataTable + 分页 一体化组件。
 * 自动处理分页、排序、搜索、loading 状态。
 *
 * Props: columns, searchFields, request, pagination, rowKey, toolbar
 * Events: search, reset, export
 */

import { defineComponent } from '@lytjs/component'
import { reactive, computed, ref, watch, onMounted } from '@lytjs/reactivity'
import type { DataTableColumn } from './table'

// ================================================================
//  类型定义
// ================================================================

/** 搜索字段定义 */
export interface SearchField {
  /** 字段名 */
  key: string
  /** 标签 */
  label: string
  /** 输入类型 */
  type?: 'text' | 'number' | 'select' | 'date' | 'dateRange'
  /** 占位符 */
  placeholder?: string
  /** select 选项 */
  options?: Array<{ label: string; value: any }>
  /** 默认值 */
  defaultValue?: any
}

/** 分页配置 */
export interface ProTablePagination {
  /** 当前页码 */
  current?: number
  /** 每页条数 */
  pageSize?: number
  /** 总条数 */
  total?: number
  /** 可选的每页条数 */
  pageSizes?: number[]
  /** 是否显示分页 */
  show?: boolean
}

/** 请求参数 */
export interface ProTableRequestParams {
  /** 当前页码 */
  current: number
  /** 每页条数 */
  pageSize: number
  /** 排序字段 */
  sortKey?: string
  /** 排序方向 */
  sortOrder?: string
  /** 搜索参数 */
  [key: string]: any
}

/** 请求响应 */
export interface ProTableRequestResult {
  /** 数据列表 */
  data: Array<Record<string, any>>
  /** 总条数 */
  total: number
  /** 当前页码 */
  current?: number
  /** 每页条数 */
  pageSize?: number
}

/** 工具栏配置 */
export interface ProTableToolbar {
  /** 是否显示刷新按钮 */
  refresh?: boolean
  /** 是否显示导出按钮 */
  export?: boolean
  /** 是否显示列设置 */
  columnSetting?: boolean
  /** 是否显示密度切换 */
  density?: boolean
}

/** ProTable 列定义（扩展 DataTableColumn） */
export interface ProTableColumn extends DataTableColumn {
  /** 是否在搜索表单中显示 */
  searchable?: boolean
  /** 搜索字段类型 */
  searchType?: SearchField['type']
  /** 搜索选项 */
  searchOptions?: SearchField['options']
  /** 是否在表格中默认隐藏 */
  hidden?: boolean
}

// ================================================================
//  组件定义
// ================================================================

export const ProTable = defineComponent({
  name: 'LytProTable',

  props: {
    /** 列定义 */
    columns: {
      type: Array as () => ProTableColumn[],
      default: () => [],
    },
    /** 搜索字段定义（如果为空，从 columns 中提取 searchable 的字段） */
    searchFields: {
      type: Array as () => SearchField[],
      default: () => [],
    },
    /** 数据请求函数 */
    request: {
      type: Function as () => (params: ProTableRequestParams) => Promise<ProTableRequestResult>,
      required: true,
    },
    /** 分页配置 */
    pagination: {
      type: Object as () => ProTablePagination,
      default: () => ({}),
    },
    /** 行 key */
    rowKey: {
      type: String,
      default: 'id',
    },
    /** 工具栏配置 */
    toolbar: {
      type: Object as () => ProTableToolbar,
      default: () => ({ refresh: true, export: true }),
    },
    /** 表格尺寸 */
    size: {
      type: String,
      default: 'medium',
    },
    /** 是否显示边框 */
    bordered: {
      type: Boolean,
      default: false,
    },
    /** 是否斑马纹 */
    striped: {
      type: Boolean,
      default: false,
    },
    /** 行唯一标识字段 */
    id: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    // ---- 状态 ----
    const state = reactive({
      loading: false,
      data: [] as Array<Record<string, any>>,
      total: 0,
      current: props.pagination.current || 1,
      pageSize: props.pagination.pageSize || 10,
      sortKey: '' as string,
      sortOrder: '' as '' | 'asc' | 'desc',
      searchParams: {} as Record<string, any>,
      /** 列可见性 */
      columnVisible: {} as Record<string, boolean>,
      /** 表格密度 */
      density: 'medium' as 'small' | 'medium' | 'large',
      /** 搜索区域是否展开 */
      searchCollapsed: false,
    })

    // 初始化列可见性
    const initColumnVisible = () => {
      for (const col of props.columns) {
        if (col.hidden !== true) {
          state.columnVisible[col.key] = true
        }
      }
    }
    initColumnVisible()

    // ---- 搜索字段 ----
    const effectiveSearchFields = computed(() => {
      if (props.searchFields.length > 0) return props.searchFields
      // 从 columns 中提取 searchable 的字段
      return props.columns
        .filter((col) => col.searchable)
        .map((col) => ({
          key: col.key,
          label: col.title,
          type: col.searchType || 'text',
          options: col.searchOptions,
        }))
    })

    // ---- 搜索参数 ----
    const searchForm = reactive<Record<string, any>>({})

    // 初始化搜索默认值
    const initSearchDefaults = () => {
      for (const field of effectiveSearchFields.value) {
        if (field.defaultValue !== undefined) {
          searchForm[field.key] = field.defaultValue
        }
      }
    }
    initSearchDefaults()

    // ---- 分页 ----
    const paginationConfig = computed(() => {
      const show = props.pagination.show !== false
      return {
        current: state.current,
        pageSize: state.pageSize,
        total: state.total,
        pageSizes: props.pagination.pageSizes || [10, 20, 50, 100],
        show,
      }
    })

    // ---- 可见列 ----
    const visibleColumns = computed(() => {
      return props.columns.filter((col) => state.columnVisible[col.key] !== false)
    })

    // ---- 数据请求 ----
    const fetchData = async () => {
      state.loading = true
      try {
        const params: ProTableRequestParams = {
          current: state.current,
          pageSize: state.pageSize,
          sortKey: state.sortKey || undefined,
          sortOrder: state.sortOrder || undefined,
          ...state.searchParams,
        }

        const result = await props.request(params)

        state.data = result.data || []
        state.total = result.total || 0

        if (result.current !== undefined) {
          state.current = result.current
        }
        if (result.pageSize !== undefined) {
          state.pageSize = result.pageSize
        }
      } catch (err: any) {
        console.error('[ProTable] 数据请求失败:', err.message)
        state.data = []
        state.total = 0
      } finally {
        state.loading = false
      }
    }

    /** 刷新数据 */
    const refresh = () => {
      fetchData()
    }

    /** 重置并刷新 */
    const resetAndRefresh = () => {
      state.current = 1
      state.sortKey = ''
      state.sortOrder = ''
      fetchData()
    }

    // ---- 搜索 ----
    const handleSearch = () => {
      state.searchParams = { ...searchForm }
      state.current = 1
      emit('search', state.searchParams)
      fetchData()
    }

    const handleReset = () => {
      for (const key of Object.keys(searchForm)) {
        delete searchForm[key]
      }
      initSearchDefaults()
      state.searchParams = {}
      state.current = 1
      emit('reset')
      fetchData()
    }

    // ---- 排序 ----
    const handleSort = (sortInfo: { key: string; order: string }) => {
      state.sortKey = sortInfo.key
      state.sortOrder = sortInfo.order as '' | 'asc' | 'desc'
      fetchData()
    }

    // ---- 分页 ----
    const handlePageChange = (pageInfo: { current: number; pageSize: number }) => {
      state.current = pageInfo.current
      state.pageSize = pageInfo.pageSize
      fetchData()
    }

    // ---- 工具栏 ----
    const handleRefresh = () => {
      resetAndRefresh()
    }

    const handleExport = () => {
      emit('export', {
        data: state.data,
        columns: visibleColumns.value,
        searchParams: state.searchParams,
      })
    }

    const handleDensityChange = (density: 'small' | 'medium' | 'large') => {
      state.density = density
    }

    const handleColumnVisibleChange = (key: string, visible: boolean) => {
      state.columnVisible[key] = visible
    }

    const toggleSearchCollapsed = () => {
      state.searchCollapsed = !state.searchCollapsed
    }

    // ---- 计算分页信息 ----
    const totalPages = computed(() => {
      return Math.ceil(state.total / state.pageSize)
    })

    const pageRange = computed(() => {
      const start = (state.current - 1) * state.pageSize + 1
      const end = Math.min(state.current * state.pageSize, state.total)
      return state.total > 0 ? `${start}-${end}` : '0'
    })

    // ---- 初始化 ----
    onMounted(() => {
      fetchData()
    })

    // 监听 columns 变化
    watch(() => props.columns, () => {
      initColumnVisible()
    })

    return {
      state, searchForm, effectiveSearchFields,
      paginationConfig, visibleColumns,
      totalPages, pageRange,
      fetchData, refresh, resetAndRefresh,
      handleSearch, handleReset, handleSort,
      handlePageChange, handleRefresh, handleExport,
      handleDensityChange, handleColumnVisibleChange,
      toggleSearchCollapsed, slots,
    }
  },

  template: `
    <div class="lyt-pro-table">
      <!-- 搜索表单 -->
      <div v-if="effectiveSearchFields.length > 0" class="lyt-pro-table__search">
        <div class="lyt-pro-table__search-form {state.searchCollapsed ? 'lyt-pro-table__search-form--collapsed' : ''}">
          <div
            v-for="field in effectiveSearchFields"
            :key="field.key"
            class="lyt-pro-table__search-item"
          >
            <label class="lyt-pro-table__search-label">{{ field.label }}</label>
            <input
              v-if="field.type === 'text' || !field.type"
              type="text"
              class="lyt-pro-table__search-input"
              :value="searchForm[field.key] || ''"
              :placeholder="field.placeholder || '请输入'"
              @input="searchForm[field.key] = $event.target.value"
            />
            <input
              v-if="field.type === 'number'"
              type="number"
              class="lyt-pro-table__search-input"
              :value="searchForm[field.key] || ''"
              :placeholder="field.placeholder || '请输入'"
              @input="searchForm[field.key] = $event.target.value"
            />
            <select
              v-if="field.type === 'select'"
              class="lyt-pro-table__search-input"
              :value="searchForm[field.key] || ''"
              @change="searchForm[field.key] = $event.target.value"
            >
              <option value="">全部</option>
              <option v-for="opt in (field.options || [])" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              v-if="field.type === 'date'"
              type="date"
              class="lyt-pro-table__search-input"
              :value="searchForm[field.key] || ''"
              @input="searchForm[field.key] = $event.target.value"
            />
          </div>
        </div>
        <div class="lyt-pro-table__search-actions">
          <button class="lyt-pro-table__btn lyt-pro-table__btn--primary" @click="handleSearch">搜索</button>
          <button class="lyt-pro-table__btn" @click="handleReset">重置</button>
          <button
            v-if="effectiveSearchFields.length > 3"
            class="lyt-pro-table__btn lyt-pro-table__btn--link"
            @click="toggleSearchCollapsed"
          >
            {{ state.searchCollapsed ? '展开' : '收起' }}
          </button>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="lyt-pro-table__toolbar">
        <div class="lyt-pro-table__toolbar-left">
          <slot name="toolbar-left"></slot>
        </div>
        <div class="lyt-pro-table__toolbar-right">
          <slot name="toolbar-right">
            <button
              v-if="toolbar.density"
              class="lyt-pro-table__toolbar-btn"
              title="密度"
              @click="handleDensityChange(state.density === 'medium' ? 'small' : state.density === 'small' ? 'large' : 'medium')"
            >
              {{ state.density === 'small' ? '密' : state.density === 'large' ? '疏' : '中' }}
            </button>
            <button
              v-if="toolbar.refresh"
              class="lyt-pro-table__toolbar-btn"
              title="刷新"
              @click="handleRefresh"
            >
              &#8635;
            </button>
            <button
              v-if="toolbar.export"
              class="lyt-pro-table__toolbar-btn"
              title="导出"
              @click="handleExport"
            >
              &#8615;
            </button>
          </slot>
        </div>
      </div>

      <!-- 表格 -->
      <div class="lyt-pro-table__table-wrapper">
        <div class="lyt-pro-table__loading" v-if="state.loading">
          <span>加载中...</span>
        </div>
        <table class="lyt-pro-table__table lyt-pro-table__table--{state.density} {bordered ? 'lyt-pro-table__table--bordered' : ''} {striped ? 'lyt-pro-table__table--striped' : ''}">
          <thead>
            <tr>
              <th
                v-for="col in visibleColumns"
                :key="col.key"
                class="lyt-pro-table__th {col.sortable ? 'lyt-pro-table__th--sortable' : ''} {state.sortKey === col.key ? 'lyt-pro-table__th--sorted' : ''}"
                :style="{ width: col.width, textAlign: col.align || 'left' }"
                @click="col.sortable ? handleSort({ key: col.key, order: state.sortKey === col.key && state.sortOrder === 'asc' ? 'desc' : 'asc' }) : null"
              >
                {{ col.title }}
                <span v-if="col.sortable" class="lyt-pro-table__sort-icon">
                  {{ state.sortKey !== col.key ? '&#8693;' : state.sortOrder === 'asc' ? '&#8593;' : '&#8595;' }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="state.data.length === 0 && !state.loading">
              <td :colspan="visibleColumns.length" class="lyt-pro-table__empty">暂无数据</td>
            </tr>
            <tr
              v-for="(row, rowIndex) in state.data"
              :key="row[rowKey] || rowIndex"
              class="lyt-pro-table__row"
            >
              <td
                v-for="col in visibleColumns"
                :key="col.key"
                :style="{ textAlign: col.align || 'left' }"
                :title="col.ellipsis ? (col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]) : ''"
              >
                <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]" :index="rowIndex">
                  {{ col.render ? col.render(row[col.key], row, rowIndex) : (row[col.key] !== undefined ? row[col.key] : '') }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="paginationConfig.show" class="lyt-pro-table__pagination">
        <div class="lyt-pro-table__pagination-info">
          共 {{ state.total }} 条，第 {{ pageRange }} 条 / 共 {{ totalPages }} 页
        </div>
        <div class="lyt-pro-table__pagination-controls">
          <select
            class="lyt-pro-table__pagination-size"
            :value="state.pageSize"
            @change="handlePageChange({ current: 1, pageSize: parseInt($event.target.value) })"
          >
            <option
              v-for="size in (paginationConfig.pageSizes || [10, 20, 50, 100])"
              :key="size"
              :value="size"
            >
              {{ size }} 条/页
            </option>
          </select>
          <button
            class="lyt-pro-table__pagination-btn"
            :disabled="state.current <= 1"
            @click="handlePageChange({ current: 1, pageSize: state.pageSize })"
          >
            &laquo;
          </button>
          <button
            class="lyt-pro-table__pagination-btn"
            :disabled="state.current <= 1"
            @click="handlePageChange({ current: state.current - 1, pageSize: state.pageSize })"
          >
            &lsaquo;
          </button>
          <span class="lyt-pro-table__pagination-current">{{ state.current }}</span>
          <button
            class="lyt-pro-table__pagination-btn"
            :disabled="state.current >= totalPages"
            @click="handlePageChange({ current: state.current + 1, pageSize: state.pageSize })"
          >
            &rsaquo;
          </button>
          <button
            class="lyt-pro-table__pagination-btn"
            :disabled="state.current >= totalPages"
            @click="handlePageChange({ current: totalPages, pageSize: state.pageSize })"
          >
            &raquo;
          </button>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-pro-table {
      font-size: 14px;
      color: #606266;
    }

    /* 搜索区域 */
    .lyt-pro-table__search {
      padding: 16px 16px 0;
      background-color: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .lyt-pro-table__search-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .lyt-pro-table__search-form--collapsed {
      max-height: 40px;
      overflow: hidden;
    }
    .lyt-pro-table__search-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lyt-pro-table__search-label {
      font-weight: 500;
      color: #303133;
      white-space: nowrap;
    }
    .lyt-pro-table__search-input {
      padding: 6px 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
      min-width: 180px;
    }
    .lyt-pro-table__search-input:focus {
      border-color: #409eff;
    }
    .lyt-pro-table__search-actions {
      display: flex;
      gap: 8px;
      padding: 12px 0 0;
    }

    /* 按钮 */
    .lyt-pro-table__btn {
      padding: 6px 16px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      background-color: #fff;
      color: #606266;
    }
    .lyt-pro-table__btn:hover {
      color: #409eff;
      border-color: #c6e2ff;
      background-color: #ecf5ff;
    }
    .lyt-pro-table__btn--primary {
      background-color: #409eff;
      border-color: #409eff;
      color: #fff;
    }
    .lyt-pro-table__btn--primary:hover {
      background-color: #66b1ff;
      border-color: #66b1ff;
      color: #fff;
    }
    .lyt-pro-table__btn--link {
      border: none;
      background: none;
      color: #409eff;
      padding: 6px 8px;
    }
    .lyt-pro-table__btn--link:hover {
      color: #66b1ff;
      background: none;
      border: none;
    }

    /* 工具栏 */
    .lyt-pro-table__toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .lyt-pro-table__toolbar-right {
      display: flex;
      gap: 8px;
    }
    .lyt-pro-table__toolbar-btn {
      padding: 6px 10px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      font-size: 14px;
      color: #606266;
    }
    .lyt-pro-table__toolbar-btn:hover {
      color: #409eff;
      border-color: #c6e2ff;
    }

    /* 表格 */
    .lyt-pro-table__table-wrapper {
      position: relative;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      overflow: hidden;
    }
    .lyt-pro-table__loading {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.7);
      z-index: 10;
      color: #409eff;
    }
    .lyt-pro-table__table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .lyt-pro-table__table--small { font-size: 12px; }
    .lyt-pro-table__table--large { font-size: 16px; }
    .lyt-pro-table__table--bordered { border: none; }
    .lyt-pro-table__table--bordered th,
    .lyt-pro-table__table--bordered td {
      border: 1px solid #e4e7ed;
    }
    .lyt-pro-table__table--striped tr:nth-child(even) {
      background-color: #fafafa;
    }
    .lyt-pro-table__th {
      padding: 12px 16px;
      background-color: #f5f7fa;
      color: #909399;
      font-weight: 600;
      text-align: left;
      border-bottom: 2px solid #e4e7ed;
      white-space: nowrap;
      user-select: none;
    }
    .lyt-pro-table__table--small .lyt-pro-table__th { padding: 8px 12px; }
    .lyt-pro-table__table--large .lyt-pro-table__th { padding: 16px 20px; }
    .lyt-pro-table__th--sortable { cursor: pointer; }
    .lyt-pro-table__th--sortable:hover { background-color: #ebeef5; }
    .lyt-pro-table__th--sorted { color: #409eff; }
    .lyt-pro-table__sort-icon { font-size: 12px; margin-left: 4px; }
    .lyt-pro-table__td {
      padding: 12px 16px;
      border-bottom: 1px solid #e4e7ed;
    }
    .lyt-pro-table__table--small .lyt-pro-table__td { padding: 8px 12px; }
    .lyt-pro-table__table--large .lyt-pro-table__td { padding: 16px 20px; }
    .lyt-pro-table__row:hover .lyt-pro-table__td {
      background-color: #f5f7fa;
    }
    .lyt-pro-table__empty {
      text-align: center;
      padding: 40px 16px;
      color: #909399;
    }

    /* 分页 */
    .lyt-pro-table__pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      margin-top: 12px;
    }
    .lyt-pro-table__pagination-info {
      font-size: 13px;
      color: #909399;
    }
    .lyt-pro-table__pagination-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .lyt-pro-table__pagination-size {
      padding: 4px 8px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 13px;
      margin-right: 12px;
      outline: none;
    }
    .lyt-pro-table__pagination-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      font-size: 13px;
      color: #606266;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-pro-table__pagination-btn:hover:not(:disabled) {
      color: #409eff;
    }
    .lyt-pro-table__pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-pro-table__pagination-current {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      font-size: 13px;
      color: #409eff;
      font-weight: 600;
    }
  `,
})
