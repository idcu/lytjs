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
import { reactive, shallowReactive, readonly, shallowReadonly } from '@lytjs/reactivity'
```

### ref / shallowRef

创建响应式引用，适用于基本类型值

```typescript
import { ref, shallowRef } from '@lytjs/reactivity'
```

### computed

创建计算属性，自动追踪依赖并缓存结果

```typescript
import { computed } from '@lytjs/reactivity'
```

### watch / watchEffect

侦听响应式数据变化并执行副作用

```typescript
import { watch, watchEffect } from '@lytjs/reactivity'
```

### effect

创建自定义响应式副作用

```typescript
import { effect, stop } from '@lytjs/reactivity'
```

### toRef / toRefs / unref

响应式引用工具函数

```typescript
import { toRef, toRefs, unref } from '@lytjs/reactivity'
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/component](../component) - 组件系统，依赖响应式系统
