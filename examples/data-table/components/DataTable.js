/**
 * 可复用数据表组件（子组件形态：props 下行 + emit 上行）。
 *
 * 属性/事件两种写法都支持（2026-11-10 修复 N28 后）：
 *   camelCase：`:sortKey="…"`   `@sortChange="…"`   ← Vue 模板里更常见
 *   kebab-case：`:sort-key="…"` `@sort-change="…"`  ← 本示例采用，与 Vue 习惯一致
 *
 * 修复前 kebab 写法会**静默失效**（prop 停在默认值、事件永远送不到处理器），
 * 根因是编译器不 camelize 属性名、而 emit 会 camelize。修法落在运行时：
 * `initProps` 增加 kebab 回退并把已消费的键从 attrs 排除，`emit` 增加
 * 「on + 首字母大写的 kebab 事件名」回退。详见 N28（keel 台账）。
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
