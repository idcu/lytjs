/**
 * @lytjs/ui - Table 组件
 *
 * 表格组件，支持排序、斑马纹、边框、固定列、选择等功能
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
    rowKey: { type: String, default: 'id' },
    showSelection: { type: Boolean, default: false },
    highlightCurrentRow: { type: Boolean, default: false },
    class: { type: String, default: '' },
    onRowClick: { type: Function, default: undefined },
    onSortChange: { type: Function, default: undefined },
    onSelectionChange: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const sortColumn = signal('');
    const sortOrder = signal<'ascending' | 'descending' | ''>('');
    const selectedRows = signal<Set<any>>(new Set());
    const currentRow = signal<any>(null);
    const allSelected = signal(false);

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

    // 处理行选择
    const handleRowSelect = (row: any, checked: boolean) => {
      const newSelected = new Set(selectedRows());
      if (checked) {
        newSelected.add(row);
      } else {
        newSelected.delete(row);
      }
      selectedRows.set(newSelected);
      
      // 更新全选状态
      const data = props.data || [];
      allSelected.set(newSelected.size === data.length);
      
      emit('selection-change', Array.from(newSelected));
      props.onSelectionChange?.(Array.from(newSelected));
    };

    // 处理全选
    const handleSelectAll = (checked: boolean) => {
      allSelected.set(checked);
      const data = props.data || [];
      
      if (checked) {
        selectedRows.set(new Set(data));
        emit('selection-change', [...data]);
        props.onSelectionChange?.([...data]);
      } else {
        selectedRows.set(new Set());
        emit('selection-change', []);
        props.onSelectionChange?.([]);
      }
    };

    // 处理行点击
    const handleRowClick = (row: any, index: number) => {
      if (props.highlightCurrentRow) {
        currentRow.set(row);
      }
      emit('row-click', row, index);
      props.onRowClick?.(row, index);
    };

    // 生成类名
    const getTableClass = () => {
      const classes = ['lyt-table'];
      if (props.stripe) classes.push('lyt-table--stripe');
      if (props.border) classes.push('lyt-table--border');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    // 生成行类名
    const getRowClass = (row: any, index: number) => {
      const classes = ['lyt-table__row'];
      if (props.stripe && index % 2 === 1) classes.push('lyt-table__row--stripe');
      if (currentRow() === row) classes.push('lyt-table__row--current');
      if (selectedRows().has(row)) classes.push('lyt-table__row--selected');
      return classes.join(' ');
    };

    // 生成单元格类名
    const getCellClass = (column: any) => {
      const classes = ['lyt-table__cell'];
      if (column.fixed) classes.push(`lyt-table__cell--fixed-${column.fixed}`);
      return classes.join(' ');
    };

    // 生成表头单元格类名
    const getHeaderCellClass = (column: any) => {
      const classes = ['lyt-table__cell', 'lyt-table__header-cell'];
      if (column.sortable) classes.push('lyt-table__cell--sortable');
      if (column.fixed) classes.push(`lyt-table__cell--fixed-${column.fixed}`);
      return classes.join(' ');
    };

    // 获取单元格值
    const getCellValue = (row: any, column: any) => {
      if (column.prop) {
        const keys = column.prop.split('.');
        let value = row;
        for (const key of keys) {
          value = value?.[key];
        }
        return value !== undefined && value !== null ? String(value) : '';
      }
      return '';
    };

    // 检查是否选中
    const isRowSelected = (row: any) => {
      return selectedRows().has(row);
    };

    return () => {
      const data = props.data || [];
      const columns = props.columns || [];

      // 表头单元格
      const headerCells: any[] = [];
      
      // 选择列
      if (props.showSelection) {
        headerCells.push(createVNode(
          'th',
          { class: 'lyt-table__cell lyt-table__header-cell lyt-table__cell--selection' },
          [
            createVNode('input', {
              type: 'checkbox',
              checked: allSelected(),
              onChange: (e: any) => handleSelectAll(e.target.checked),
            })
          ]
        ));
      }

      // 数据列
      headerCells.push(...columns.map((column: any) => {
        const children: any[] = [column.label];
        if (column.sortable) {
          children.push(createVNode(
            'span',
            { class: `lyt-table__sort-icon ${column.prop === sortColumn() ? 'lyt-table__sort-icon--active' : ''}` },
            column.prop === sortColumn() ? (sortOrder() === 'ascending' ? '▲' : '▼') : '↕'
          ));
        }
        return createVNode(
          'th',
          {
            class: getHeaderCellClass(column),
            style: column.width ? `width: ${column.width}px;` : '',
            onClick: () => handleSort(column),
          },
          children
        );
      }));

      // 表体行
      const bodyRows: any[] = data.map((row: any, index: number) => {
        const cells: any[] = [];
        
        // 选择列
        if (props.showSelection) {
          cells.push(createVNode(
            'td',
            { class: 'lyt-table__cell lyt-table__cell--selection' },
            [
              createVNode('input', {
                type: 'checkbox',
                checked: isRowSelected(row),
                onChange: (e: any) => handleRowSelect(row, e.target.checked),
              })
            ]
          ));
        }
        
        // 数据列
        cells.push(...columns.map((column: any) => {
          const cellValue = getCellValue(row, column);
          const cellContent = slots[column.slot]
            ? slots[column.slot]({ row, column, index })
            : cellValue;
          
          return createVNode(
            'td',
            {
              class: getCellClass(column),
              style: column.align 
                ? `text-align: ${column.align};${column.width ? `width: ${column.width}px;` : ''}`
                : column.width ? `width: ${column.width}px;` : '',
            },
            cellContent
          );
        }));
        
        return createVNode(
          'tr',
          {
            class: getRowClass(row, index),
            onClick: () => handleRowClick(row, index),
          },
          cells
        );
      });

      // 构建表格结构
      const tableChildren: any[] = [
        createVNode('thead', { class: 'lyt-table__header' }, [createVNode('tr', {}, headerCells)]),
        createVNode('tbody', { class: 'lyt-table__body' }, bodyRows),
      ];
      
      const wrapperChildren: any[] = [
        createVNode('table', { class: getTableClass() }, tableChildren),
      ];
      
      // 空状态
      if (data.length === 0 && slots.empty) {
        wrapperChildren.push(createVNode('div', { class: 'lyt-table__empty' }, slots.empty()));
      }
      
      return createVNode('div', { class: 'lyt-table__wrapper' }, wrapperChildren);
    };
  },
});

export default Table;
