/**
 * 数据层。
 *
 * 真实项目里这里应当是 `fetch('/api/orders')`。示例用内存数据 + 可观测延迟，
 * 目的是**保留「加载中 → 数据到达」的真实时序** —— 否则 loading 分支只是
 * 摆设，覆盖它的断言也会变成自证式假绿（写一个生产路径永远不会进的状态）。
 *
 * 延迟取 40ms：足够让 `router-dashboard.test.ts` 在挂载后立刻断言到
 * 「数据还没到」，又不会让手点用户等待。
 */

const LATENCY_MS = 40;

/** @typedef {{ id: string, customer: string, amount: number, status: 'pending'|'shipped'|'done', items: string[] }} Order */

/** @type {ReadonlyArray<Order>} */
export const ORDERS = Object.freeze([
  {
    id: '1001',
    customer: '张伟',
    amount: 1280.5,
    status: 'pending',
    items: ['机械键盘', '鼠标垫'],
  },
  { id: '1002', customer: '李娜', amount: 640, status: 'shipped', items: ['显示器支架'] },
  { id: '1003', customer: '王强', amount: 3999, status: 'pending', items: ['4K 显示器'] },
  { id: '1004', customer: '陈静', amount: 89.9, status: 'done', items: ['Type-C 数据线'] },
]);

/** 模拟一次列表请求（每次返回独立副本，避免视图层改到共享常量） */
export function fetchOrders() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(ORDERS.map((o) => ({ ...o, items: [...o.items] })));
    }, LATENCY_MS);
  });
}

/** 同步按 id 查单：详情页用它，用来和列表页的异步路径形成对照 */
export function findOrder(id) {
  return ORDERS.find((o) => o.id === id) ?? null;
}

export function formatMoney(amount) {
  return `¥${amount.toFixed(2)}`;
}

const STATUS_LABEL = { pending: '待发货', shipped: '已发货', done: '已完成' };

export function statusLabel(status) {
  return STATUS_LABEL[status] ?? status;
}
