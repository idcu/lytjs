# @lytjs/reactivity

> LytJS 响应式系统，提供 ref、reactive、computed、watch 等核心响应式原语

## 安装

```bash
npm install @lytjs/reactivity
```

## 核心 API

### reactive / shallowReactive / readonly / shallowReadonly

创建响应式对象，支持深层/浅层响应和只读模式

```typescript
import { reactive, shallowReactive, readonly, shallowReadonly } from '@lytjs/reactivity';
```

### ref / shallowRef

创建响应式引用，适用于基本类型值

```typescript
import { ref, shallowRef } from '@lytjs/reactivity';
```

### computed

创建计算属性，自动追踪依赖并缓存结果

```typescript
import { computed } from '@lytjs/reactivity';
```

### watch / watchEffect

侦听响应式数据变化并执行副作用

```typescript
import { watch, watchEffect } from '@lytjs/reactivity';
```

### effect

创建自定义响应式副作用

```typescript
import { effect, stop } from '@lytjs/reactivity';
```

### toRef / toRefs / unref

响应式引用工具函数

```typescript
import { toRef, toRefs, unref } from '@lytjs/reactivity';
```

## 边界行为与已知限制

### `batch()` 嵌套行为

`batch()` 支持嵌套调用。内层 `batch` 不会影响外层的追踪恢复，因为内部使用栈（`trackStack`）记录追踪状态，嵌套结束时只会恢复到当前 `batch` 调用前的栈长度。

```typescript
import { batch, effect } from '@lytjs/reactivity';

batch(() => {
  // 追踪已暂停
  batch(() => {
    // 追踪仍处于暂停状态
  });
  // 内层 batch 结束后，追踪仍处于暂停状态（由外层 batch 控制）
});
// 外层 batch 结束后，追踪恢复正常
```

### `signal()` 的 undefined 参数歧义

`signal()` 通过 `arguments.length` 来区分读取操作和写入操作。当传入 `undefined` 作为参数时，由于 `arguments.length > 0` 为 `true`，它会被视为**写入操作**而非读取操作。

如果泛型参数 `T` 本身包含 `undefined`（例如 `signal<number | undefined>(undefined)`），首次调用 `signal()` 时会正确初始化为 `undefined`，但后续调用 `sig(undefined)` 也会触发写入逻辑（通过 `hasChanged` 判断值是否变化）。

```typescript
import { signal } from '@lytjs/reactivity';

const sig = signal<number | undefined>(42);
sig(undefined); // 写入操作：将值设为 undefined
sig(); // 读取操作：返回 undefined
```

### `computedSignal.stop()` 方法

`computedSignal()` 返回的 `ComputedSignal` 对象提供一个 `stop()` 方法，用于停止该计算信号的响应式追踪。调用后：

- 计算信号不再自动追踪依赖变化
- 后续访问将返回最后一次缓存的值（开发模式下会输出警告）
- 依赖该计算信号的其他 effect 不会再因依赖变化而被触发

```typescript
import { computedSignal, signal } from '@lytjs/reactivity';

const count = signal(1);
const doubled = computedSignal(() => count() * 2);

doubled(); // 2
doubled.stop(); // 停止响应式追踪
count.set(10);
doubled(); // 2（仍返回缓存值，不再更新）
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/component](../component) - 组件系统，依赖响应式系统
