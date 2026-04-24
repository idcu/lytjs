# Reactivity 响应式系统

欢迎来到 Lyt.js 最核心的模块！响应式系统是框架的基石，理解它将让你成为 Lyt.js 高手。

## 🎯 什么是响应式？

简单来说，**响应式就是数据变化时自动更新**。

```typescript
// 普通代码
let count = 0
console.log(count) // 0
count = 1
// 不会自动重新打印！

// 响应式代码
import { reactive, effect } from '@lytjs/reactivity'

const state = reactive({ count: 0 })
effect(() => console.log(state.count)) // 0
state.count++ // 自动重新打印！输出 1
```

这就是响应式的魔力！

## 🏗️ 整体架构

Reactivity 模块由以下核心部分组成：

```
reactivity/
├── effect.ts          # 副作用系统（核心！）
├── reactive.ts        # 响应式代理（Proxy）
├── ref.ts             # Ref 引用类型
├── computed.ts        # 计算属性
└── watch.ts           # 侦听器
```

**源代码位置**：`packages/reactivity/src/`

## 🔑 核心概念

### 1. 副作用（Effect）

**副作用**就是一段依赖响应式数据的代码。当数据变化时，这段代码会自动重新执行。

```typescript
import { reactive, effect } from '@lytjs/reactivity'

const state = reactive({ count: 0 })

// 创建副作用
effect(() => {
  console.log('count is:', state.count)
})

// 输出: count is: 0

state.count++
// 自动输出: count is: 1
```

### 2. 依赖收集（Track）

当你读取响应式数据时，系统会记录下"谁在使用这个数据"。

```
读取 state.count
    ↓
track() 被调用
    ↓
记录：这个 effect 依赖 state.count
```

### 3. 触发更新（Trigger）

当你修改响应式数据时，系统会通知所有依赖这个数据的副作用重新执行。

```
修改 state.count
    ↓
trigger() 被调用
    ↓
找到所有依赖 state.count 的 effect
    ↓
重新执行这些 effect
```

## 📦 完整的源代码文件

以下是你需要阅读的核心文件：

### effect.ts - 副作用系统（推荐首先阅读）

**位置**：`packages/reactivity/src/effect.ts`

**核心功能**：
- `ReactiveEffect` 类 - 副作用类
- `track()` 函数 - 依赖收集
- `trigger()` 函数 - 触发更新

### reactive.ts - 响应式代理

**位置**：`packages/reactivity/src/reactive.ts`

**核心功能**：
- `reactive()` 函数 - 创建响应式代理
- `reactiveMap` WeakMap - 缓存代理对象
- Proxy handlers - 各种拦截器

### ref.ts - Ref 引用类型

**位置**：`packages/reactivity/src/ref.ts`

**核心功能**：
- `ref()` 函数 - 创建 Ref
- `isRef()` 函数 - 判断是否是 Ref
- `unref()` 函数 - 解包 Ref

### computed.ts - 计算属性

**位置**：`packages/reactivity/src/computed.ts`

**核心功能**：
- `computed()` 函数 - 创建计算属性
- 缓存机制
- 懒计算

### watch.ts - 侦听器

**位置**：`packages/reactivity/src/watch.ts`

**核心功能**：
- `watch()` 函数 - 侦听数据变化
- `watchEffect()` 函数 - 立即执行的侦听器

## 💡 推荐阅读顺序

1. **effect.ts** - 理解副作用和依赖收集
2. **reactive.ts** - 理解 Proxy 实现
3. **ref.ts** - 理解基本类型响应式
4. **computed.ts** - 理解计算属性
5. **watch.ts** - 理解侦听器

## 🧪 测试用例

所有核心功能都有对应的测试文件，可以帮助你学习：

**位置**：`packages/reactivity/__tests__/`

主要测试文件：
- `reactivity.test.ts` - 响应式测试
- `ref.test.ts` - Ref 测试
- `computed.test.ts` - 计算属性测试
- `watch.test.ts` - 侦听器测试

## 🎮 动手实践

让我们自己实现一个迷你响应式系统！

### 1. 实现 track 和 trigger

```typescript
// 存储依赖关系
const targetMap = new WeakMap()
let activeEffect = null

// 依赖收集
function track(target, key) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let deps = depsMap.get(key)
  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }

  deps.add(activeEffect)
}

// 触发更新
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const deps = depsMap.get(key)
  if (deps) {
    deps.forEach(effect => effect())
  }
}
```

### 2. 实现 reactive

```typescript
function reactive(target) {
  return new Proxy(target, {
    get(target, key) {
      track(target, key)
      const res = Reflect.get(target, key)
      return typeof res === 'object' && res !== null
        ? reactive(res)
        : res
    },
    set(target, key, value) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value)
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    }
  })
}
```

### 3. 实现 effect

```typescript
function effect(fn) {
  const effectFn = () => {
    activeEffect = effectFn
    fn()
    activeEffect = null
  }
  effectFn()
}
```

### 测试一下

```typescript
const state = reactive({ count: 0 })

effect(() => {
  console.log('count:', state.count)
})

state.count++
```

恭喜！你实现了一个迷你响应式系统！🎉

## 📚 相关文档

- [compiler](./02-compiler.md) - 了解模板编译
- [renderer](./03-renderer.md) - 了解渲染器
- [模块组装](../advanced/01-module-assembly.md) - 了解模块如何组装
