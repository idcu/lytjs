/**
 * 可复用数据表组件（子组件形态：props 下行 + emit 上行）。
 *
 * ⚠️ 模板里绑定本组件的多词属性/事件必须用 **camelCase**：
 *    正确：`:sortKey="…"`  `@sortChange="…"`
 *    无效：`:sort-key="…"` `@sort-change="…"`
 *
 * 原因是 `@lytjs/compiler` 不把 kebab-case 属性名 camelize（实测
 * `@sort-change` 会编译成监听器键 `onSort-change`，而 `emit('sort-change')`
 * 查找的是 `onSortChange`），且**不报警**：prop 静默保持默认值、连字符事件
 * 静默不触发。已记为 N28（见 keel 台账），修复应落在运行时而非编译器
 * —— 编译器无法静态区分「组件 prop」与「原生元素属性」。
 */
export const DataTable = {
  name: 'DataTable',
  props: {
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    sortKey: { type: String, default: '' },
    sortDir: { type: String, default: 'asc' },
    emptyText: { type: String, default: '暂无数据' },
  },
  emits: ['sortChange'],
  setup(props, { emit }) {
    const onHeaderClick = (col) => {
      if (col.sortable === false) return;
      emit('sortChange', col.key);
    };

    return { onHeaderClick };
  },
  template: `
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="'th-' + col.key"
              @click="onHeaderClick(col)"
            >
              <span class="th-label">{{ col.label }}</span>
              <span v-if="sortKey === col.key" class="sort-mark">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="data-row">
            <td v-for="col in columns" :key="col.key" :class="'cell-' + col.key">{{ row[col.key] }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length" class="data-empty">{{ emptyText }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
};
