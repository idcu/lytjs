/**
 * 订单分析表 —— 子组件 props + emit 的真实应用。
 *
 * 与前两个示例的分工：
 *   · `using-lytjs-as-dep`：表单 + 本地状态 + localStorage（单层组件）
 *   · `router-dashboard`：多页面路由 + 动态参数 + 异步列表
 *   · 本示例：**可复用子组件**（props 下行 / emit 上行）+ 排序 / 筛选 / 分页 / 空态
 *
 * 运行：`npm install && npm run dev`（默认 3200 端口）
 * 构建：`npm run build`
 */
import { createApp, ref, computed, onMounted } from '@lytjs/core';

import { DataTable } from './components/DataTable.js';
import { fetchOrders, formatMoney, statusLabel, STATUS_OPTIONS } from './api.js';

const PAGE_SIZE = 10;

const App = {
  components: { DataTable },
  setup() {
    const raw = ref([]);
    const loading = ref(true);

    const query = ref('');
    const status = ref('');
    const sortKey = ref('id');
    const sortDir = ref('asc');
    const page = ref(1);

    onMounted(async () => {
      raw.value = await fetchOrders();
      loading.value = false;
    });

    const columns = [
      { key: 'id', label: '订单号' },
      { key: 'customer', label: '客户' },
      { key: 'amount', label: '金额' },
      { key: 'status', label: '状态', sortable: false },
    ];

    /** 关键词（按客户名）+ 状态筛选 */
    const filtered = computed(() => {
      const q = query.value.trim();
      const st = status.value;
      return raw.value.filter((o) => (!q || o.customer.includes(q)) && (!st || o.status === st));
    });

    /** 排序在**原始数值**上做，展示层才格式化 —— 否则按「¥1,000」字符串排会错 */
    const sorted = computed(() => {
      const key = sortKey.value;
      const dir = sortDir.value === 'desc' ? -1 : 1;
      const list = [...filtered.value];
      list.sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
      return list;
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)));

    /** 传给子组件的展示行（金额/状态已格式化） */
    const displayRows = computed(() =>
      sorted.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE).map((o) => ({
        id: o.id,
        customer: o.customer,
        amount: formatMoney(o.amount),
        status: statusLabel(o.status),
      })),
    );

    const onSortChange = (key) => {
      if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey.value = key;
        sortDir.value = 'asc';
      }
      page.value = 1;
    };

    const onQueryInput = (event) => {
      query.value = event?.target?.value ?? '';
      page.value = 1;
    };

    const onStatusChange = (event) => {
      status.value = event?.target?.value ?? '';
      page.value = 1;
    };

    const prevPage = () => {
      if (page.value > 1) page.value -= 1;
    };
    const nextPage = () => {
      if (page.value < totalPages.value) page.value += 1;
    };

    return {
      raw,
      loading,
      query,
      columns,
      sortKey,
      sortDir,
      page,
      totalPages,
      filtered,
      displayRows,
      onSortChange,
      onQueryInput,
      onStatusChange,
      prevPage,
      nextPage,
      statusOptions: STATUS_OPTIONS,
    };
  },
  template: `
    <section class="page">
      <h2>订单分析表</h2>

      <div class="toolbar">
        <input class="search" :value="query" @input="onQueryInput" placeholder="搜索客户名（如 张伟）" />
        <select class="status-filter" @change="onStatusChange">
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <span class="row-count">共 {{ filtered.length }} 条 / 全部 {{ raw.length }} 条</span>
      </div>

      <p v-if="loading" class="loading">加载中…</p>

      <div v-else class="table-area">
        <DataTable
          :rows="displayRows"
          :columns="columns"
          :sortKey="sortKey"
          :sortDir="sortDir"
          emptyText="没有匹配的数据"
          @sortChange="onSortChange"
        />
        <div class="pager">
          <button type="button" class="prev" @click="prevPage">上一页</button>
          <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
          <button type="button" class="next" @click="nextPage">下一页</button>
        </div>
      </div>
    </section>
  `,
};

createApp(App).mount('#app');
