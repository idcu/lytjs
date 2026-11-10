import { ref, onMounted } from '@lytjs/core';
import { RouterLink } from '@lytjs/router';
import { fetchOrders, formatMoney, statusLabel } from '../api.js';

/**
 * 订单列表页。
 *
 * `RouterLink` 走**组件内局部注册**，而不是全局注册 —— 这是真实项目更常见的
 * 写法（页面只依赖它自己用到的东西），同时也验证了模板块里对局部组件的解析
 * 是通的。
 */
export const Orders = {
  name: 'Orders',
  components: { RouterLink },
  setup() {
    const orders = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      orders.value = await fetchOrders();
      loading.value = false;
    });

    return { orders, loading, formatMoney, statusLabel };
  },
  template: `
    <section class="page orders">
      <h2>订单列表</h2>
      <p v-if="loading" class="loading">加载中…</p>
      <table v-else class="orders-table">
        <thead>
          <tr><th>订单号</th><th>客户</th><th>金额</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id" class="order-row">
            <td class="order-id">{{ order.id }}</td>
            <td>{{ order.customer }}</td>
            <td>{{ formatMoney(order.amount) }}</td>
            <td>{{ statusLabel(order.status) }}</td>
            <td><RouterLink :to="'/orders/' + order.id">查看</RouterLink></td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
};
