/**
 * @lytjs/ui - Table 组件
 *
 * 表格组件，支持排序、斑马纹、边框、固定列、选择等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { TableData, TableRowData, TableColumn, TableSortOrder, TableSetupProps } from './types';
import { getButtonA11yProps, getInputControlA11yProps, getGroupA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
export type { TableSlots } from './types';

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
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onRowClick: { type: Function, default: undefined },
    onSortChange: { type: Function, default: undefined },
    onSelectionChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as TableSetupProps;
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
      p.onSortChange?.(column, column.prop, newOrder);
    };

    const handleRowSelect = (row: TableRowData, checked: boolean) => {
      const newSelected = new Set(selectedRows());
      if (checked) {
        newSelected.add(row);
      } else {
        newSelected.delete(row);
      }
      selectedRows.set(newSelected);
      
      const data = p.data || [];
      allSelected.set(newSelected.size === data.length);
      
      p.onSelectionChange?.(Array.from(newSelected));
    };

    const handleSelectAll = (checked: boolean) => {
      allSelected.set(checked);
      const data = p.data || [];
      
      if (checked) {
        selectedRows.set(new Set(data));
        p.onSelectionChange?.([...data]);
      } else {
        selectedRows.set(new Set());
        p.onSelectionChange?.([]);
      }
    };

    const handleRowClick = (row: TableRowData, index: number) => {
      if (p.highlightCurrentRow) {
        currentRow.set(row);
      }
      p.onRowClick?.(row, index);
    };

    const getCellValue = (row: TableRowData, column: TableColumn): unknown => {
      if (!column.prop) return '';
      return row[column.prop];
    };

    const getRowKey = (row: TableRowData, index: number): string => {
      if (p.rowKey && row[p.rowKey]) {
        return String(row[p.rowKey]);
      }
      return String(index);
    };

    return () => {
      const data = p.data || [];
      const columns = p.columns || [];
      
      const tableClass = ['lyt-table'];
      if (p.stripe) tableClass.push('lyt-table--stripe');
      if (p.border) tableClass.push('lyt-table--border');
      if (p.class) tableClass.push(p.class);

      const children: VNode[] = [];

      const thead = createVNode('thead', { class: 'lyt-table__header' }, [
        createVNode('tr', {}, [
          ...(p.showSelection ? [
            createVNode('th', { class: 'lyt-table__cell--selection' }, [
              createVNode('input', mergeA11yProps(getInputControlA11yProps({ ariaLabel: '全选' }), {
                type: 'checkbox',
                checked: allSelected(),
                onChange: (e: Event) => handleSelectAll((e.target as HTMLInputElement).checked),
              })),
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
            }, [createVNode('span', {}, String(column.label))])
          ),
        ]),
      ]);

      const tbody = createVNode('tbody', { class: 'lyt-table__body' }, 
        data.length === 0 
          ? [
              createVNode('tr', { class: 'lyt-table__empty-row' }, [
                createVNode('td', {
                  colspan: columns.length + (p.showSelection ? 1 : 0),
                  class: 'lyt-table__empty-cell',
                }, [createVNode('span', {}, '暂无数据')]),
              ]),
            ]
          : data.map((row: TableRowData, index: number) => {
              const rowChildren: VNode[] = [];
              
              if (p.showSelection) {
                rowChildren.push(
                  createVNode('td', { class: 'lyt-table__cell--selection' }, [
                    createVNode('input', mergeA11yProps(getInputControlA11yProps({ ariaLabel: '选择行' }), {
                      type: 'checkbox',
                      checked: selectedRows().has(row),
                      onChange: (e: Event) => handleRowSelect(row, (e.target as HTMLInputElement).checked),
                    })),
                  ])
                );
              }
              
              columns.forEach((column: TableColumn) => {
                const value = getCellValue(row, column);
                const displayValue = column.formatter 
                  ? column.formatter(row, column, value)
                  : String(value ?? '');
                
                rowChildren.push(
                  createVNode('td', {
                    class: [
                      'lyt-table__cell',
                      column.align ? `lyt-table__cell--${column.align}` : '',
                    ].filter(Boolean).join(' '),
                  }, [createVNode('span', {}, displayValue)])
                );
              });
              
              return createVNode('tr', {
                key: getRowKey(row, index),
                class: [
                  'lyt-table__row',
                  currentRow() === row ? 'lyt-table__row--active' : '',
                ].filter(Boolean).join(' '),
                onClick: () => handleRowClick(row, index),
              }, rowChildren);
            })
      );

      children.push(thead, tbody);

      return createVNode('table', mergeA11yProps({
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
        role: 'grid',
      }, { class: tableClass.join(' ') }), children);
    };
  },
});
