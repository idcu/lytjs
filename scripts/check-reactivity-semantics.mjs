#!/usr/bin/env node
/**
 * 门禁：响应式语义（`@lytjs/reactivity`）
 *
 * ## 为什么需要这一项
 *
 * 响应式的缺陷几乎都不抛异常：**值能读出来，界面就是不更新**。
 * 单测若直接读 `obj.prop` / `computed.value`，拿到的永远是「当下的正确值」，
 * 只有「effect 重跑了吗 / 订阅者收到几次」才暴露问题。
 *
 * 本门禁按语义条目驱动真实运行时：断言值，也断言**副作用次数**。
 *
 * ## 2026-11-05（A08）首次运行抓到的三处缺口（修复前实测）
 *
 * | # | 缺陷 | 修复前实测 |
 * |---|---|---|
 * | 1 | `reactive` 只解包 `ref`（对象），**函数型 Signal 不解包** | `reactive({ s: signal(1) }).s` 是 `function` |
 * | 2 | `Map.set` 新增 key 不触发 `ITERATE_KEY` | `effect(() => map.size)` 只跑过初值：sizes `[1]` |
 * | 3 | `computedSignal` 求值时**没有 activeEffect** | `computedSignal(() => state.n * 2)` 读 `reactive` 不追踪，`state.n = 2` 后仍是旧值 |
 *
 * 每条缺口下都有「负向对照」断言：把修复回退后，对应断言必须立刻红。
 */
import { join } from 'node:path';

const ROOT = process.cwd();
const { reactive, readonly, signal, computedSignal, isSignal, effect } = await import(
  join(ROOT, 'packages/reactivity/dist/index.mjs')
);

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

// ══════════════════════════════════════════════════════════
section('[1] reactive 解包函数型 Signal（读侧 + 写侧对称）');
{
  const s = signal(1);
  const obj = reactive({ s });

  // 负向对照：修复前这里是 'function'
  check(
    'reactive 属性读取 Signal 返回当前值（不是函数）',
    obj.s === 1 && typeof obj.s === 'number',
    {
      type: typeof obj.s,
      value: obj.s,
    },
  );

  const seen = [];
  effect(() => seen.push(obj.s));
  s.set(2);
  check('Signal.set 后，读 obj.s 的 effect 重跑', seen.join(',') === '1,2', seen);

  // 写穿：obj.s = 5 必须等价于 s.set(5)，否则读侧解包与写侧替换自相矛盾
  obj.s = 5;
  check('obj.s = 5 写穿到 Signal（s() === 5）', s() === 5, s());
  check('写穿后 obj.s 仍读到 5', obj.s === 5, obj.s);
  check('写穿后写入仍会通知 effect', seen.join(',') === '1,2,5', seen);

  // 不误伤普通函数属性（reactive 会把函数包成函数代理，身份不同但行为不变）
  const fn = () => 42;
  const withFn = reactive({ fn });
  check(
    '普通函数属性不被误判为 Signal',
    !isSignal(withFn.fn) && typeof withFn.fn === 'function' && withFn.fn() === 42,
    typeof withFn.fn,
  );

  // 数组整数索引保持原函数（与 ref 的处理一致，避免 arr[0].set() 失效）
  const arr = reactive([signal(1)]);
  check('数组整数索引返回 Signal 本身（可 .set）', isSignal(arr[0]), typeof arr[0]);
  arr[0].set(3);
  check('数组索引上的 Signal 可写且可读', arr[0]() === 3, arr[0]());

  // readonly 视图同样解包（只读代理不应把函数泄漏给用户）
  const ro = readonly({ s });
  check('readonly 也解包 Signal', ro.s === 5, typeof ro.s);
}

// ══════════════════════════════════════════════════════════
section('[2] Map/Set 集合变更的通知范围');
{
  const map = reactive(new Map([['a', 1]]));
  const sizes = [];
  effect(() => sizes.push(map.size));
  map.set('b', 2);
  // 负向对照：修复前 sizes === [1]
  check('Map.set 新增 key ⇒ map.size 的 effect 重跑', sizes.join(',') === '1,2', sizes);

  map.set('a', 9);
  check('Map.set 改已有 key 不改变 size（不产生额外 size 通知）', sizes.join(',') === '1,2', sizes);

  map.delete('b');
  check('Map.delete ⇒ size 的 effect 重跑', sizes.join(',') === '1,2,1', sizes);

  const keyLists = [];
  effect(() => keyLists.push([...map.keys()].join('|')));
  map.set('c', 3);
  check('Map.set 新增 key ⇒ keys() 迭代的 effect 重跑', keyLists.join(',') === 'a,a|c', keyLists);

  // 大小轨迹：1 → set b 2 → delete b 1 → set c 2 → clear 0
  map.clear();
  check('Map.clear ⇒ size 的 effect 重跑', sizes.join(',') === '1,2,1,2,0', sizes);

  const set = reactive(new Set(['x']));
  const setSizes = [];
  effect(() => setSizes.push(set.size));
  set.add('y');
  set.delete('x');
  check('Set.add/delete ⇒ size 的 effect 重跑', setSizes.join(',') === '1,2,1', setSizes);

  // 非字符串 key：dep 槽位只能是 string|symbol，必须回落到 ITERATE_KEY
  const numSet = reactive(new Set());
  const numSizes = [];
  effect(() => numSizes.push(numSet.size));
  numSet.add(1);
  check('Set<number>.add ⇒ size 的 effect 重跑', numSizes.join(',') === '0,1', numSizes);
  numSet.delete(1);
  check('Set<number>.delete ⇒ size 的 effect 重跑', numSizes.join(',') === '0,1,0', numSizes);

  const objKey = {};
  const objMap = reactive(new Map());
  const objSizes = [];
  effect(() => objSizes.push(objMap.size));
  objMap.set(objKey, 1);
  check('Map<object>.set 新增 ⇒ size 的 effect 重跑', objSizes.join(',') === '0,1', objSizes);
}

// ══════════════════════════════════════════════════════════
section('[3] computedSignal 在 getter 内追踪 reactive（不只 signal）');
{
  const state = reactive({ n: 1, deep: { x: 10 } });
  const doubled = computedSignal(() => state.n * 2);
  const seen = [];
  effect(() => seen.push(doubled()));

  check('computedSignal 初值正确', doubled() === 2, doubled());
  state.n = 2;
  // 负向对照：修复前 seen === [2]（computed 对 reactive 变化无感知）
  check('reactive 字段变化 ⇒ computedSignal 重算并通知', seen.join(',') === '2,4', seen);

  const nested = computedSignal(() => state.deep.x + 1);
  const nestedSeen = [];
  effect(() => nestedSeen.push(nested()));
  state.deep.x = 20;
  check('computedSignal 追踪嵌套 reactive 字段', nestedSeen.join(',') === '11,21', nestedSeen);

  // signal 依赖仍然有效（修复不能破坏原有路径）
  const src = signal(3);
  const tripled = computedSignal(() => src() * 3);
  const tripledSeen = [];
  effect(() => tripledSeen.push(tripled()));
  src.set(4);
  check('computedSignal 对 signal 依赖仍有效', tripledSeen.join(',') === '9,12', tripledSeen);

  // dispose 后不再响应
  doubled.dispose();
  state.n = 3;
  check('dispose 后 computedSignal 不再通知订阅者', seen.join(',') === '2,4', seen);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
