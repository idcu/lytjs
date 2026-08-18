# 响应式系统原理

深入解析 `@lytjs/reactivity` 的实现原理。

---

## 核心架构

```
@lytjs/reactivity
├── Signal 系统        ─── 细粒度响应式（Signal 模式）
├── Proxy 系统        ─── 基于 Proxy 的响应式（VNode 模式）
├── Effect 系统       ─── 副作用追踪与触发
├── Computed 系统     ─── 计算属性
├── Watch 系统        ─── 侦听器
└── Batch 系统       ─── 批量更新优化
```

---

## Signal 系统

Signal 是 LytJS 最细粒度的响应式单元。

### Signal vs Proxy

| 特性     | Signal                         | Proxy (reactive)      |
| -------- | ------------------------------ | --------------------- |
| 粒度     | 节点级                         | 对象级                |
| 更新范围 | 精确到单一值                   | 整个对象              |
| 性能     | 极快（无 diff）                | 中等（需 diff）       |
| API      | `signal()`, `computedSignal()` | `reactive()`, `ref()` |

### Signal 实现原理

```ts
// 简化版 Signal 实现
class SignalImpl<T> {
  subscribers = new Set<() => void>();
  _value: T;

  constructor(value: T) {
    this._value = value;
  }

  get() {
    // 如果在 effect 中，自动收集依赖
    if (activeSubscriber) {
      this.subscribers.add(activeSubscriber);
      activeSubscriber._deps.add(this);
    }
    return this._value;
  }

  set(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      // 通知所有订阅者
      this.subscribers.forEach((fn) => fn());
    }
  }
}
```

### Signal 的优势

1. **精确追踪** — 只需订阅使用的属性
2. **无 VDOM** — Signal 直接驱动 DOM 更新
3. **零开销读取** — 普通属性访问，无 proxy 包装

---

## Proxy 系统

### reactive() 实现原理

```ts
function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      // 依赖收集
      if (activeEffect) {
        track(target, key);
      }
      // 深层响应式
      if (isObject(result)) {
        return reactive(result);
      }
      return result;
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver);
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        // 触发更新
        trigger(target, key);
      }
      return result;
    },
  });
}
```

### ref() 实现原理

ref 将基本类型包装为响应式对象：

```ts
class RefImpl<T> {
  private _value: T;
  public dep = new Set();

  constructor(value: T) {
    this._value = value;
  }

  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newValue: T) {
    if (hasChanged(newValue, this._value)) {
      this._value = newValue;
      triggerRefValue(this);
    }
  }
}
```

---

## Effect 系统

Effect 是响应式更新的执行单元。

### 依赖收集与触发

```
追踪读取     追踪设置
   ↓           ↑
┌─────────────────────┐
│    activeEffect     │
│  (当前执行的 effect) │
└─────────────────────┘
   ↓           ↑
 track()    trigger()
   ↑           ↓
┌─────────────────────┐
│     targetMap       │
│  WeakMap<obj, Map<key, Dep>>
└─────────────────────┘
   ↑           ↓
 WeakMap    WeakMap
    └────┬────┘
         ↓
    Dep = Set<ReactiveEffect>
```

### 关键函数

| 函数                | 说明            |
| ------------------- | --------------- |
| `track()`           | 收集依赖        |
| `trigger()`         | 触发更新        |
| `trackRefValue()`   | ref 依赖收集    |
| `triggerRefValue()` | ref 触发更新    |
| `trackEffect()`     | effect 依赖收集 |
| `triggerEffects()`  | effect 触发     |

---

## Computed 系统

Computed 使用懒加载 + 缓存优化：

```ts
class ComputedRefImpl<T> {
  _dirty = true; // 懒计算标记
  _value!: T; // 缓存值

  get value() {
    trackRefValue(this);
    if (this._dirty) {
      this._value = this.effect.run();
      this._dirty = false; // 计算后缓存
    }
    return this._value;
  }
}
```

**特性：**

1. 懒计算 — 仅在首次访问时计算
2. 缓存 — 依赖不变时不重新计算
3. 循环检测 — 自动检测循环依赖

---

## Watch 系统

### watch vs watchEffect

| 特性       | watch  | watchEffect    |
| ---------- | ------ | -------------- |
| 手动指定源 | ✅     | ❌（自动追踪） |
| 旧值       | ✅     | ❌             |
| 立即执行   | 可配置 | ✅             |
| 性能       | 中等   | 较重           |

### watch 实现原理

```ts
watch(source, callback, options) {
  // 1. 创建 effect
  const getter = () => source.value
  const effect = new ReactiveEffect(getter)

  // 2. 调度器
  const job = () => {
    const newValue = effect.run()
    if (hasChanged(newValue, oldValue)) {
      callback(newValue, oldValue)
      oldValue = newValue
    }
  }

  // 3. 响应式调度
  effect.scheduler = () => queueJob(job)
}
```

---

## 批量更新

批量更新避免重复渲染：

```ts
// 传统方式：多次触发
a.value = 1;
b.value = 2;
// → 2 次渲染

// 批量方式：一次渲染
batch(() => {
  a.value = 1;
  b.value = 2;
});
// → 1 次渲染
```

### 实现原理

```ts
let isBatching = false;
const queue: (() => void)[] = [];

function batch(fn: () => void) {
  if (!isBatching) {
    isBatching = true;
    fn();
    flushQueue();
    isBatching = false;
  } else {
    fn();
  }
}

function flushQueue() {
  queue.forEach((job) => job());
  queue.length = 0;
}
```

---

## 扩展阅读

- [API 参考 - reactivity](../api/reactivity) — 完整 API 文档
- [渲染模式](../guide/rendering-modes) — Signal 与 VNode 模式对比
- [组合式 API](../guide/composition-api) — 响应式最佳实践
