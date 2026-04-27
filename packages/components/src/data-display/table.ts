/**
 * Table 表格
 * Props: columns(数组 [{key,title,width,align,sortable}]), data(数组), bordered, striped, hoverable, size
 * Events: sort, rowClick
 * Features: 排序, 斑马纹, 悬浮高亮
 */

import { defineComponent } from '@lytjs/component';
import { reactive } from '@lytjs/reactivity';

export const Table = defineComponent({
  name: 'LytTable',

  props: {
    columns: {
      type: Array as () => Array<{
        key: string
        title: string
        width?: string
        align?: 'left' | 'center' | 'right'
        sortable?: boolean
      }>,
      default: () => [],
    },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: Array as () => Array<Record<string, any>>,
      default: () => [],
    },
    bordered: {
      type: Boolean,
      default: false,
    },
    striped: {
      type: Boolean,
      default: false,
    },
    hoverable: {
      type: Boolean,
      default: true,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      sortKey: '',
      sortOrder: '' as '' | 'asc' | 'desc',
    });

    const handleSort = (column: { key: string; sortable?: boolean }) => {
      if (!column.sortable) return;

      if (state.sortKey === column.key) {
        if (state.sortOrder === 'asc') state.sortOrder = 'desc';
        else if (state.sortOrder === 'desc') state.sortOrder = '';
        else state.sortOrder = 'asc';
      } else {
        state.sortKey = column.key;
        state.sortOrder = 'asc';
      }

      emit('sort', { key: state.sortKey, order: state.sortOrder });
    };

    const sortedData = () => {
      if (!state.sortKey || !state.sortOrder) return props.data;

      const sorted = [...props.data].sort((a, b) => {
        const aVal = a[state.sortKey];
        const bVal = b[state.sortKey];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        return aStr.localeCompare(bStr);
      });

      if (state.sortOrder === 'desc') sorted.reverse();
      return sorted;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCellValue = (row: Record<string, any>, key: string) => {
      return row[key] !== undefined ? row[key] : '';
    };

    const getSortIcon = (column: { key: string; sortable?: boolean }) => {
      if (!column.sortable) return '';
      if (state.sortKey !== column.key) return '&#8693;';
      if (state.sortOrder === 'asc') return '&#8593;';
      if (state.sortOrder === 'desc') return '&#8595;';
      return '&#8693;';
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRowClick = (row: Record<string, any>, index: number) => {
      emit('rowClick', { row, index });
    };

    return { state, handleSort, sortedData, getCellValue, getSortIcon, handleRowClick, slots };
  },

  template: `
    <div class="lyt-table-wrapper {bordered ? 'lyt-table-wrapper--bordered' : ''} lyt-table-wrapper--{size}">
      <table class="lyt-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              class="lyt-table__th {col.sortable ? 'lyt-table__th--sortable' : ''} {state.sortKey === col.key ? 'lyt-table__th--sorted' : ''}"
              :style="{ width: col.width, textAlign: col.align || 'left' }"
              @click="handleSort(col)"
            >
              <span class="lyt-table__th-content">
                {{ col.title }}
                <span class="lyt-table__sort-icon" v-if="col.sortable" v-html="getSortIcon(col)"></span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in sortedData()"
            class="lyt-table__row {striped && rowIndex % 2 === 1 ? 'lyt-table__row--striped' : ''}"
            @click="handleRowClick(row, rowIndex)"
          >
            <td
              v-for="col in columns"
              class="lyt-table__td"
              :style="{ textAlign: col.align || 'left' }"
            >
              <slot :name="'cell-' + col.key" :row="row" :value="getCellValue(row, col.key)" :index="rowIndex">
                {{ getCellValue(row, col.key) }}
              </slot>
            </td>
          </tr>
          <tr v-if="data.length === 0">
            <td class="lyt-table__empty" :colspan="columns.length">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,

  styles: `
    .lyt-table-wrapper {
      width: 100%;
      overflow-x: auto;
      box-sizing: border-box;
    }
    .lyt-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
    .lyt-table-wrapper--small .lyt-table { font-size: var(--lyt-font-size-sm); }
    .lyt-table-wrapper--large .lyt-table { font-size: var(--lyt-font-size-lg); }
    .lyt-table__th {
      padding: 12px 16px;
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-info);
      font-weight: 600;
      text-align: left;
      border-bottom: 1px solid var(--lyt-color-border);
      white-space: nowrap;
      user-select: none;
    }
    .lyt-table-wrapper--small .lyt-table__th { padding: 8px 12px; }
    .lyt-table-wrapper--large .lyt-table__th { padding: 16px 20px; }
    .lyt-table__th--sortable { cursor: pointer; }
    .lyt-table__th--sortable:hover { background-color: var(--lyt-color-bg); opacity: 0.85; }
    .lyt-table__th--sorted { color: var(--lyt-color-primary); }
    .lyt-table__th-content { display: inline-flex; align-items: center; gap: 4px; }
    .lyt-table__sort-icon { font-size: var(--lyt-font-size-sm); }
    .lyt-table__td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--lyt-color-border);
      transition: background-color 0.3s;
    }
    .lyt-table-wrapper--small .lyt-table__td { padding: 8px 12px; }
    .lyt-table-wrapper--large .lyt-table__td { padding: 16px 20px; }
    .lyt-table__row:hover .lyt-table__td { background-color: var(--lyt-color-bg); opacity: 0.85; }
    .lyt-table__row--striped .lyt-table__td { background-color: var(--lyt-color-bg); opacity: 0.7; }
    .lyt-table__row--striped:hover .lyt-table__td { background-color: var(--lyt-color-bg); opacity: 0.85; }
    .lyt-table__empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--lyt-color-info);
    }
    .lyt-table-wrapper--bordered .lyt-table__th,
    .lyt-table-wrapper--bordered .lyt-table__td {
      border: 1px solid var(--lyt-color-border);
    }
    .lyt-table-wrapper--bordered .lyt-table { border: 1px solid var(--lyt-color-border); }
  `,
});
