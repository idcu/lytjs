/**
 * DataTable 数据表格
 * Props: columns, data, striped, hoverable, bordered, loading, emptyText, rowKey, scrollX, scrollY,
 *        virtualScroll, rowHeight, buffer
 * Events: sort, rowClick, pageChange
 * Features: 列定义, 排序, 斑马纹, 悬浮高亮, 空状态, 加载状态, 列固定, 水平/垂直滚动, 虚拟滚动
 */

import { defineComponent } from '@lytjs/component'
import { reactive, computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from '@lytjs/reactivity'

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

/** 树形数据配置 */
export interface TreeProps {
  /** 子节点字段名 */
  children?: string
  /** 是否有子节点字段名 */
  hasChildren?: string
  /** 是否为叶子节点字段名 */
  isLeaf?: string
}

/** CSV 导出选项 */
export interface ExportCsvOptions {
  /** 文件名（不含扩展名） */
  filename?: string
  /** 要导出的列 key 列表（为空则导出所有列） */
  columns?: string[]
  /** 列标题映射（key -> title） */
  columnTitles?: Record<string, string>
  /** 是否包含表头 */
  header?: boolean
  /** 分隔符 */
  separator?: string
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
    scrollX: {
      type: [String, Number],
      default: '',
    },
    scrollY: {
      type: [String, Number],
      default: '',
    },
    /** 是否启用虚拟滚动 */
    virtualScroll: {
      type: Boolean,
      default: false,
    },
    /** 虚拟滚动行高估算（像素） */
    rowHeight: {
      type: Number,
      default: 40,
    },
    /** 虚拟滚动缓冲区行数 */
    buffer: {
      type: Number,
      default: 5,
    },
    /** 树形数据配置 */
    treeProps: {
      type: Object as () => TreeProps | null,
      default: null,
    },
    /** 是否默认展开所有行 */
    defaultExpandAll: {
      type: Boolean,
      default: false,
    },
    /** 受控展开行 key 列表 */
    expandRowKeys: {
      type: Array as () => Array<string | number>,
      default: () => [],
    },
    /** 树形缩进（像素） */
    indent: {
      type: Number,
      default: 20,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      sortKey: '' as string,
      sortOrder: '' as '' | 'asc' | 'desc',
    })

    // ---- 树形数据状态 ----
    const treeState = reactive({
      expandedKeys: new Set<string | number>(),
    })

    /** 初始化树形展开状态 */
    const initTreeExpand = () => {
      if (!props.treeProps) return
      if (props.defaultExpandAll) {
        treeState.expandedKeys.clear()
        const collectKeys = (rows: Array<Record<string, any>>) => {
          const childrenKey = props.treeProps?.children || 'children'
          for (const row of rows) {
            const key = row[props.rowKey]
            if (key !== undefined) {
              treeState.expandedKeys.add(key)
            }
            if (row[childrenKey] && row[childrenKey].length > 0) {
              collectKeys(row[childrenKey])
            }
          }
        }
        collectKeys(props.data)
      } else if (props.expandRowKeys.length > 0) {
        treeState.expandedKeys = new Set(props.expandRowKeys)
      }
    }

    /** 判断行是否展开 */
    const isRowExpanded = (row: Record<string, any>): boolean => {
      const key = row[props.rowKey]
      return treeState.expandedKeys.has(key)
    }

    /** 判断行是否有子节点 */
    const hasChildren = (row: Record<string, any>): boolean => {
      if (!props.treeProps) return false
      const childrenKey = props.treeProps.children || 'children'
      const hasChildrenKey = props.treeProps.hasChildren
      const isLeafKey = props.treeProps.isLeaf

      if (isLeafKey && row[isLeafKey] === true) return false
      if (hasChildrenKey && row[hasChildrenKey] === true) return true
      if (row[childrenKey] && Array.isArray(row[childrenKey]) && row[childrenKey].length > 0) return true
      return false
    }

    /** 切换行展开/折叠 */
    const toggleRowExpand = (row: Record<string, any>) => {
      const key = row[props.rowKey]
      if (treeState.expandedKeys.has(key)) {
        treeState.expandedKeys.delete(key)
      } else {
        treeState.expandedKeys.add(key)
      }
      emit('expand-change', {
        row,
        expanded: treeState.expandedKeys.has(key),
        expandedKeys: Array.from(treeState.expandedKeys),
      })
    }

    /** 获取行的层级 */
    const getRowLevel = (row: Record<string, any>, levelMap: Map<any, number>): number => {
      return levelMap.get(row[props.rowKey]) || 0
    }

    /** 将树形数据展平为列表（用于渲染） */
    const flattenTreeData = (
      rows: Array<Record<string, any>>,
      level: number = 0,
      result: Array<{ row: Record<string, any>; level: number }> = [],
      levelMap: Map<any, number> = new Map(),
    ): Array<{ row: Record<string, any>; level: number }> => {
      const childrenKey = props.treeProps?.children || 'children'

      for (const row of rows) {
        const key = row[props.rowKey]
        levelMap.set(key, level)
        result.push({ row, level })

        if (hasChildren(row) && isRowExpanded(row)) {
          const children = row[childrenKey] || []
          flattenTreeData(children, level + 1, result, levelMap)
        }
      }

      return result
    }

    /** 获取树形数据的扁平化行列表 */
    const getTreeFlattenedData = (): Array<{ row: Record<string, any>; level: number }> => {
      if (!props.treeProps) return props.data.map((row) => ({ row, level: 0 }))
      return flattenTreeData(props.data)
    }

    /** 获取行的缩进样式 */
    const getTreeIndentStyle = (level: number): Record<string, string> => {
      return {
        paddingLeft: `${level * props.indent}px`,
      }
    }

    /** 获取展开/折叠图标 */
    const getExpandIcon = (row: Record<string, any>): string => {
      if (!hasChildren(row)) return ''
      return isRowExpanded(row) ? '&#9660;' : '&#9654;'
    }

    /** 获取展开图标的 CSS class */
    const getExpandIconClass = (row: Record<string, any>): string => {
      if (!hasChildren(row)) return 'lyt-data-table__expand-icon--leaf'
      return isRowExpanded(row) ? 'lyt-data-table__expand-icon--expanded' : 'lyt-data-table__expand-icon--collapsed'
    }

    // 初始化树形展开
    watch(() => props.data, () => {
      initTreeExpand()
    }, { immediate: true })

    watch(() => props.expandRowKeys, (newKeys) => {
      if (newKeys && newKeys.length > 0) {
        treeState.expandedKeys = new Set(newKeys)
      }
    })

    // ---- CSV 导出 ----
    /**
     * 导出当前表格数据为 CSV
     *
     * @param options 导出选项
     */
    const exportCsv = (options?: ExportCsvOptions) => {
      const filename = options?.filename || 'export'
      const separator = options?.separator || ','
      const includeHeader = options?.header !== false
      const exportColumns = options?.columns || props.columns.map((c: DataTableColumn) => c.key)
      const columnTitles = options?.columnTitles || {}

      // 获取当前排序后的数据
      const data = sortedData()

      // 构建 CSV 行
      const csvRows: string[] = []

      // 表头
      if (includeHeader) {
        const headerRow = exportColumns.map((key) => {
          const title = columnTitles[key] || props.columns.find((c: DataTableColumn) => c.key === key)?.title || key
          return csvEscape(title, separator)
        })
        csvRows.push(headerRow.join(separator))
      }

      // 数据行
      for (const row of data) {
        const dataRow = exportColumns.map((key) => {
          const value = row[key]
          return csvEscape(value !== undefined && value !== null ? String(value) : '', separator)
        })
        csvRows.push(dataRow.join(separator))
      }

      // 添加 BOM 以支持中文
      const csvContent = '\uFEFF' + csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(url)

      emit('export', { filename: `${filename}.csv`, rowCount: data.length, columns: exportColumns })
    }

    /** CSV 字段转义 */
    const csvEscape = (value: string, separator: string): string => {
      if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    // ---- 虚拟滚动状态 ----
    const vsState = reactive({
      startIndex: 0,
      endIndex: 0,
      totalHeight: 0,
      offsetY: 0,
      scrollTop: 0,
    })
    const vsContainerRef = ref<HTMLElement | null>(null)
    let vsRafId: number | null = null

    /** 计算虚拟滚动的可见范围 */
    const computeVisibleRange = () => {
      const scrollTop = vsState.scrollTop
      const containerHeight = vsContainerRef.value
        ? vsContainerRef.value.clientHeight
        : 400

      const dataLen = sortedData().length
      if (dataLen === 0) {
        vsState.startIndex = 0
        vsState.endIndex = 0
        vsState.totalHeight = 0
        vsState.offsetY = 0
        return
      }

      const rh = props.rowHeight
      let startIdx = Math.floor(scrollTop / rh)
      let endIdx = Math.ceil((scrollTop + containerHeight) / rh)

      // 应用缓冲区
      startIdx = Math.max(0, startIdx - props.buffer)
      endIdx = Math.min(dataLen, endIdx + props.buffer)

      vsState.startIndex = startIdx
      vsState.endIndex = endIdx
      vsState.totalHeight = dataLen * rh
      vsState.offsetY = startIdx * rh
    }

    /** 虚拟滚动 - 当前可见行数据 */
    const visibleData = computed(() => {
      if (!props.virtualScroll) return sortedData()
      const data = sortedData()
      return data.slice(vsState.startIndex, vsState.endIndex)
    })

    /** 虚拟滚动 - 是否启用 */
    const isVirtualScroll = computed(() => {
      return props.virtualScroll && props.data.length > 0
    })

    /** 虚拟滚动 - 滚动事件处理 */
    const handleVirtualScroll = (e: Event) => {
      const target = e.target as HTMLElement
      vsState.scrollTop = target.scrollTop

      if (vsRafId !== null) return
      vsRafId = requestAnimationFrame(() => {
        vsRafId = null
        computeVisibleRange()
      })
    }

    /** 虚拟滚动 - 初始化 */
    const initVirtualScroll = () => {
      if (!isVirtualScroll.value) return
      nextTick(() => {
        computeVisibleRange()
      })
    }

    /** 监听数据变化重新计算 */
    watch(() => props.data, () => {
      if (isVirtualScroll.value) {
        computeVisibleRange()
      }
    })

    watch(() => props.virtualScroll, () => {
      if (isVirtualScroll.value) {
        initVirtualScroll()
      }
    })

    onMounted(() => {
      if (isVirtualScroll.value) {
        initVirtualScroll()
      }
    })

    onBeforeUnmount(() => {
      if (vsRafId !== null) {
        cancelAnimationFrame(vsRafId)
        vsRafId = null
      }
    })

    /** 是否有固定列 */
    const hasFixedColumns = computed(() => {
      return props.columns.some((col: DataTableColumn) => col.fixed)
    })

    /** 获取固定在左侧的列 */
    const leftFixedColumns = computed(() => {
      return props.columns.filter((col: DataTableColumn) => col.fixed === 'left')
    })

    /** 获取固定在右侧的列 */
    const rightFixedColumns = computed(() => {
      return props.columns.filter((col: DataTableColumn) => col.fixed === 'right')
    })

    /** 计算左侧固定列的累积偏移量 */
    const getLeftStickyOffset = (col: DataTableColumn): string => {
      let offset = 0
      for (const c of props.columns) {
        if (c.key === col.key) break
        if (c.fixed === 'left') {
          offset += parseColumnWidth(c)
        }
      }
      return `${offset}px`
    }

    /** 计算右侧固定列的累积偏移量 */
    const getRightStickyOffset = (col: DataTableColumn): string => {
      let offset = 0
      const reversed = [...props.columns].reverse()
      for (const c of reversed) {
        if (c.key === col.key) break
        if (c.fixed === 'right') {
          offset += parseColumnWidth(c)
        }
      }
      return `${offset}px`
    }

    /** 解析列宽度为像素数值 */
    const parseColumnWidth = (col: DataTableColumn): number => {
      if (!col.width) return 120
      const w = col.width
      if (typeof w === 'number') return w
      if (w.endsWith('px')) return parseInt(w, 10) || 120
      if (w.endsWith('%')) return 120 // 百分比宽度无法精确计算，使用默认值
      return parseInt(w, 10) || 120
    }

    /** 判断列是否为左侧最后一列固定 */
    const isLastLeftFixed = (col: DataTableColumn): boolean => {
      const leftCols = leftFixedColumns.value
      if (leftCols.length === 0) return false
      return leftCols[leftCols.length - 1].key === col.key
    }

    /** 判断列是否为右侧第一列固定 */
    const isFirstRightFixed = (col: DataTableColumn): boolean => {
      const rightCols = rightFixedColumns.value
      if (rightCols.length === 0) return false
      return rightCols[0].key === col.key
    }

    /** 获取列的单元格样式（包含固定列的 sticky 定位） */
    const getCellStyle = (col: DataTableColumn): Record<string, string> => {
      const style: Record<string, string> = {
        textAlign: col.align || 'left',
      }

      if (col.fixed === 'left') {
        style.position = 'sticky'
        style.left = getLeftStickyOffset(col)
        style.zIndex = '2'
      } else if (col.fixed === 'right') {
        style.position = 'sticky'
        style.right = getRightStickyOffset(col)
        style.zIndex = '2'
      }

      return style
    }

    /** 获取表头单元格样式 */
    const getHeaderStyle = (col: DataTableColumn): Record<string, string> => {
      const style: Record<string, string> = {
        width: col.width,
        textAlign: col.align || 'left',
      }

      if (col.fixed === 'left') {
        style.position = 'sticky'
        style.left = getLeftStickyOffset(col)
        style.zIndex = '4' // 表头固定列需要更高的 z-index
      } else if (col.fixed === 'right') {
        style.position = 'sticky'
        style.right = getRightStickyOffset(col)
        style.zIndex = '4'
      }

      return style
    }

    /** 获取列的 CSS class */
    const getColumnClass = (col: DataTableColumn): string => {
      const classes: string[] = []
      if (col.fixed === 'left') {
        classes.push('lyt-data-table__td--fixed-left')
        if (isLastLeftFixed(col)) {
          classes.push('lyt-data-table__td--fixed-left-last')
        }
      } else if (col.fixed === 'right') {
        classes.push('lyt-data-table__td--fixed-right')
        if (isFirstRightFixed(col)) {
          classes.push('lyt-data-table__td--fixed-right-first')
        }
      }
      if (col.ellipsis) {
        classes.push('lyt-data-table__td--ellipsis')
      }
      return classes.join(' ')
    }

    /** 获取表头列的 CSS class */
    const getHeaderClass = (col: DataTableColumn): string => {
      const classes: string[] = []
      if (col.sortable) classes.push('lyt-data-table__th--sortable')
      if (state.sortKey === col.key) classes.push('lyt-data-table__th--sorted')
      if (col.fixed === 'left') {
        classes.push('lyt-data-table__th--fixed-left')
        if (isLastLeftFixed(col)) {
          classes.push('lyt-data-table__th--fixed-left-last')
        }
      } else if (col.fixed === 'right') {
        classes.push('lyt-data-table__th--fixed-right')
        if (isFirstRightFixed(col)) {
          classes.push('lyt-data-table__th--fixed-right-first')
        }
      }
      return classes.join(' ')
    }

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

      // 排序后重新计算虚拟滚动范围
      if (isVirtualScroll.value) {
        computeVisibleRange()
      }
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
      const effectiveMaxHeight = props.scrollY || props.maxHeight
      if (effectiveMaxHeight) {
        style.maxHeight = typeof effectiveMaxHeight === 'number'
          ? `${effectiveMaxHeight}px`
          : effectiveMaxHeight
        style.overflowY = 'auto'
      }
      if (props.scrollX) {
        style.overflowX = 'auto'
      }
      return style
    }

    /** 表格样式 */
    const tableStyle = () => {
      const style: Record<string, string> = {}
      if (props.scrollX) {
        const width = typeof props.scrollX === 'number'
          ? `${props.scrollX}px`
          : props.scrollX
        style.minWidth = width
      }
      return style
    }

    /** 虚拟滚动 tbody 容器样式 */
    const vsTbodyStyle = () => {
      if (!isVirtualScroll.value) return {}
      return {
        position: 'relative' as const,
        display: 'block',
        overflow: 'hidden',
        height: `${vsState.totalHeight}px`,
      }
    }

    /** 虚拟滚动内容区域样式 */
    const vsContentStyle = () => {
      if (!isVirtualScroll.value) return {}
      return {
        transform: `translateY(${vsState.offsetY}px)`,
        display: 'block',
      }
    }

    /** 获取虚拟滚动中行的实际索引（用于 key 和事件） */
    const getVirtualRowIndex = (visibleIndex: number): number => {
      return vsState.startIndex + visibleIndex
    }

    return {
      state, handleSort, sortedData, getCellValue,
      getSortIcon, handleRowClick, wrapperStyle, tableStyle,
      slots, getCellStyle, getHeaderStyle, getColumnClass,
      getHeaderClass, hasFixedColumns,
      // 虚拟滚动
      isVirtualScroll, visibleData, vsState,
      vsContainerRef, handleVirtualScroll,
      vsTbodyStyle, vsContentStyle, getVirtualRowIndex,
      // 树形数据
      treeState, isRowExpanded, hasChildren, toggleRowExpand,
      getTreeFlattenedData, getTreeIndentStyle, getExpandIcon,
      getExpandIconClass, initTreeExpand,
      // CSV 导出
      exportCsv,
    }
  },

  template: `
    <div
      class="lyt-data-table {bordered ? 'lyt-data-table--bordered' : ''} lyt-data-table--{size} {loading ? 'lyt-data-table--loading' : ''} {hasFixedColumns ? 'lyt-data-table--has-fixed' : ''}"
      :style="wrapperStyle()"
      ref="vsContainerRef"
      @scroll="handleVirtualScroll"
    >
      <div class="lyt-data-table__loading-mask" v-if="loading">
        <span class="lyt-data-table__loading-text">加载中...</span>
      </div>
      <table class="lyt-data-table__table" :style="tableStyle()">
        <colgroup>
          <col
            v-for="col in columns"
            :key="'col-' + col.key"
            :style="{ width: col.width || undefined }"
          />
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              class="lyt-data-table__th {getHeaderClass(col)}"
              :style="getHeaderStyle(col)"
              @click="handleSort(col)"
            >
              <span class="lyt-data-table__th-content">
                {{ col.title }}
                <span class="lyt-data-table__sort-icon" v-if="col.sortable" v-html="getSortIcon(col)"></span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody v-if="!isVirtualScroll">
          <tr
            v-for="(row, rowIndex) in sortedData()"
            :key="row[rowKey] || rowIndex"
            class="lyt-data-table__row {striped && rowIndex % 2 === 1 ? 'lyt-data-table__row--striped' : ''}"
            @click="handleRowClick(row, rowIndex)"
          >
            <td
              v-for="col in columns"
              class="lyt-data-table__td {getColumnClass(col)}"
              :style="getCellStyle(col)"
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
        <tbody v-if="isVirtualScroll" :style="vsTbodyStyle()">
          <div :style="vsContentStyle()">
            <tr
              v-for="(row, visIdx) in visibleData"
              :key="row[rowKey] || getVirtualRowIndex(visIdx)"
              class="lyt-data-table__row {striped && getVirtualRowIndex(visIdx) % 2 === 1 ? 'lyt-data-table__row--striped' : ''}"
              @click="handleRowClick(row, getVirtualRowIndex(visIdx))"
            >
              <td
                v-for="col in columns"
                class="lyt-data-table__td {getColumnClass(col)}"
                :style="getCellStyle(col)"
                :title="col.ellipsis ? getCellValue(row, col, getVirtualRowIndex(visIdx)) : ''"
              >
                <slot :name="'cell-' + col.key" :row="row" :value="getCellValue(row, col, getVirtualRowIndex(visIdx))" :index="getVirtualRowIndex(visIdx)">
                  {{ getCellValue(row, col, getVirtualRowIndex(visIdx)) }}
                </slot>
              </td>
            </tr>
          </div>
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
      table-layout: fixed;
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

    /* 左侧固定列 - 表头 */
    .lyt-data-table__th--fixed-left {
      background-color: #f5f7fa;
    }
    .lyt-data-table__th--fixed-left-last {
      box-shadow: 2px 0 6px rgba(0, 0, 0, 0.08);
    }

    /* 右侧固定列 - 表头 */
    .lyt-data-table__th--fixed-right {
      background-color: #f5f7fa;
    }
    .lyt-data-table__th--fixed-right-first {
      box-shadow: -2px 0 6px rgba(0, 0, 0, 0.08);
    }

    .lyt-data-table__td {
      padding: 12px 16px;
      border-bottom: 1px solid #e4e7ed;
      transition: background-color 0.2s;
    }
    .lyt-data-table--small .lyt-data-table__td { padding: 8px 12px; }
    .lyt-data-table--large .lyt-data-table__td { padding: 16px 20px; }
    .lyt-data-table__td--ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

    /* 左侧固定列 - 单元格 */
    .lyt-data-table__td--fixed-left {
      background-color: #fff;
    }
    .lyt-data-table__td--fixed-left-last {
      box-shadow: 2px 0 6px rgba(0, 0, 0, 0.08);
    }

    /* 右侧固定列 - 单元格 */
    .lyt-data-table__td--fixed-right {
      background-color: #fff;
    }
    .lyt-data-table__td--fixed-right-first {
      box-shadow: -2px 0 6px rgba(0, 0, 0, 0.08);
    }

    /* 斑马纹行中固定列的背景色 */
    .lyt-data-table__row--striped .lyt-data-table__td--fixed-left {
      background-color: #fafafa;
    }
    .lyt-data-table__row--striped .lyt-data-table__td--fixed-right {
      background-color: #fafafa;
    }

    /* 悬浮行中固定列的背景色 */
    .lyt-data-table__row:hover .lyt-data-table__td {
      background-color: #f5f7fa;
    }
    .lyt-data-table__row:hover .lyt-data-table__td--fixed-left {
      background-color: #f5f7fa;
    }
    .lyt-data-table__row:hover .lyt-data-table__td--fixed-right {
      background-color: #f5f7fa;
    }

    .lyt-data-table__row--striped:hover .lyt-data-table__td { background-color: #f5f7fa; }
    .lyt-data-table__row--striped:hover .lyt-data-table__td--fixed-left { background-color: #f5f7fa; }
    .lyt-data-table__row--striped:hover .lyt-data-table__td--fixed-right { background-color: #f5f7fa; }

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

    /* 树形数据样式 */
    .lyt-data-table__tree-cell {
      display: flex;
      align-items: center;
    }
    .lyt-data-table__expand-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      cursor: pointer;
      font-size: 10px;
      color: #909399;
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .lyt-data-table__expand-icon:hover {
      color: #409eff;
    }
    .lyt-data-table__expand-icon--leaf {
      cursor: default;
      visibility: hidden;
    }
    .lyt-data-table__expand-icon--expanded {
      transform: rotate(0deg);
    }
    .lyt-data-table__expand-icon--collapsed {
      transform: rotate(0deg);
    }
    .lyt-data-table__tree-indent {
      flex-shrink: 0;
    }
  `,
})
