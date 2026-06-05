# 完整基准测试报告 - 2026-06-02

## 📊 测试说明

本次测试是完全重新运行的基准测试，包括：
- VDOM 模式（虚拟 DOM）
- Signal 模式（响应式数据）
- Vapor 模式（直接 DOM 操作）

测试环境：
- 日期：2026-06-02
- Node.js 环境
- jsdom 模拟浏览器

---

## 1️⃣ 列表渲染性能 (vapor-list.bench.ts)

### Vapor 列表渲染性能
| 测试项 | hz | mean (ms) | p75 (ms) | p99 (ms) |
|--------|-----|-----------|----------|----------|
| createVaporListRenderer - 初始渲染 1000 项 | 23.12 | 43.26 | 43.02 | 80.25 |
| createVaporListRenderer - 增量更新（10%变化） | 17.98 | 55.61 | 60.24 | 62.93 |
| createVaporListRenderer - 列表重排序 | 11.71 | 85.42 | 87.63 | 98.65 |
| createVaporListRenderer - 高频小量更新 | 5.45 | 183.53 | 226.31 | 299.57 |
| **传统 DOM 操作 - 完全替换 1000 项** | **50.90** | **19.65** | **19.70** | **35.87** |

### 列表差异算法性能
| 测试项 | hz | mean (ms) |
|--------|-----|-----------|
| diffLists - 1000 个元素（10%更新） | 2,862.78 | 0.349 |
| diffLists - 1000 个元素（50%删除，50%新增） | 2,628.69 | 0.380 |

### 性能对比：Vapor 列表 vs 传统渲染
| 测试项 | hz | mean (ms) |
|--------|-----|-----------|
| Vapor 列表 - 初始渲染 5000 项 | 3.19 | 313.29 |
| **DocumentFragment 批量插入 - 5000 项** | **8.65** | **115.55** |

---

## 2️⃣ 更新性能 (update.bench.ts)

| 测试项 | hz | mean (ms) | 相对性能 |
|--------|-----|-----------|----------|
| update single node | **27,725.15** | 0.036 | 1.00x 🏆 |
| reverse list | 6,394.68 | 0.156 | 4.32x |
| remove row from middle | 6,043.09 | 0.166 | 4.59x |
| filter list (half) | 5,401.71 | 0.185 | 5.14x |
| swap two rows | 3,280.71 | 0.305 | 8.46x |
| prepend 1000 rows | 3,013.04 | 0.332 | 9.20x |
| append 1000 rows | 2,831.56 | 0.353 | 9.78x |
| sort list | 1,726.28 | 0.579 | 16.04x |
| select row (highlight) | 1,366.02 | 0.732 | 20.28x |
| update 1000 nodes (text content) | 231.72 | 4.316 | 119.64x |

---

## 3️⃣ 批量优化性能 (batch-optimization.bench.ts)

### 批量 DOM 操作性能
| 测试项 | hz | mean (ms) |
|--------|-----|-----------|
| insertBatch - 1000 个节点 | 83.99 | 11.91 |
| **insertBatch - 100 个节点** | **1,049.08** | **0.95** |
| removeBatch - 1000 个节点 | 15.39 | 64.97 |

### 渲染调度器性能
| 测试项 | hz | mean (ms) |
|--------|-----|-----------|
| createRenderScheduler - 高频触发（100次） | 670,980.10 | 0.0015 |
| createRenderScheduler - 中频触发（10次） | 1,416,939.43 | 0.0007 |

### 事件委托性能
| 测试项 | hz | mean (ms) |
|--------|-----|-----------|
| delegateEvent - 1000 个元素 | 45.18 | 22.13 |
| **delegateEventBatch - 100 个事件处理器** | **12,814.39** | **0.08** |

---

## 4️⃣ 内存性能 (memory.bench.ts)

| 测试项 | hz | 相对性能 |
|--------|-----|----------|
| **create/destroy 1000 component definitions** | **最快** | 1.00x 🏆 |
| create/destroy 1000 vnodes | - | 5.26x |
| create/destroy 1000 refs | - | 5.90x |
| create/destroy 1000 nested reactive objects | - | 12.66x |
| create/destroy 1000 reactive objects | - | 19.23x |
| create/destroy 1000 watchers | - | 89.19x |
| create/destroy 1000 computed values | - | 330.31x |
| create/destroy 1000 effect scopes | - | - |
| large reactive array operations | - | 2641.16x |

---

## 📈 关键发现

### 1. Vapor 模式优势
- DocumentFragment 批量插入比 Vapor 列表渲染快 **2.71x**（5000 项）
- 传统 DOM 完全替换比 Vapor 渲染器快 **2.20x**（1000 项）

### 2. 更新性能
- 单个节点更新极快（27,725 Hz / 0.036ms）
- 更新 1000 个节点相对较慢（232 Hz / 4.3ms）

### 3. 批量操作
- 批量操作比单个操作快 12.49x（100 个节点 vs 1000 个节点）
- DocumentFragment 在批量插入时优势显著

### 4. 事件委托
- 批量事件处理器设置比单个委托快 **283.64x**

---

## 🏆 性能对比总结表

| 场景 | 最佳方案 | 平均耗时 | 最慢方案 | 性能提升 |
|------|----------|----------|----------|----------|
| 初始渲染 1000 项 | 传统 DOM 批量 | 19.65ms | Vapor 渲染器 | 2.20x |
| 初始渲染 5000 项 | DocumentFragment | 115.55ms | Vapor 列表 | 2.71x |
| 更新单个节点 | 直接更新 | 0.036ms | 更新 1000 节点 | 119.64x |
| 批量插入 100 节点 | insertBatch | 0.95ms | 移除 1000 节点 | 68.16x |
| 事件处理 | 批量事件处理器 | 0.08ms | 单个委托 | 283.64x |

---

## 📋 三种模式的性能特性总结

### VDOM 模式 (虚拟 DOM)
- ✅ 适合复杂应用
- ⚠️ 更新需要 diff 算法开销
- 📊 适合参考传统 DOM 操作基准

### Signal 模式 (响应式)
- ✅ 精确更新
- ⚠️ 数据追踪有开销
- 📊 适合数据密集型应用

### Vapor 模式 (直接 DOM)
- ✅ 无虚拟 DOM 开销
- ⚠️ 需要优化的渲染器
- 📊 适合简单高性能应用

---

## 🎯 优化建议

1. **优先使用 DocumentFragment** 进行批量插入
2. **单个节点更新优先直接操作**
3. **事件处理使用委托模式**
4. **合理使用批量操作**
5. **避免不必要的大数组操作**

---

*测试完成日期：2026-06-02*
