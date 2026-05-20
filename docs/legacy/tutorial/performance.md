# 性能优化

LytJS 通过多种机制确保卓越的性能表现。本文详细介绍如何充分利用框架的性能特性，以及常见场景下的优化技巧。

## 性能核心特性

### Signal 细粒度响应式

LytJS 基于 Signal 的响应式系统实现了真正的细粒度更新，只更新变化的最小 DOM 节点。

```typescript
import { signal, computed, effect } from '@lytjs/reactivity';

const count = signal(0);
const name = signal('Alice');

// 只有 count 变化时，fullName 才会重新计算
const fullName = computed(() => `${name()} - Count: ${count()}`);

// 只有这个 effect 会执行，fullName 的消费者不会受影响
effect(() => {
  console.log('Count changed:', count());
});
```

### Vapor 渲染模式

Vapor 渲染模式跳过虚拟 DOM 直接操作真实 DOM，提供接近原生 JavaScript 的性能：

```typescript
import { createApp } from '@lytjs/core';

const app = createApp({
  setup() {
    const count = signal(0);
    return { count };
  },
  vapor: true, // 启用 Vapor 模式
});

app.mount('#app');
```

## 响应式性能优化

### 避免不必要的响应式

只对需要响应式更新的数据使用 signal：

```typescript
// ✅ 好的做法：只对需要变化的数据使用 signal
const userId = signal(1);
const isLoading = signal(false);
const userData = signal<User | null>(null);

// ❌ 避免：对静态数据使用 signal
const API_BASE_URL = signal('https://api.example.com');
const MAX_RETRY_COUNT = signal(3);
```

### 善用 computed 缓存

computed 会缓存计算结果，只在依赖变化时重新计算：

```typescript
const firstName = signal('John');
const lastName = signal('Doe');

// ✅ 好的做法：使用 computed 避免重复计算
const fullName = computed(() => {
  console.log('Computing fullName...');
  return `${firstName()} ${lastName()}`;
});

console.log(fullName()); // 输出: "Computing fullName..." 和 "John Doe"
console.log(fullName()); // 直接返回缓存: "John Doe"（无日志）

// ❌ 避免：在 effect 或模板中重复计算
effect(() => {
  const full = `${firstName()} ${lastName()}`; // 每次都重新计算
});
```

### effect 清理

及时清理不再需要的 effect，避免内存泄漏和性能浪费：

```typescript
import { onCleanup } from '@lytjs/core';

setup() {
  const data = signal('');

  const stop = effect(() => {
    // 监听变化并发送请求
    fetchData(data()).then(handleResponse);
  });

  // ✅ 好的做法：组件卸载时清理 effect
  onCleanup(() => {
    stop();
  });
}
```

## 组件渲染优化

### 组件懒加载

路由懒加载减少初始包体积：

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 直接导入（同步加载）
    { path: '/', component: Home },

    // 懒加载（异步加载）
    {
      path: '/about',
      component: () => import('./views/About.vue'),
    },
    {
      path: '/users',
      component: () => import('./views/Users.vue'),
    },
  ],
});
```

### 组件按需引入

只导入使用到的组件，减少打包体积：

```typescript
// ✅ 好的做法：按需导入组件
import { Button } from '@lytjs/ui';
import { Input } from '@lytjs/ui';
import { Dialog } from '@lytjs/ui';

// ❌ 避免：导入整个 UI 库
import LytUI from '@lytjs/ui';
```

### 合理使用 key

列表渲染时使用稳定的 key 帮助框架追踪变化：

```typescript
// ✅ 好的做法：使用稳定的唯一 ID 作为 key
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

// ✅ 好的做法：多字段组合
<div v-for="item in items" :key="`${item.type}-${item.id}`">
  {{ item.name }}
</div>

// ❌ 避免：使用数组索引作为 key（会导致渲染错误）
<div v-for="(item, index) in items" :key="index">
  {{ item.name }}
</div>
```

## 列表渲染优化

### 虚拟列表

大数据量列表使用虚拟列表，只渲染可见区域：

```typescript
import { VirtualList } from '@lytjs/ui';

const largeData = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
}));

<VirtualList
  :items="largeData"
  :item-height="50"
  :visible-count="10"
>
  <template #default="{ item }">
    <div class="list-item">{{ item.name }}</div>
  </template>
</VirtualList>
```

### 分页加载

大量数据采用分页而非一次性加载：

```typescript
const currentPage = signal(1);
const pageSize = signal(20);
const totalItems = signal(1000);

const paginatedData = computed(() => {
  const start = (currentPage() - 1) * pageSize();
  const end = start + pageSize();
  return allData().slice(start, end);
});
```

## 状态管理优化

### 选择性订阅

只订阅需要的状态片段：

```typescript
import { useStore } from '@lytjs/store';

// ✅ 好的做法：只订阅需要的状态
const userName = useStore('user', (state) => state.profile.name);

// ❌ 避免：订阅整个 store
const store = useStore('user');
const name = computed(() => store.state.profile.name);
```

### 状态范式化

使用范式化数据结构减少更新范围：

```typescript
// ✅ 好的做法：范式化数据
const normalizedData = {
  users: {
    '1': { id: '1', name: 'Alice', postIds: ['a', 'b'] },
    '2': { id: '2', name: 'Bob', postIds: ['c'] },
  },
  posts: {
    a: { id: 'a', title: 'Post A' },
    b: { id: 'b', title: 'Post B' },
    c: { id: 'c', title: 'Post C' },
  },
};

// ❌ 避免：嵌套过深的树状结构
const denormalizedData = [
  {
    id: '1',
    name: 'Alice',
    posts: [
      { id: 'a', title: 'Post A' },
      { id: 'b', title: 'Post B' },
    ],
  },
];
```

## 构建优化

### Tree Shaking

确保使用 ES Module 导入以便 Tree Shaking 生效：

```typescript
// ✅ 好的做法：使用具名导入（支持 Tree Shaking）
import { Button, Input } from '@lytjs/ui';

// ❌ 避免：默认导入整个库（无法 Tree Shaking）
import LytUI from '@lytjs/ui';
```

### 代码分割

使用动态 import 实现代码分割：

```typescript
// ✅ 好的做法：组件级别代码分割
const HeavyChart = () => import('./HeavyChart.vue');

// ✅ 好的做法：条件加载
const plugin = condition ? import('./plugin-a') : import('./plugin-b');
```

### 生产构建

使用生产构建获取压缩和优化后的代码：

```bash
# 开发构建
pnpm build:dev

# 生产构建（自动压缩和优化）
pnpm build
```

## 网络性能优化

### 请求缓存

使用缓存避免重复请求：

```typescript
import { createCache } from '@lytjs/common-cache';

const userCache = createCache({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 分钟
});

const fetchUser = async (id: string) => {
  return userCache.getOrSet(id, () => api.getUser(id));
};
```

### 请求防抖

高频请求使用防抖：

```typescript
import { debounce } from '@lytjs/common-timing';

const searchQuery = signal('');

// 300ms 防抖
const debouncedSearch = debounce((query: string) => {
  api.search(query).then((results) => {
    searchResults.set(results);
  });
}, 300);

effect(() => {
  debouncedSearch(searchQuery());
});
```

## 内存管理

### 避免内存泄漏

注意清理定时器、事件监听和 effect：

```typescript
setup() {
  let timer: number;

  // ✅ 好的做法：清理定时器
  onMounted(() => {
    timer = setInterval(() => {
      updateData();
    }, 1000);
  });

  onCleanup(() => {
    clearInterval(timer);
  });

  // ✅ 好的做法：清理事件监听
  const handleResize = () => {
    updateLayout();
  };

  window.addEventListener('resize', handleResize);

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
  });
}
```

### 大对象处理

避免在响应式状态中存储大型对象：

```typescript
// ❌ 避免：存储大对象在 signal 中
const largeData = signal(generateLargeObject()); // 每次都复制

// ✅ 好的做法：使用 ref 存储大对象引用
const largeData = ref<LargeObject | null>(null);

onMounted(() => {
  largeData.value = generateLargeObject();
});
```

## 性能分析工具

### DevTools 性能面板

使用 DevTools 分析性能瓶颈：

```typescript
import { getPerformanceStats } from '@lytjs/devtools';

// 查看性能统计
const stats = getPerformanceStats();
console.log('Render count:', stats.renderCount);
console.log('Average render time:', stats.avgRenderTime);
```

### 性能指标

关键性能指标监控：

```typescript
import { recordMetric } from '@lytjs/common-performance';

// 记录自定义指标
recordMetric('api_response_time', duration);
recordMetric('render_count', count);
```

## 常见性能问题排查

### 组件频繁重新渲染

检查点：

1. 是否在 render 中创建新的对象或函数？
2. 是否正确使用了 memo 或 computed？
3. props 是否稳定？

### 内存占用过高

检查点：

1. 是否有未清理的 effect？
2. 是否有未移除的事件监听？
3. 大型数据是否正确处理？

### 首屏加载慢

检查点：

1. 是否启用了代码分割？
2. 第三方依赖是否过大？
3. 是否使用了懒加载？

## 性能基准

LytJS 在标准硬件上的性能基准：

| 操作                  | 平均耗时 |
| --------------------- | -------- |
| signal 读取           | < 0.01ms |
| signal 写入           | < 0.05ms |
| computed 计算         | < 0.1ms  |
| 1000 节点 diff        | < 5ms    |
| 列表渲染 (1000 items) | < 10ms   |

## 总结

性能优化是一个持续的过程。建议：

1. **测量先行**：使用 DevTools 定位瓶颈
2. **优化有度**：避免过度优化
3. **关注用户体验**：首屏加载和交互响应最重要
4. **持续监控**：建立性能回归检测机制

遵循这些最佳实践，你的 LytJS 应用将保持卓越的性能表现。
