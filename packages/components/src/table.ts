/**
 * DataTable 数据表格
 * Props: columns, data, striped, hoverable, bordered, loading, emptyText, rowKey
 * Events: sort, rowClick, pageChange
 * Features: 列定义, 排序, 斑马纹, 悬浮高亮, 空状态, 加载状态
 */

import { defineComponent } from '@lytjs/component'

export interface DataTableColumn {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  fixed?: 'left' | 'right'
  ellipsis?: boolean
  render?: (value: any, row: Record<string, any>, index: number) => string
}

export const DataTable = defineComponent({
  name: 'LytDataTable',

  props: {
    columns: {
      type: Array as () => DataTableColumn[],
      default: () => [],
    },
    data: {
      type: Array as () => Array<Record<string, any>>,
      default: () => [],
    },
    striped: {
      type: Boolean,
      default: false,
    },
    hoverable: {
      type: Boolean,
      default: true,
    },
    bordered: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    emptyText: {
      type: String,
      default: '暂无数据',
    },
    rowKey: {
      type: String,
      default: 'id',
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    maxHeight: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      sortKey: '' as string,
      sortOrder: '' as '' | 'asc' | 'desc',
    })

    /** 排序处理 */
    const handleSort = (column: DataTableColumn) => {
      if (!column.sortable) return

      if (state.sortKey === column.key) {
        if (state.sortOrder === 'asc') state.sortOrder = 'desc'
        else if (state.sortOrder === 'desc') state.sortOrder = ''
        else state.sortOrder = 'asc'
      } else {
        state.sortKey = column.key
        state.sortOrder = 'asc'
      }

      emit('sort', { key: state.sortKey, order: state.sortOrder })
    }

    /** 排序后的数据 */
    const sortedData = () => {
      if (!state.sortKey || !state.sortOrder) return props.data

      const sorted = [...props.data].sort((a, b) => {
        const aVal = a[state.sortKey]
        const bVal = b[state.sortKey]

        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal
        }

        return String(aVal).localeCompare(String(bVal))
      })

      if (state.sortOrder === 'desc') sorted.reverse()
      return sorted
    }

    /** 获取单元格值 */
    const getCellValue = (row: Record<string, any>, column: DataTableColumn, index: number) => {
      const value = row[column.key]
      if (column.render) return column.render(value, row, index)
      return value !== undefined ? value : ''
    }

    /** 排序图标 */
    const getSortIcon = (column: DataTableColumn) => {
      if (!column.sortable) return ''
      if (state.sortKey !== column.key) return '&#8693;'
      if (state.sortOrder === 'asc') return '&#8593;'
      if (state.sortOrder === 'desc') return '&#8595;'
      return '&#8693;'
    }

    /** 行点击 */
    const handleRowClick = (row: Record<string, any>, index: number) => {
      emit('rowClick', { row, index })
    }

    /** 表格容器样式 */
    const wrapperStyle = () => {
      const style: Record<string, string> = {}
      if (props.maxHeight) {
        style.maxHeight = props.maxHeight
        style.overflowY = 'auto'
      }
      return style
    }

    return {
      state, handleSort, sortedData, getCellValue,
      getSortIcon, handleRowClick, wrapperStyle, slots,
    }
  },

  template: `
    <div
      class="lyt-data-table {bordered ? 'lyt-data-table--bordered' : ''} lyt-data-table--{size} {loading ? 'lyt-data-table--loading' : ''}"
      :style="wrapperStyle()"
    >
      <div class="lyt-data-table__loading-mask" v-if="loading">
        <span class="lyt-data-table__loading-text">加载中...</span>
      </div>
      <table class="lyt-data-table__table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              class="lyt-data-table__th {col.sortable ? 'lyt-data-table__th--sortable' : ''} {state.sortKey === col.key ? 'lyt-data-table__th--sorted' : ''}"
              :style="{ width: col.width, textAlign: col.align || 'left' }"
              @click="handleSort(col)"
            >
              <span class="lyt-data-table__th-content">
                {{ col.title }}
                <span class="lyt-data-table__sort-icon" v-if="col.sortable" v-html="getSortIcon(col)"></span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in sortedData()"
            :key="row[rowKey] || rowIndex"
            class="lyt-data-table__row {striped && rowIndex % 2 === 1 ? 'lyt-data-table__row--striped' : ''}"
            @click="handleRowClick(row, rowIndex)"
          >
            <td
              v-for="col in columns"
              class="lyt-data-table__td {col.ellipsis ? 'lyt-data-table__td--ellipsis' : ''}"
              :style="{ textAlign: col.align || 'left' }"
              :title="col.ellipsis ? getCellValue(row, col, rowIndex) : ''"
            >
              <slot :name="'cell-' + col.key" :row="row" :value="getCellValue(row, col, rowIndex)" :index="rowIndex">
                {{ getCellValue(row, col, rowIndex) }}
              </slot>
            </td>
          </tr>
          <tr v-if="data.length === 0 && !loading">
            <td class="lyt-data-table__empty" :colspan="columns.length">
              <slot name="empty">{{ emptyText }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,

  styles: `
    .lyt-data-table {
      width: 100%;
      overflow-x: auto;
      box-sizing: border-box;
      position: relative;
    }
    .lyt-data-table__table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      font-size: 14px;
      color: #606266;
    }
    .lyt-data-table--small .lyt-data-table__table { font-size: 12px; }
    .lyt-data-table--large .lyt-data-table__table { font-size: 16px; }
    .lyt-data-table__th {
      padding: 12px 16px;
      background-color: #f5f7fa;
      color: #909399;
      font-weight: 600;
      text-align: left;
      border-bottom: 2px solid #e4e7ed;
      white-space: nowrap;
      user-select: none;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .lyt-data-table--small .lyt-data-table__th { padding: 8px 12px; }
    .lyt-data-table--large .lyt-data-table__th { padding: 16px 20px; }
    .lyt-data-table__th--sortable { cursor: pointer; }
    .lyt-data-table__th--sortable:hover { background-color: #ebeef5; }
    .lyt-data-table__th--sorted { color: #409eff; }
    .lyt-data-table__th-content { display: inline-flex; align-items: center; gap: 4px; }
    .lyt-data-table__sort-icon { font-size: 12px; }
    .lyt-data-table__td {
      padding: 12px 16px;
      border-bottom: 1px solid #e4e7ed;
      transition: background-color 0.2s;
    }
    .lyt-data-table--small .lyt-data-table__td { padding: 8px 12px; }
    .lyt-data-table--large .lyt-data-table__td { padding: 16px 20px; }
    .lyt-data-table__td--ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
    .lyt-data-table__row:hover .lyt-data-table__td { background-color: #f5f7fa; }
    .lyt-data-table__row--striped .lyt-data-table__td { background-color: #fafafa; }
    .lyt-data-table__row--striped:hover .lyt-data-table__td { background-color: #f5f7fa; }
    .lyt-data-table__empty {
      text-align: center;
      padding: 40px 16px;
      color: #909399;
      font-size: 14px;
    }
    .lyt-data-table--bordered .lyt-data-table__th,
    .lyt-data-table--bordered .lyt-data-table__td {
      border: 1px solid #e4e7ed;
    }
    .lyt-data-table--bordered .lyt-data-table__table { border: 1px solid #e4e7ed; }
    .lyt-data-table--loading { opacity: 0.6; pointer-events: none; }
    .lyt-data-table__loading-mask {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.7);
      z-index: 10;
    }
    .lyt-data-table__loading-text { color: #409eff; font-size: 14px; }
  `,
})
