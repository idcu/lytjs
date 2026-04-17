/**
 * Lyt.js Reactivity Benchmark — 响应式系统基准测试
 *
 * 测试场景：
 * 1. reactive 对象创建性能（1000 / 10000 个属性）
 * 2. computed 计算属性求值性能
 * 3. watch 触发性能（修改 1 个属性触发 N 个 watcher）
 * 4. 深层响应式代理性能（10 层嵌套）
 *
 * 运行方式：
 *   node benchmarks/reactivity.bench.js
 *
 * 纯原生零依赖实现，内联了响应式系统的核心逻辑用于基准测试。
 */

'use strict';

const { BenchmarkSuite } = require('./runner');

// ============================================================
// 内联响应式系统（从 @lyt/reactivity 提取的核心逻辑）
// ============================================================

const ITERATE_KEY = Symbol('iterate');
const rawSymbol = Symbol('raw');
const reactiveFlag = Symbol('reactive');

const targetMap = new WeakMap();
let activeEffect = null;
const effectStack = [];

function isObject(val) {
  return val !== null && typeof val === 'object';
}

function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

// ---- ReactiveEffect ----

class ReactiveEffect {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.deps = new Set();
    this.active = true;
    this.id = ReactiveEffect._id++;
  }

  run() {
    if (!this.active) return this.fn();
    if (effectStack.includes(this)) return this.fn();
    try {
      effectStack.push(this);
      activeEffect = this;
      cleanupEffect(this);
      return this.fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1] || null;
    }
  }

  stop() {
    if (this.active) {
      cleanupEffect(this);
      this.active = false;
    }
  }
}
ReactiveEffect._id = 0;

function cleanupEffect(effect) {
  for (const dep of effect.deps) {
    dep.delete(effect);
  }
  effect.deps.clear();
}

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.add(dep);
  }
}

function trigger(target, key, type) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const effectsToRun = new Set();
  const addEffects = (dep) => {
    if (!dep) return;
    for (const effect of dep) {
      if (effect !== activeEffect) effectsToRun.add(effect);
    }
  };
  addEffects(depsMap.get(key));
  if (type === 'add' || type === 'delete') {
    addEffects(depsMap.get(ITERATE_KEY));
  }
  for (const effect of effectsToRun) {
    if (effect.scheduler) {
      effect.scheduler(effect);
    } else {
      effect.run();
    }
  }
}

// ---- reactive ----

const proxyMap = new WeakMap();

const mutableHandlers = {
  get(target, key, receiver) {
    if (key === rawSymbol) return target;
    if (key === reactiveFlag) return true;
    track(target, key);
    const res = Reflect.get(target, key, receiver);
    if (!isObject(res)) return res;
    return reactive(res);
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    const hadKey = hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    if (target === receiver?.[rawSymbol] || target === toRaw(receiver)) {
      if (hadKey) {
        if (hasChanged(value, oldValue)) trigger(target, key, 'set');
      } else {
        trigger(target, key, 'add');
      }
    }
    return result;
  },
  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) trigger(target, key, 'delete');
    return result;
  },
};

function reactive(target) {
  if (!isObject(target)) return target;
  if (target[reactiveFlag]) return target;
  const existingProxy = proxyMap.get(target);
  if (existingProxy) return existingProxy;
  const proxy = new Proxy(target, mutableHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}

function toRaw(observed) {
  const raw = observed && observed[rawSymbol];
  return raw ? toRaw(raw) : observed;
}

// ---- computed ----

class ComputedRefImpl {
  constructor(getter) {
    this._value = undefined;
    this._dirty = true;
    this.__v_isRef = true;
    this.deps = new Set();
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        this.triggerDep();
      }
    });
  }

  get value() {
    track(this, 'value');
    if (this._dirty) {
      this._value = this._effect.run();
      this._dirty = false;
    }
    return this._value;
  }

  triggerDep() {
    for (const effect of this.deps) {
      if (effect.scheduler) {
        effect.scheduler(effect);
      } else {
        effect.run();
      }
    }
  }
}

function computed(getter) {
  return new ComputedRefImpl(getter);
}

// ---- effect / watch ----

function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  runner.stop = () => _effect.stop();
  return runner;
}

function watch(source, cb) {
  const getter = typeof source === 'function' ? source : () => source;
  let oldValue = getter();
  const _effect = new ReactiveEffect(getter, () => {
    const newValue = _effect.run();
    if (!Object.is(newValue, oldValue)) {
      cb(newValue, oldValue);
      oldValue = newValue;
    }
  });
  _effect.run();
  return () => _effect.stop();
}

// ============================================================
// 基准测试
// ============================================================

const suite = new BenchmarkSuite('Lyt.js Reactivity');

// ---- 1. reactive 对象创建性能 ----

suite.addTest('reactive 创建 (1000 属性)', () => {
  const obj = {};
  for (let i = 0; i < 1000; i++) {
    obj[`key_${i}`] = i;
  }
  reactive(obj);
});

suite.addTest('reactive 创建 (10000 属性)', () => {
  const obj = {};
  for (let i = 0; i < 10000; i++) {
    obj[`key_${i}`] = i;
  }
  reactive(obj);
});

// ---- 2. computed 计算属性求值性能 ----

suite.addTest('computed 求值 (首次)', () => {
  const state = reactive({ a: 1, b: 2, c: 3 });
  const sum = computed(() => state.a + state.b + state.c);
  // 每次创建新的 computed 并读取 value
  return sum.value;
});

suite.addTest('computed 求值 (缓存命中)', () => {
  // state 在外部创建，computed 也只创建一次
  // 这里测试缓存命中的速度
  const state = reactive({ a: 1, b: 2, c: 3 });
  const sum = computed(() => state.a + state.b + state.c);
  sum.value; // 首次计算
  return sum.value; // 缓存命中
});

suite.addTest('computed 求值 (依赖变化后重算)', () => {
  const state = reactive({ a: 1, b: 2, c: 3 });
  const sum = computed(() => state.a + state.b + state.c);
  sum.value; // 首次计算
  state.a = 10; // 触发 dirty
  return sum.value; // 重算
});

// ---- 3. watch 触发性能 ----

suite.addTest('watch 触发 (1 属性 -> 10 watchers)', () => {
  const state = reactive({ value: 0 });
  let count = 10;
  const stoppers = [];
  for (let i = 0; i < count; i++) {
    stoppers.push(watch(() => state.value, () => {}));
  }
  state.value = 1;
  stoppers.forEach(s => s());
});

suite.addTest('watch 触发 (1 属性 -> 100 watchers)', () => {
  const state = reactive({ value: 0 });
  let count = 100;
  const stoppers = [];
  for (let i = 0; i < count; i++) {
    stoppers.push(watch(() => state.value, () => {}));
  }
  state.value = 1;
  stoppers.forEach(s => s());
});

// ---- 4. 深层响应式代理性能 ----

suite.addTest('深层响应式 (10 层嵌套) 创建', () => {
  let obj = { value: 0 };
  for (let i = 0; i < 10; i++) {
    obj = { nested: obj };
  }
  reactive(obj);
});

suite.addTest('深层响应式 (10 层嵌套) 读取', () => {
  let obj = { value: 0 };
  for (let i = 0; i < 10; i++) {
    obj = { nested: obj };
  }
  const proxy = reactive(obj);
  // 逐层访问到底部
  let current = proxy;
  for (let i = 0; i < 10; i++) {
    current = current.nested;
  }
  return current.value;
});

suite.addTest('深层响应式 (10 层嵌套) 写入触发', () => {
  let obj = { value: 0 };
  for (let i = 0; i < 10; i++) {
    obj = { nested: obj };
  }
  const proxy = reactive(obj);
  // 先收集依赖
  let current = proxy;
  for (let i = 0; i < 10; i++) {
    current = current.nested;
  }
  effect(() => { current.value; });
  // 修改底层值
  current.value = 1;
});

// ---- 5. effect 依赖收集与触发 ----

suite.addTest('effect 依赖收集 (100 个属性)', () => {
  const obj = {};
  for (let i = 0; i < 100; i++) {
    obj[`key_${i}`] = i;
  }
  const state = reactive(obj);
  const runner = effect(() => {
    for (let i = 0; i < 100; i++) {
      state[`key_${i}`];
    }
  });
  runner.stop();
});

suite.addTest('effect 触发 (修改 1 个属性)', () => {
  const obj = {};
  for (let i = 0; i < 100; i++) {
    obj[`key_${i}`] = i;
  }
  const state = reactive(obj);
  let triggerCount = 0;
  const runner = effect(() => {
    for (let i = 0; i < 100; i++) {
      state[`key_${i}`];
    }
    triggerCount++;
  });
  state.key_0 = 999;
  runner.stop();
});

// ---- 运行 ----

const iterations = parseInt(process.argv[2], 10) || 1000;
suite.run(iterations);
