# @lytjs/reactivity

LytJS 响应式系统 -- 提供 signal、ref、reactive、computed、watch、effect 等核心响应式原语。

## 特性

- **Signal API**: 现代化的细粒度响应式原语
- **Reactive Proxy**: 基于 Proxy 的深层响应式对象
- **Ref**: 包装式的响应式引用
- **Computed**: 自动缓存的可计算值
- **Watch**: 声明式数据侦听器
- **Effect**: 副作用管理

## 安装

```bash
pnpm add @lytjs/reactivity
```

## 使用

### Signal

```typescript
import { signal, computedSignal, set, update } from '@lytjs/reactivity/signal';

const count = signal(0);
const doubled = computedSignal(() => count() * 2);

console.log(doubled()); // 0
set(count, 1);
console.log(doubled()); // 2
update(count, n => n + 1);
console.log(doubled()); // 4
```

### Reactive

```typescript
import { reactive, computed, watch } from '@lytjs/reactivity';

const state = reactive({ count: 0 });
const doubled = computed(() => state.count * 2);

watch(doubled, (newVal) => {
  console.log(`doubled changed to: ${newVal}`);
});

state.count = 1; // 输出: doubled changed to: 2
```

### Ref

```typescript
import { ref, computed, watchEffect } from '@lytjs/reactivity';

const count = ref(0);
const doubled = computed(() => count.value * 2);

watchEffect(() => {
  console.log(doubled.value);
});

count.value++; // 输出: 2
```

## API

| API | 说明 |
|-----|------|
| `reactive()` | 创建深层响应式对象 |
| `shallowReactive()` | 创建浅层响应式对象 |
| `readonly()` | 创建只读响应式对象 |
| `ref()` | 创建 ref |
| `shallowRef()` | 创建浅层 ref |
| `computed()` | 创建计算属性 |
| `watch()` | 侦听数据源变化 |
| `watchEffect()` | 自动追踪依赖的副作用 |
| `effect()` | 创建原始副作用 |
| `signal()` | 创建 signal |
| `computedSignal()` | 创建计算 signal |

## 子路径入口

- `@lytjs/reactivity` -- 主入口（reactive/ref/computed/watch/effect）
- `@lytjs/reactivity/signal` -- Signal API
- `@lytjs/reactivity/signal-component` -- Signal 组件集成

## 依赖

- `@lytjs/common-is` -- 类型判断工具
- `@lytjs/common-scheduler` -- 调度器（nextTick）
- `@lytjs/common-env` -- 环境检测
- `@lytjs/common-error` -- 错误处理

## License

MIT
