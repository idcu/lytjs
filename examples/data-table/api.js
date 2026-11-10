/**
 * 数据层：确定性生成 47 条订单。
 *
 * 用带种子的 LCG 而不是 `Math.random()` —— 随机数据会让「金额升序第一名是谁」
 * 这类断言无法预先算出期望值，只能反过来把当前输出抄进断言（自证式假绿）。
 * 种子固定后，数据集是常量，判据可以独立算出期望。
 */

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const CUSTOMERS = ['张伟', '李娜', '王强', '陈静', '刘洋', '赵敏', '孙磊', '周婷'];
const STATUSES = ['pending', 'shipped', 'done'];

/** @type {ReadonlyArray<{id:string,customer:string,amount:number,status:string}>} */
export const ORDERS = Object.freeze(
  Array.from({ length: 47 }, (_, i) => {
    const rand = lcg(20261110 + i * 7919);
    const r1 = rand();
    const r2 = rand();
    const r3 = rand();
    return {
      id: String(2001 + i),
      customer: CUSTOMERS[Math.floor(r1 * CUSTOMERS.length)],
      amount: Math.round((50 + r2 * 4950) * 100) / 100,
      status: STATUSES[Math.floor(r3 * STATUSES.length)],
    };
  }),
);

const LATENCY_MS = 40;

/** 模拟一次列表请求（返回独立副本，避免视图层改到共享常量） */
export function fetchOrders() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ORDERS.map((o) => ({ ...o }))), LATENCY_MS);
  });
}

export function formatMoney(amount) {
  return `¥${amount.toFixed(2)}`;
}

const STATUS_LABEL = { pending: '待发货', shipped: '已发货', done: '已完成' };

export function statusLabel(status) {
  return STATUS_LABEL[status] ?? status;
}

export const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'shipped', label: STATUS_LABEL.shipped },
  { value: 'done', label: STATUS_LABEL.done },
];
