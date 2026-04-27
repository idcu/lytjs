# Lyt.js 性能基准测试

## 目录

- [简介](#简介)
- [运行基准测试](#运行基准测试)
  - [响应式系统性能测试](#响应式系统性能测试)
  - [VDOM 性能测试](#vdom-性能测试)
  - [Vapor Mode 性能测试](#vapor-mode-性能测试)
  - [JS Framework Benchmark](#js-framework-benchmark)
- [性能优化指南](#性能优化指南)
- [基准测试结果](#基准测试结果)
  - [响应式系统性能](#响应式系统性能)
  - [VDOM 性能](#vdom-性能)
  - [Vapor Mode 性能](#vapor-mode-性能)
  - [打包体积](#打包体积)
- [持续性能监控](#持续性能监控)
- [贡献性能优化](#贡献性能优化)

## 简介

Lyt.js 内置了完整的性能基准测试套件，用于：
- 监控框架核心性能
- 对比不同版本的性能变化
- 验证性能优化的效果
- 提供性能优化建议

## 运行基准测试

### 响应式系统性能测试

```bash
node --experimental-vm-modules benchmarks/reactivity.bench.js
```

测试内容：
- reactive() 创建性能
- ref() 创建性能
- signal() 创建性能
- 响应式读写性能
- computed 缓存性能
- watch 触发性能
- 大型响应式对象性能
- 深层响应式性能

### VDOM 性能测试

```bash
node benchmarks/vdom.bench.js [iterations]
```

测试内容：
- VNode 创建性能（1000/10000节点）
- Diff 全量对比性能
- 列表 Diff 性能（增删改查）
- PatchFlag 精确更新性能

### Vapor Mode 性能测试

```bash
node benchmarks/vapor.bench.js
```

Vapor Mode 是 Lyt.js 的高性能渲染模式，跳过虚拟 DOM 层直接操作真实 DOM。此基准测试覆盖以下核心操作：

| 测试项 | 说明 |
|--------|------|
| Signal 创建 | 测试响应式信号的创建开销（10,000 次） |
| Signal 读取 | 测试信号读取性能（100,000 次） |
| Signal 更新 | 测试信号更新及通知订阅者的开销（10,000 次） |
| bindText 创建 | 测试文本绑定创建性能（1,000 次） |
| bindProp 创建 | 测试属性绑定创建性能（1,000 次） |
| bindClass object 创建 | 测试对象语法 class 绑定（1,000 次） |
| createVaporElement | 测试 Vapor 虚拟节点创建（10,000 次） |
| renderVaporNode 简单元素 | 测试简单元素渲染（1,000 次） |
| renderVaporNode 100 子节点 | 测试宽列表渲染性能（1,000 次） |
| renderVaporNode 10 层嵌套 | 测试深层嵌套渲染（1,000 次） |
| bindEvent 创建/清理 | 测试事件绑定与解绑（10,000 次） |
| 大型列表渲染 | 测试 1,000 项列表一次性渲染 |

所有测试均使用内联的 Mock DOM 环境，无需浏览器即可在 Node.js 中独立运行。

### JS Framework Benchmark

```bash
cd benchmarks/js-framework-benchmark
./build.sh
# 在浏览器中打开 index.html
```

与其他主流框架的性能对比测试。Lyt.js 提供了 keyed 和 non-keyed 两种实现：

#### Keyed 实现

Keyed 实现使用高效的 keyed diff 算法，维护 `key -> DOM element` 映射，仅对变更的行执行最小化 DOM 操作：

- **新增项**：创建 DOM 元素并插入到正确位置
- **删除项**：从 DOM 中移除
- **移动项**：使用 `insertBefore` 重排（swap 操作仅需移动 2 个 DOM 节点）
- **更新项**：原地更新文本内容和 CSS 类名
- **选择操作**：仅遍历已有行切换 CSS 类名，无需重建

相比全量重建（每次清除 `innerHTML` 再重建），keyed diff 在 `updateEvery10thRow`、`swapRows`、`selectRow` 等操作上有显著性能优势。

#### Non-Keyed 实现

Non-Keyed 实现不使用 key，每次状态变更后全量重建 DOM。这模拟了无法高效复用 DOM 节点的场景，用于对比 keyed diff 的性能收益。

#### 支持的 Benchmark API

| 函数 | 说明 |
|------|------|
| `createElement(id)` | 初始化容器，返回 `{ container, destroy }` |
| `runBenchmark()` | 创建 1000 行数据并渲染 |
| `addRow()` | 在末尾添加一行 |
| `updateEvery10thRow()` | 更新每第 10 行的 label |
| `swapRows()` | 交换第 1 行和第 2 行 |
| `removeRow()` | 删除最后一行 |
| `selectRow(index)` | 选中指定索引的行 |

## 性能优化指南

### 1. 响应式系统优化

#### 使用 shallowReactive/shallowRef 减少深度监听

```javascript
import { shallowReactive, shallowRef } from '@lytjs/reactivity'

// 大型列表使用浅层响应式
const list = shallowReactive([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
])

// 对象内部变化不会触发更新，需要整体替换
list[0] = { ...list[0], name: 'New Name' }
```

#### 使用 markRaw 标记不需要响应式的对象

```javascript
import { markRaw, reactive } from '@lytjs/reactivity'

const state = reactive({
  // 大型第三方库实例不需要响应式
  chart: markRaw(new Chart())
})
```

#### 合理使用 computed 缓存

```javascript
// 好：复杂计算使用 computed 缓存
const filteredList = computed(() => {
  return list.value.filter(item => item.active)
})

// 不好：每次访问都重新计算
const getFilteredList = () => list.value.filter(item => item.active)
```

### 2. VDOM 优化

#### 使用 key 优化列表 Diff

```javascript
// 好：每个项目有唯一 key
<ul>
  {list.map(item => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>

// 不好：使用索引作为 key（项目顺序变化时性能差）
<ul>
  {list.map((item, index) => (
    <li key={index}>{item.name}</li>
  ))}
</ul>
```

#### 使用 Fragment 减少层级

```javascript
// 好：使用 Fragment
<Fragment>
  <div>Header</div>
  <div>Content</div>
</Fragment>

// 不好：额外的包装 div
<div>
  <div>Header</div>
  <div>Content</div>
</div>
```

### 3. 组件性能优化

#### 使用 v-once 渲染一次后不再更新

```javascript
<div v-once>
  这个内容只在首次渲染时更新
</div>
```

#### 使用 v-memo 条件性跳过更新

```javascript
<div v-memo="[item.id, item.name]">
  只有 item.id 或 item.name 变化时才更新
</div>
```

#### 合理使用 keep-alive 缓存组件

```javascript
<keep-alive>
  <component :is="currentComponent" />
</keep-alive>
```

### 4. 打包体积优化

#### 按需导入

```javascript
// 好：按需导入
import { reactive, ref } from '@lytjs/reactivity'

// 不好：全量导入
import * as Lyt from '@lytjs/core'
```

#### Tree Shaking 配置

确保在 webpack/vite/rollup 中启用 tree shaking：

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      treeshake: true
    }
  }
}
```

## 基准测试结果

### 响应式系统性能（参考值）

| 测试项 | Ops/sec | 单次耗时 |
|--------|---------|----------|
| reactive() 创建 | ~500,000+ | ~0.002ms |
| ref() 创建 | ~1,000,000+ | ~0.001ms |
| signal() 创建 | ~2,000,000+ | ~0.0005ms |
| reactive 读取 | ~10,000,000+ | ~0.0001ms |
| reactive 写入 | ~5,000,000+ | ~0.0002ms |
| computed 求值 | ~1,000,000+ | ~0.001ms |

### VDOM 性能（参考值）

| 测试项 | 1000 节点 | 10000 节点 |
|--------|-----------|------------|
| VNode 创建 | ~50,000 ops/sec | ~5,000 ops/sec |
| Diff 无变化 | ~100,000 ops/sec | ~10,000 ops/sec |
| Diff 全量变化 | ~20,000 ops/sec | ~2,000 ops/sec |
| 列表头部插入 | ~30,000 ops/sec | ~3,000 ops/sec |
| 列表反转 | ~10,000 ops/sec | ~1,000 ops/sec |

### Vapor Mode 性能（参考值）

| 测试项 | Ops/sec | 单次耗时 |
|--------|---------|----------|
| Signal 创建 (10,000 次/轮) | ~50,000+ | ~0.20ms |
| Signal 读取 (100,000 次/轮) | ~9,800+ | ~0.10ms |
| Signal 更新 (10,000 次/轮) | ~28,000+ | ~0.04ms |
| bindText 创建 (1,000 次/轮) | ~12,500+ | ~0.08ms |
| bindProp 创建 (1,000 次/轮) | ~13,700+ | ~0.07ms |
| bindClass object (1,000 次/轮) | ~7,400+ | ~0.14ms |
| createVaporElement (10,000 次/轮) | ~580+ | ~1.71ms |
| renderVaporNode 简单元素 (1,000 次/轮) | ~1,770+ | ~0.56ms |
| renderVaporNode 100 子节点 (1,000 次/轮) | ~25+ | ~39.8ms |
| renderVaporNode 10 层嵌套 (1,000 次/轮) | ~247+ | ~4.0ms |
| bindEvent 创建/清理 (10,000 次/轮) | ~2,460+ | ~0.41ms |
| 大型列表渲染 (1,000 项/轮) | ~1,480+ | ~0.68ms |

> 注意：以上数据基于 100 次迭代的平均值，实际性能受运行环境影响。

### 打包体积

| 包 | ESM (gzip) | CJS (gzip) |
|----|------------|------------|
| @lytjs/reactivity | 2.86 KB | 3.1 KB |
| @lytjs/vdom | 4.5 KB | 4.8 KB |
| @lytjs/renderer | 8.2 KB | 8.7 KB |
| @lytjs/core (全量) | 34.56 KB | 36.2 KB |

## 持续性能监控

建议在 CI/CD 流程中集成性能基准测试：

```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmark
on: [push, pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node benchmarks/reactivity.bench.js
      - run: node benchmarks/vdom.bench.js
      - run: node benchmarks/vapor.bench.js
```

## 贡献性能优化

如果您有性能优化建议或改进，欢迎：
1. 先运行基准测试建立性能基线
2. 实现优化后再次运行基准测试验证效果
3. 提交 PR 时附上性能对比结果

---

**注意**：性能测试结果受硬件环境影响，以上数据仅供参考。建议在您的目标环境中运行基准测试获取准确数据。
