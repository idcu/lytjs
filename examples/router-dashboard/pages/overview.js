import { ref, computed, onMounted } from '@lytjs/core';
import { fetchOrders, formatMoney } from '../api.js';

/**
 * 概览页：异步加载 + 派生统计。
 *
 * 这里刻意用 `onMounted` 而不是在 setup 里直接发请求 —— 它同时验证了
 * 生命周期钩子在这条渲染链上真的会触发（`router-dashboard.test.ts` 会断言
 * 挂载后先出现 loading、随后出现统计值；钩子不触发就会红）。
 */
export const Overview = {
  name: 'Overview',
  setup() {
    const orders = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      orders.value = await fetchOrders();
      loading.value = false;
    });

    const total = computed(() => orders.value.reduce((sum, o) => sum + o.amount, 0));
    const pending = computed(() => orders.value.filter((o) => o.status === 'pending').length);

    return { orders, loading, total, pending, formatMoney };
  },
  template: `
    <section class="page overview">
      <h2>经营概览</h2>
      <p v-if="loading" class="loading">加载中…</p>
      <div v-else class="stats">
        <div class="stat">
          <span class="stat-label">订单总数</span>
          <span class="stat-value stat-count">{{ orders.length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">待发货</span>
          <span class="stat-value stat-pending">{{ pending }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">成交金额</span>
          <span class="stat-value stat-total">{{ formatMoney(total) }}</span>
        </div>
      </div>
    </section>
  `,
};
