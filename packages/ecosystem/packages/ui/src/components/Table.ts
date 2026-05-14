/**
 * @lytjs/ui - Table 组件
 *
 * 表格组件，支持排序、斑马纹、边框、固定列、选择等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { TableData, TableRowData, TableColumn, TableSortOrder, TableAlign } from './types';

export interface TableSetupProps {
  data: TableData;
  columns: TableColumn[];
  stripe: boolean;
  border: boolean;
  rowKey: string;
  showSelection: boolean;
  highlightCurrentRow: boolean;
  class: string;
  onRowClick: ((row: TableRowData, index: number) => void) | undefined;
  onSortChange: ((column: TableColumn, prop: string, order: TableSortOrder) => void) | undefined;
  onSelectionChange: ((rows: TableData) => void) | undefined;
}

export interface TableSlots {
  default?: () => VNode[];
  empty?: () => VNode[];
}

export const Table = defineComponent({
  name: 'LytTable',

  props: {
    data: { type: Array, default: (): TableData => [] },
    columns: { type: Array, default: (): TableColumn[] => [] },
    stripe: { type: Boolean, default: false },
    border: { type: Boolean, default: false },
    rowKey: { type: String, default: 'id' },
    showSelection: { type: Boolean, default: false },
    highlightCurrentRow: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onRowClick: { type: Function, default: undefined },
    onSortChange: { type: Function, default: undefined },
    onSelectionChange: { type: Function, default: undefined },
  },

  setup(props: TableSetupProps) {
    const sortColumn = signal('');
    const sortOrder = signal<TableSortOrder>('');
    const selectedRows = signal<Set<TableRowData>>(new Set());
    const currentRow = signal<TableRowData | null>(null);
    const allSelected = signal(false);

    const handleSort = (column: TableColumn) => {
      if (!column.sortable || !column.prop) return;

      let newOrder: TableSortOrder;
      if (sortColumn() === column.prop) {
        if (sortOrder() === 'ascending') {
          newOrder = 'descending';
        } else if (sortOrder() === 'descending') {
          newOrder = '';
        } else {
          newOrder = 'ascending';
        }
      } else {
        newOrder = 'ascending';
      }

      sortColumn.set(column.prop);
      sortOrder.set(newOrder);
      props.onSortChange?.(column, column.prop, newOrder);
    };

    const handleRowSelect = (row: TableRowData, checked: boolean) => {
      const newSelected = new Set(selectedRows());
      if (checked) {
        newSelected.add(row);
      } else {
        newSelected.delete(row);
      }
      selectedRows.set(newSelected);
      
      const data = props.data || [];
      allSelected.set(newSelected.size === data.length);
      
      props.onSelectionChange?.(Array.from(newSelected));
    };

    const handleSelectAll = (checked: boolean) => {
      allSelected.set(checked);
      const data = props.data || [];
      
      if (checked) {
        selectedRows.set(new Set(data));
        props.onSelectionChange?.([...data]);
      } else {
        selectedRows.set(new Set());
        props.onSelectionChange?.([]);
      }
    };

    const handleRowClick = (row: TableRowData, index: number) => {
      if (props.highlightCurrentRow) {
        currentRow.set(row);
      }
      props.onRowClick?.(row, index);
    };

    const getCellValue = (row: TableRowData, column: TableColumn): unknown => {
      if (!column.prop) return '';
      return row[column.prop];
    };

    const getRowKey = (row: TableRowData, index: number): string => {
      if (props.rowKey && row[props.rowKey]) {
        return String(row[props.rowKey]);
      }
      return String(index);
    };

    return () => {
      const data = props.data || [];
      const columns = props.columns || [];
      
      const tableClass = ['lyt-table'];
      if (props.stripe) tableClass.push('lyt-table--stripe');
      if (props.border) tableClass.push('lyt-table--border');
      if (props.class) tableClass.push(props.class);

      const children: VNode[] = [];

      const thead = createVNode('thead', { class: 'lyt-table__header' }, [
        createVNode('tr', {}, [
          ...(props.showSelection ? [
            createVNode('th', { class: 'lyt-table__cell--selection' }, [
              createVNode('input', {
                type: 'checkbox',
                checked: allSelected(),
                onChange: (e: Event) => handleSelectAll((e.target as HTMLInputElement).checked),
              }),
            ]),
          ] : []),
          ...columns.map((column: TableColumn) => 
            createVNode('th', {
              class: [
                'lyt-table__cell',
                column.sortable ? 'lyt-table__cell--sortable' : '',
                column.align ? `lyt-table__cell--${column.align}` : '',
              ].filter(Boolean).join(' '),
              onClick: () => handleSort(column),
            }, [column.label])
          ),
        ]),
      ]);

      const tbody = createVNode('tbody', { class: 'lyt-table__body' }, 
        data.length === 0 
          ? [
              createVNode('tr', { class: 'lyt-table__empty-row' }, [
                createVNode('td', {
                  colspan: columns.length + (props.showSelection ? 1 : 0),
                  class: 'lyt-table__empty-cell',
                }, ['暂无数据']),
              ]),
            ]
          : data.map((row: TableRowData, index: number) => 
              createVNode('tr', {
                key: getRowKey(row, index),
                class: [
                  'lyt-table__row',
                  currentRow() === row ? 'lyt-table__row--active' : '',
                ].filter(Boolean).join(' '),
                onClick: () => handleRowClick(row, index),
              }, [
                ...(props.showSelection ? [
                  createVNode('td', { class: 'lyt-table__cell--selection' }, [
                    createVNode('input', {
                      type: 'checkbox',
                      checked: selectedRows().has(row),
                      onChange: (e: Event) => handleRowSelect(row, (e.target as HTMLInputElement).checked),
                    }),
                  ]),
                ] : []),
                ...columns.map((column: TableColumn) => {
                  const value = getCellValue(row, column);
                  const displayValue = column.formatter 
                    ? column.formatter(row, column, value)
                    : String(value ?? '');
                  
                  return createVNode('td', {
                    class: [
                      'lyt-table__cell',
                      column.align ? `lyt-table__cell--${column.align}` : '',
                    ].filter(Boolean).join(' '),
                  }, [displayValue]);
                }),
              ])
            )
      );

      children.push(thead, tbody);

      return createVNode('table', { class: tableClass.join(' ') }, children);
    };
  },
});

export type { TableProps, TableSlots, TableColumn, TableData, TableRowData } from './types';
