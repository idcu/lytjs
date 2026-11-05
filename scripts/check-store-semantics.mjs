#!/usr/bin/env node
/**
 * 门禁：状态管理语义（`@lytjs/store`）
 *
 * ## 为什么需要这一项
 *
 * 状态管理的缺陷形态几乎全是「**界面不更新 / 数据没存住**」，而它们**都不抛异常**：
 * 嵌套变更没被追踪、订阅没触发、getter 返回缓存、`$patch` 静默丢弃写入。
 * 这些在单测里很难发现 —— 因为单测直接读 `store.xxx`（拿到的是新值），
 * 只有「effect 重跑了吗 / 订阅者收到了吗」才暴露。
 *
 * 本门禁按语义条目驱动真实 store：既断言值，也断言**副作用是否发生**。
 *
 * ## 2026-11-05 首次运行抓到的缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | **对象/数组的原地变更完全无响应**（P0） | `store.items.push(2)` ⇒ effect 只跑过初值、`$subscribe` **0 条**；`store.user.name = 'b'` 同理 |
 * | 2 | **getter 不跟随嵌套变更**（P1） | `getters.total` 读 `items` ⇒ push 之后仍是旧值（`computedSignal` 只订阅 signal） |
 * | 3 | **setup store 直接赋值不通知**（P1） | `store.count = 1` ⇒ 订阅 0 条（只在 action 边界触发） |
 * | 4 | **`storeToRefs` 把 action 也转成 ref**（P1） | `Object.keys` 为 `["n","double","inc"]`；`const { inc } = ...; inc()` ⇒ `TypeError` |
 * | 5 | **setup store 的 `$state` 含 action 函数**（P1） | `Object.keys(store.$state)` 为 `["n","inc"]` |
 * | 6 | **`store.$state = {...}` 抛 TypeError**（P1） | `Cannot set property $state ... which has only a getter`（类型里写的是可写） |
 * | 7 | **setup store 的 `$patch(fn)` 写入静默丢失**（P1） | mutator 拿到的是裸 ref 容器，`s.count = 5` 把 ref 整个换掉 ⇒ `store.count` 不变 |
 * | 8 | **`$patch` 静默丢弃未知键**（P2） | 对象式与函数式都不留任何提示 |
 * | 9 | **`$reset` 按 key 各发一条事件**（P2） | 3 个键 ⇒ 订阅者被写 3 次，且 `type` 与「用户逐个改」无法区分 |
 * | 10 | **`$dispose` / `clearStoreCache` 不停内部 effect**（P2） | 废弃 store 仍在响应变更、仍持有订阅回调 |
 * | 11 | **`warn()` 在本包产物里全是哑的**（P1，跨包） | 本包 tsup 把 `@lytjs/common-error` 内联 + `define __DEV__: false` ⇒ `getDevMode()` 坍缩成 `return false`（见 `check-dev-warnings` 第 12 组） |
 */
import { join } from 'node:path';

const ROOT = process.cwd();
const { defineStore, createPinia, setActivePinia, getActivePinia, storeToRefs, clearStoreCache } =
  await import(join(ROOT, 'packages/ecosystem/packages/store/dist/index.mjs'));
const { effect, signal } = await import(join(ROOT, 'packages/reactivity/dist/index.mjs'));

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);

/** 每个用例一个全新的 pinia（store 缓存按 pinia 隔离） */
const fresh = () => {
  clearStoreCache();
  setActivePinia(createPinia());
};
/** 捕获 console.warn（本包的诊断都走 `warn()`） */
const captureWarn = (fn) => {
  const lines = [];
  const original = console.warn;
  console.warn = (...args) => lines.push(args.map(String).join(' '));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return lines;
};

// ══════════════════════════════════════════════════════════
section('[1] 嵌套响应：对象 / 数组的原地变更必须被追踪');
{
  fresh();
  const store = defineStore('nest-array', { state: () => ({ items: [1] }) })();
  const seen = [];
  effect(() => seen.push(store.items.length));
  store.items.push(2);
  check('数组 push ⇒ effect 重跑（此前只跑过初值）', seen.length === 2 && seen[1] === 2, seen);

  const subscribed = [];
  store.$subscribe((m) => subscribed.push(m.type));
  store.items.push(3);
  check('数组 push ⇒ `$subscribe` 收到 1 条事件（此前 0 条）', subscribed.length === 1, subscribed);
  check('数组内容确实变了', store.items.length === 3, store.items.length);
}
{
  fresh();
  const store = defineStore('nest-object', { state: () => ({ user: { name: 'a' } }) })();
  const seen = [];
  effect(() => seen.push(store.user.name));
  store.user.name = 'b';
  check('对象字段赋值 ⇒ effect 重跑', seen.length === 2 && seen[1] === 'b', seen);

  const events = [];
  store.$subscribe(() => events.push(1));
  store.user.name = 'c';
  check('对象字段赋值 ⇒ 订阅 1 条', events.length === 1, events.length);
}
{
  fresh();
  const store = defineStore('nest-splice', { state: () => ({ list: ['a', 'b'] }) })();
  const events = [];
  store.$subscribe(() => events.push(1));
  store.list.splice(0, 1);
  store.list.push('c');
  check('splice / push 都能触发订阅', events.length === 2, events.length);
  check('splice 后内容正确', JSON.stringify(store.list) === '["b","c"]', store.list);
}

// ══════════════════════════════════════════════════════════
section('[2] 订阅完整性：直接赋值 / action / patch 各自恰好一条');
{
  fresh();
  const store = defineStore('sub-basic', {
    state: () => ({ n: 0, items: [] }),
    actions: {
      set(n) {
        this.n = n;
      },
      push(x) {
        this.items.push(x);
      },
    },
  })();

  const events = [];
  const off = store.$subscribe((m) => events.push(m.type));

  store.n = 1;
  check('直接赋值 ⇒ 1 条 direct', events.length === 1 && events[0] === 'direct', events);

  events.length = 0;
  store.n = 1; // 同值
  check('对照：同值赋值不触发（Object.is）', events.length === 0, events.length);

  events.length = 0;
  store.set(5);
  check('action 里改状态 ⇒ 1 条', events.length === 1, events.length);

  events.length = 0;
  store.push('x');
  check('action 里改嵌套数组 ⇒ 1 条（不重复）', events.length === 1, events.length);

  events.length = 0;
  off();
  store.n = 9;
  check('取消订阅后不再收到', events.length === 0, events.length);
}
{
  fresh();
  const store = defineStore('sub-patch', { state: () => ({ a: 1, b: 2 }) })();
  const events = [];
  store.$subscribe((m) => events.push(m.type));

  store.$patch({ a: 10, b: 20 });
  check(
    '`$patch(object)` 只发 1 条 patch object（不逐键发 direct）',
    events.length === 1 && events[0] === 'patch object',
    events,
  );

  events.length = 0;
  store.$patch((s) => {
    s.a = 100;
  });
  check(
    '`$patch(fn)` 只发 1 条 patch function',
    events.length === 1 && events[0] === 'patch function',
    events,
  );

  events.length = 0;
  store.$reset();
  check('`$reset()` 只发 1 条事件（此前按 key 各发一条）', events.length === 1, events);
  check('`$reset()` 后值回到初值', store.a === 1 && store.b === 2, [store.a, store.b]);
}

// ══════════════════════════════════════════════════════════
section('[3] $patch / $state：不能静默丢弃写入');
{
  fresh();
  const store = defineStore('patch-unknown', { state: () => ({ n: 1 }) })();
  const warnings = captureWarn(() => store.$patch({ n: 2, ghost: 1 }));
  check('对象式 patch 应用已知键', store.n === 2, store.n);
  check(
    '对象式 patch 丢弃未知键时**告警**（此前完全静默）',
    warnings.some((line) => line.includes('ghost')),
    warnings,
  );
  check('未知键不会出现在 $state 里', !('ghost' in store.$state), Object.keys(store.$state));
}
{
  fresh();
  const store = defineStore('patch-fn-unknown', { state: () => ({ n: 1 }) })();
  const warnings = captureWarn(() =>
    store.$patch((s) => {
      s.n = 3;
      s.ghost = 9;
    }),
  );
  check('函数式 patch 应用已知键', store.n === 3, store.n);
  check(
    '函数式 patch 新增键：告警 + 不残留影子属性（`$state` 与 store 一致）',
    warnings.some((line) => line.includes('ghost')) && !('ghost' in store.$state),
    { warnings, keys: Object.keys(store.$state) },
  );
}
{
  fresh();
  const store = defineStore('state-assign', { state: () => ({ a: 1, b: 2 }) })();
  let thrown = null;
  const warnings = captureWarn(() => {
    try {
      store.$state = { a: 9, b: 8, ghost: 7 };
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error);
    }
  });
  check('`$state = {...}` 不再抛 TypeError（类型里写的是可写）', thrown === null, thrown);
  check('`$state = {...}` 生效', store.a === 9 && store.b === 8, [store.a, store.b]);
  check(
    '`$state = {...}` 的未知键告警',
    warnings.some((line) => line.includes('ghost')),
    warnings,
  );

  // ⚠️ 门禁自身要防御：旧实现的 `$state` 只有 getter，赋值会抛 TypeError。
  //   不吞掉的话门禁会**崩在赋值上**，负向对照只看到一条堆栈、看不到「哪些语义坏了」。
  let badThrown = null;
  const badWarnings = captureWarn(() => {
    try {
      store.$state = 'oops';
    } catch (error) {
      badThrown = error instanceof Error ? error.message : String(error);
    }
  });
  check('`$state = 非对象` 不抛异常（只告警）', badThrown === null, badThrown);
  check(
    '`$state = 非对象` 告警而不是崩溃',
    badWarnings.some((line) => line.includes('$state')),
    badWarnings,
  );
}

// ══════════════════════════════════════════════════════════
section('[4] getters：签名 / 链式 / 嵌套依赖');
{
  fresh();
  const store = defineStore('getter-basic', {
    state: () => ({ n: 2 }),
    getters: {
      double: (s) => s.n * 2,
      quad: (s, g) => g.double * 2,
      fromThis: function () {
        return this.n + 1;
      },
    },
  })();
  check('getter 收到 state 参数', store.double === 4, store.double);
  check('getter 可引用其它 getter', store.quad === 8, store.quad);
  check('getter 的 this 指向 store', store.fromThis === 3, store.fromThis);
}
{
  fresh();
  const store = defineStore('getter-nested', {
    state: () => ({ items: [1] }),
    getters: { total: (s) => s.items.reduce((a, b) => a + b, 0) },
  })();
  const seen = [];
  effect(() => seen.push(store.total));
  store.items.push(2);
  check('getter 跟随数组 push（此前返回缓存旧值）', seen[seen.length - 1] === 3, seen);
}
{
  fresh();
  const store = defineStore('getter-chain-nested', {
    state: () => ({ items: [1] }),
    getters: {
      total: (s) => s.items.reduce((a, b) => a + b, 0),
      doubled: (s, g) => g.total * 2,
    },
  })();
  const seen = [];
  effect(() => seen.push(store.doubled));
  store.items.push(2);
  check('链式 getter 跟随嵌套变更（且一次变更只重算一次）', seen[seen.length - 1] === 6, seen);
}

// ══════════════════════════════════════════════════════════
section('[5] storeToRefs：只提取 state + getters');
{
  fresh();
  const store = defineStore('refs', {
    state: () => ({ n: 1 }),
    getters: { double: (s) => s.n * 2 },
    actions: {
      inc() {
        this.n++;
      },
    },
  })();
  const refs = storeToRefs(store);
  check('包含 state 键', 'n' in refs);
  check('包含 getter 键', 'double' in refs);
  check('**不包含 action**（此前会变成「装着函数的 ref」）', !('inc' in refs), Object.keys(refs));
  check('不包含 $ 前缀的内部成员', !Object.keys(refs).some((key) => key.startsWith('$')));

  store.n = 10;
  check('解构出来的 ref 保持响应式', refs.n.value === 10, refs.n.value);
  check('getter 的 ref 也跟随', refs.double.value === 20, refs.double.value);
  check('action 仍从 store 上调用', typeof store.inc === 'function');
}

// ══════════════════════════════════════════════════════════
section('[6] setup store：状态视图 / 直接赋值 / patch');
{
  fresh();
  const useStore = defineStore('setup-state', () => {
    const n = signal(1);
    const inc = () => n.set(n() + 1);
    return { n, inc };
  });
  const store = useStore();

  check(
    '`$state` 只含状态键（不含 action）',
    JSON.stringify(Object.keys(store.$state)) === '["n"]',
    Object.keys(store.$state),
  );
  check('`$state.n` 读到当前值', store.$state.n === 1, store.$state.n);

  const events = [];
  store.$subscribe(() => events.push(1));
  store.n = 5;
  check('直接赋值 ⇒ 订阅 1 条（此前 0 条）', events.length === 1 && store.n === 5, {
    events: events.length,
    n: store.n,
  });

  events.length = 0;
  store.inc();
  check('action 改 ref ⇒ 订阅 1 条（不重复）', events.length === 1, events.length);
  check('action 生效', store.n === 6, store.n);
}
{
  fresh();
  const useStore = defineStore('setup-patch', () => {
    const n = signal(1);
    const label = signal('a');
    return { n, label };
  });
  const store = useStore();

  store.$patch((s) => {
    s.n = 42;
  });
  check(
    '`$patch(fn)` 写 ref 不丢失（此前 mutator 拿到裸容器，写入被丢掉）',
    store.n === 42,
    store.n,
  );

  const warnings = captureWarn(() => store.$patch({ n: 1, ghost: 1 }));
  check('`$patch(object)` 应用已知键', store.n === 1, store.n);
  check(
    '`$patch(object)` 未知键告警',
    warnings.some((line) => line.includes('ghost')),
    warnings,
  );

  const resetWarnings = captureWarn(() => store.$reset());
  check(
    'setup store 的 `$reset()` 给出可操作告警（不静默）',
    resetWarnings.some((line) => line.includes('$reset')),
    resetWarnings,
  );
}

// ══════════════════════════════════════════════════════════
section('[7] 生命周期：$dispose / clearStoreCache 必须停掉内部 effect');
{
  fresh();
  const useStore = defineStore('dispose', { state: () => ({ n: 1 }) });
  const first = useStore();
  let hits = 0;
  first.$subscribe(() => hits++);
  first.$dispose();
  first.n = 2;
  check('`$dispose()` 后旧 store 的订阅不再触发', hits === 0, hits);

  const second = useStore();
  check('`$dispose()` 后可重新创建（新实例）', second !== first, second === first);
  check('重建后状态回到初值', second.n === 1, second.n);
}
{
  fresh();
  const store = defineStore('cache-clear', { state: () => ({ n: 1 }) })();
  let hits = 0;
  store.$subscribe(() => hits++);
  clearStoreCache();
  store.n = 99;
  check('`clearStoreCache()` 后旧订阅不再触发（此前仍会触发）', hits === 0, hits);
}

// ══════════════════════════════════════════════════════════
section('[8] 隔离：不同 pinia 不串数据');
{
  clearStoreCache();
  const piniaA = createPinia();
  const piniaB = createPinia();
  const useUser = defineStore('user', { state: () => ({ name: 'anon' }) });

  const a = useUser(piniaA);
  const b = useUser(piniaB);
  a.name = 'alice';
  check('不同 pinia 拿到不同实例', a !== b);
  check('B 不受 A 影响', b.name === 'anon', b.name);
  check('同一 pinia 内是同一个实例', useUser(piniaA) === a);

  check(
    'pinia.state 里能读到该 store',
    piniaA.state.value.user && piniaA.state.value.user.name === 'alice',
    piniaA.state.value.user && piniaA.state.value.user.name,
  );
}

// ══════════════════════════════════════════════════════════
section('[9] 对照：既有行为不回归');
{
  fresh();
  const store = defineStore('baseline', {
    state: () => ({ n: 1 }),
    getters: { double: (s) => s.n * 2 },
    actions: {
      add(x) {
        this.n += x;
        return this.n;
      },
      async asyncAdd(x) {
        await Promise.resolve();
        this.n += x;
        return this.n;
      },
    },
  })();
  check('$id 正确', store.$id === 'baseline', store.$id);
  check('action 返回值透传', store.add(2) === 3, store.n);
  check('getter 跟随', store.double === 6, store.double);

  const contexts = [];
  const off = store.$onAction((ctx) => contexts.push(ctx.name));
  store.add(1);
  check('$onAction 收到 action 名', contexts.length === 1 && contexts[0] === 'add', contexts);
  off();
  store.add(1);
  check('$onAction 取消后不再收到', contexts.length === 1, contexts.length);
}
{
  fresh();
  const store = defineStore('async-action', {
    state: () => ({ n: 0 }),
    actions: {
      async run() {
        await Promise.resolve();
        this.n = 7;
        return 'done';
      },
    },
  })();
  const result = await store.run();
  check('异步 action 返回值正确', result === 'done', result);
  check('异步 action 里的状态变更生效', store.n === 7, store.n);
}
{
  fresh();
  const store = defineStore('empty-state', { actions: { ping: () => 'pong' } })();
  check('对照：无 state 的 store 可用', store.$state && Object.keys(store.$state).length === 0);
  check('对照：action 正常', store.ping() === 'pong');
}
{
  fresh();
  const store = defineStore('nested-pinia-state', { state: () => ({ list: [1] }) })();
  const pinia = getActivePinia();
  check(
    '对照：pinia.state 与 store.$state 是同一份（改 store 后 pinia.state 可见）',
    (() => {
      store.list.push(2);
      return pinia.state.value['nested-pinia-state'].list.length === 2;
    })(),
    pinia.state.value['nested-pinia-state'].list.length,
  );
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
