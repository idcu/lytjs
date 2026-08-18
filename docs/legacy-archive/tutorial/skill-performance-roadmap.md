# LytJS 性能优化与 ROADMAP 维护最佳实践

本技能文档介绍 LytJS 性能优化指南和 ROADMAP 维护的最佳实践，帮助开发者在项目中高效使用和维护 LytJS 框架。

## 📋 目录

1. [LytJS 性能优化指南](#lytjs-性能优化指南)
2. [ROADMAP 维护最佳实践](#roadmap-维护最佳实践)
3. [综合应用流程](#综合应用流程)

---

## LytJS 性能优化指南

### 核心性能特性

#### 1. Signal 细粒度响应式

LytJS 的 Signal 响应式系统实现了真正的细粒度更新，只更新变化的最小 DOM 节点：

```typescript
import { signal, computed, effect } from '@lytjs/reactivity';

const count = signal(0);
const name = signal('Alice');

// 只有 count 变化时，相关计算和 effect 才会重新执行
const fullName = computed(() => `${name()} - Count: ${count()}`);

effect(() => {
  console.log('Count changed:', count());
});
```

#### 2. Vapor 渲染模式

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

### 响应式性能优化

#### 避免不必要的响应式

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

#### 善用 computed 缓存

computed 会缓存计算结果，只在依赖变化时重新计算：

```typescript
const firstName = signal('John');
const lastName = signal('Doe');

// ✅ 好的做法：使用 computed 避免重复计算
const fullName = computed(() => {
  console.log('Computing fullName...');
  return `${firstName()} ${lastName()}`;
});
```

#### effect 清理

及时清理不再需要的 effect，避免内存泄漏和性能浪费：

```typescript
import { onCleanup } from '@lytjs/core';

setup() {
  const data = signal('');

  const stop = effect(() => {
    fetchData(data()).then(handleResponse);
  });

  onCleanup(() => {
    stop();
  });
}
```

### 组件渲染优化

#### 组件懒加载

路由懒加载减少初始包体积：

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    // 懒加载（异步加载）
    {
      path: '/about',
      component: () => import('./views/About.vue'),
    },
  ],
});
```

#### 合理使用 key

列表渲染时使用稳定的 key 帮助框架追踪变化：

```typescript
// ✅ 好的做法：使用稳定的唯一 ID 作为 key
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

// ❌ 避免：使用数组索引作为 key
<div v-for="(item, index) in items" :key="index">
  {{ item.name }}
</div>
```

### 列表渲染优化

#### 虚拟列表

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

### 状态管理优化

#### 选择性订阅

只订阅需要的状态片段：

```typescript
import { useStore } from '@lytjs/store';

// ✅ 好的做法：只订阅需要的状态
const userName = useStore('user', (state) => state.profile.name);
```

### 构建优化

#### Tree Shaking

确保使用 ES Module 导入以便 Tree Shaking 生效：

```typescript
// ✅ 好的做法：使用具名导入（支持 Tree Shaking）
import { Button, Input } from '@lytjs/ui';

// ❌ 避免：默认导入整个库（无法 Tree Shaking）
import LytUI from '@lytjs/ui';
```

#### 代码分割

使用动态 import 实现代码分割：

```typescript
// ✅ 好的做法：组件级别代码分割
const HeavyChart = () => import('./HeavyChart.vue');
```

### 网络性能优化

#### 请求缓存

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

### 内存管理

#### 避免内存泄漏

注意清理定时器、事件监听和 effect：

```typescript
setup() {
  let timer: number;

  onMounted(() => {
    timer = setInterval(() => {
      updateData();
    }, 1000);
  });

  onCleanup(() => {
    clearInterval(timer);
  });
}
```

### 性能分析工具

#### DevTools 性能面板

使用 DevTools 分析性能瓶颈：

```typescript
import { getPerformanceStats } from '@lytjs/devtools';

const stats = getPerformanceStats();
console.log('Render count:', stats.renderCount);
console.log('Average render time:', stats.avgRenderTime);
```

---

## ROADMAP 维护最佳实践

### 1. ROADMAP 文档结构维护

#### 定期审查和更新

定期（建议每月或每季度）审查 ROADMAP_NEXT_STEPS.md 文档，确保内容与实际项目状态同步：

1. **状态标记更新**：及时标记已完成的任务
2. **优先级调整**：根据项目进展调整任务优先级
3. **内容清理**：将已完成的任务历史移至 CHANGELOG.md

#### 关键检查点

- ✅ 所有验收标准是否符合实际
- ✅ 任务状态标记是否准确
- ✅ 下一步建议是否及时更新

### 2. Git 工作流与提交规范

#### 遵循 Conventional Commits

```bash
# 功能开发
git commit -m "feat(scope): 功能描述"

# 问题修复
git commit -m "fix(scope): 修复描述"

# 文档更新
git commit -m "docs: 更新 ROADMAP 文档"

# 重构
git commit -m "refactor(scope): 重构描述"
```

#### 内存问题处理

遇到 Husky 钩子导致内存问题时，使用 `--no-verify` 跳过：

```bash
git commit --no-verify -m "fix: 修复问题"
```

### 3. 类型安全维护

#### 定期运行类型检查

```bash
# 运行完整类型检查
pnpm type-check
```

#### 类型问题修复流程

1. **问题定位**：使用类型检查输出定位具体问题
2. **修复策略**：
   - 使用 `signalComputed` 替代 `computed` 避免类型冲突
   - 避免局部变量名与全局名称冲突
   - 简化复杂的类型定义
3. **验证修复**：
   - 运行类型检查确保通过
   - 运行相关测试确保功能正常

### 4. 测试覆盖维护

#### 官方插件测试策略

1. **逐个测试**：先单独测试各个插件
2. **核心优先**：优先确保核心插件测试通过
3. **特殊配置**：对于需要特殊环境的插件（如 plugin-vite），单独处理

#### 测试命令示例

```bash
# 测试单个插件
cd packages/plugins/packages/plugin-animation && pnpm test

# 测试所有插件
pnpm -r --filter '@lytjs/plugin-*' test
```

### 5. 构建流程维护

#### 编译器包构建

当需要解决子路径模块问题时，确保编译器包已构建：

```bash
cd packages/compiler && pnpm build
```

#### 完整构建检查

定期运行完整构建确保项目健康：

```bash
pnpm build
```

---

## 综合应用流程

### 完整的项目推进流程

#### 1. 初始检查

```bash
# 检查 Git 状态
git status
git branch

# 快速类型检查
pnpm type-check
```

#### 2. 任务选择

查看 [ROADMAP_NEXT_STEPS.md](file:///e:/trae/lytjs/docs/development/ROADMAP_NEXT_STEPS.md)，选择合适的任务：

- 🟢 高优先级：核心优势、用户痛点
- 🟡 中优先级：生态建设、体验优化
- 🟢 低优先级：长期探索、创新

#### 3. 开发实施

1. **创建功能分支**：

```bash
git checkout -b feature/your-feature-name
```

2. **开发并测试**：
   - 遵循性能优化指南
   - 确保类型安全
   - 编写或更新测试

3. **提交和推送**：

```bash
git add .
git commit --no-verify -m "feat: 描述你的功能"
git push origin feature/your-feature-name
```

#### 4. ROADMAP 更新

完成任务后，及时更新 ROADMAP_NEXT_STEPS.md：

1. 标记任务状态为 ✅ 已完成
2. 更新验收标准
3. 补充必要的说明文档
4. 更新下一步建议

#### 5. 文档同步

同步更新相关文档：

- 功能文档
- API 参考
- 示例代码

### 常见问题排查

#### 类型检查失败

1. 检查是否有 Signal 与 ComputedRef 混淆
2. 查看是否有命名冲突
3. 简化复杂的类型定义

#### 测试失败

1. 确保依赖包已构建
2. 检查测试环境配置
3. 使用单个包测试定位问题

#### 构建失败

1. 检查依赖是否完整
2. 查看构建配置
3. 清除缓存后重试

---

## 最佳实践总结

### 性能优化 checklist

- [ ] 只对需要响应式的数据使用 signal
- [ ] 使用 computed 缓存计算结果
- [ ] 及时清理 effect 和事件监听
- [ ] 使用 Vapor 模式提升性能
- [ ] 实现列表虚拟化
- [ ] 使用路由懒加载
- [ ] 启用 Tree Shaking

### ROADMAP 维护 checklist

- [ ] 定期审查和更新 ROADMAP
- [ ] 及时标记完成的任务
- [ ] 保持文档与代码同步
- [ ] 遵循 Git 提交规范
- [ ] 保持类型安全
- [ ] 维护测试覆盖

---

## 参考文档

- [性能优化指南](file:///e:/trae/lytjs/docs/tutorial/performance.md)
- [最佳实践](file:///e:/trae/lytjs/docs/tutorial/best-practices.md)
- [ROADMAP_NEXT_STEPS.md](file:///e:/trae/lytjs/docs/development/ROADMAP_NEXT_STEPS.md)
- [项目架构说明](file:///e:/trae/lytjs/docs/development/ARCHITECTURE.md)

---

**文档版本**: v1.0.0
**最后更新**: 2026-05-16
**维护者**: LytJS Team
