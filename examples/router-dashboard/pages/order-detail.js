import { computed } from '@lytjs/core';
import { useRoute } from '@lytjs/router';
import { findOrder, formatMoney, statusLabel } from '../api.js';

/**
 * 订单详情页：动态路由参数。
 *
 * `useRoute()` 返回的是一个 **signal**（可调用对象，没有 `.value`），
 * 所以读参数写 `route().params.id`。把 `route()` 包进 `computed` 之后，
 * 路径变化会重新计算 —— 这正是「点列表某一行 → 详情跟着换」的机制。
 */
export const OrderDetail = {
  name: 'OrderDetail',
  setup() {
    const route = useRoute();
    const id = computed(() => String(route().params?.id ?? ''));
    const order = computed(() => findOrder(id.value));

    return { id, order, formatMoney, statusLabel };
  },
  template: `
    <section class="page detail">
      <h2>订单详情</h2>
      <p v-if="!order" class="missing">订单 {{ id }} 不存在</p>
      <div v-else class="detail-body">
        <dl class="detail-list">
          <dt>订单号</dt><dd class="detail-id">{{ order.id }}</dd>
          <dt>客户</dt><dd class="detail-customer">{{ order.customer }}</dd>
          <dt>金额</dt><dd class="detail-amount">{{ formatMoney(order.amount) }}</dd>
          <dt>状态</dt><dd class="detail-status">{{ statusLabel(order.status) }}</dd>
        </dl>
        <h3>商品</h3>
        <ul class="detail-items">
          <li v-for="item in order.items" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>
  `,
};
