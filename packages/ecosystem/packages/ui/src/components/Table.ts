/**
 * @lytjs/ui - Table 组件
 *
 * 表格组件，支持排序、斑马纹、边框等功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Table 组件
 */
export const Table = defineComponent({
  name: 'LytTable',

  props: {
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    stripe: { type: Boolean, default: false },
    border: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onRowClick: { type: Function, default: undefined },
    onSortChange: { type: Function, default: undefined },
  },

  setup(props: any, { slots }: any) {
    const sortColumn = signal('');
    const sortOrder = signal<'ascending' | 'descending' | ''>('');

    // 处理排序
    const handleSort = (column: any) => {
      if (!column.sortable || !column.prop) return;

      let newOrder: 'ascending' | 'descending' | '';
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

    // 生成类名
    const getTableClass = () => {
      const classes = ['lyt-table'];
      if (props.stripe) classes.push('lyt-table--stripe');
      if (props.border) classes.push('lyt-table--border');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const data = props.data || [];
      const columns = props.columns || [];

      // 表头
      const headerCells: any[] = columns.map((column: any) => {
        const children: any[] = [column.label];
        if (column.sortable && column.prop === sortColumn()) {
          children.push(createVNode('span', { class: 'lyt-table__sort-icon' }, sortOrder() === 'ascending' ? '▲' : '▼'));
        }
        return createVNode(
          'th',
          {
            class: `lyt-table__cell lyt-table__header-cell ${column.sortable ? 'lyt-table__cell--sortable' : ''}`,
            onClick: () => handleSort(column),
          },
          children
        );
      });

      // 表体
      const bodyRows: any[] = data.map((row: any, index: number) => {
        const cells: any[] = columns.map((column: any) => {
          const keys = column.prop ? column.prop.split('.') : [];
          let value = row;
          for (const key of keys) {
            value = value?.[key];
          }
          const displayValue = value !== undefined && value !== null ? String(value) : '';
          return createVNode(
            'td',
            {
              class: 'lyt-table__cell',
              style: column.align ? `text-align: ${column.align};` : '',
            },
            displayValue
          );
        });
        
        return createVNode(
          'tr',
          {
            class: `lyt-table__row ${props.stripe && index % 2 === 1 ? 'lyt-table__row--stripe' : ''}`,
            onClick: () => props.onRowClick?.(row, index),
          },
          cells
        );
      });

      const tableChildren: any[] = [
        createVNode('thead', { class: 'lyt-table__header' }, [createVNode('tr', {}, headerCells)]),
        createVNode('tbody', { class: 'lyt-table__body' }, bodyRows),
      ];
      
      const wrapperChildren: any[] = [
        createVNode('table', { class: getTableClass() }, tableChildren),
      ];
      
      if (data.length === 0 && slots.empty) {
        wrapperChildren.push(createVNode('div', { class: 'lyt-table__empty' }, slots.empty()));
      }
      
      return createVNode('div', { class: 'lyt-table__wrapper' }, wrapperChildren);
    };
  },
});

export default Table;
