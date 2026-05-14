# Changelog

All notable changes to this project will be documented in this file.

## [6.0.1] - 2026-05-15

### 性能优化

- **VNode 对象池优化**
  - 将 VNode 对象池最大大小从 200 扩大到 500
  - 减少频繁创建和销毁 VNode 对象导致的 GC 压力
  - 提升大型列表渲染场景的性能

- **Signal 通知机制优化**
  - 使用迭代器替代 for...of 循环遍历 subscribers
  - 优化 notifySubscribers 和 flushPendingNotifications 函数
  - 在高频更新场景（如动画、实时数据）获得明显性能提升

### 测试验证

- vdom 包测试通过率：403/403 测试全部通过
- reactivity 包测试通过率：236/236 测试全部通过
- 所有基准测试运行正常

## [6.0.0] - 2026-05-06

### 架构整改

#### BREAKING CHANGES

- 删除 `@lytjs/shared` 包，功能合并到 `@lytjs/common-*` 子包
- 删除 `@lytjs/host` 包，功能合并到 `@lytjs/adapter-web`
- 删除 `@lytjs/runtime-convergence` 包，拆分为 6 个独立子包

#### 新增包

- `@lytjs/common-render-queue` - 渲染队列，批量合并渲染操作
- `@lytjs/common-event-normalizer` - 事件归一化工具
- `@lytjs/common-node-cache` - 节点缓存，管理容器-VNode 映射
- `@lytjs/common-async-scheduler` - 异步调度器，支持优先级
- `@lytjs/common-transition-engine` - 过渡引擎，支持 FLIP 动画
- `@lytjs/common-performance` - 性能监控 API
- `@lytjs/common-constants` - 全局常量

### 安全修复 (P0)

- 修复 v-html SSR 模式下未转义输出导致的 XSS 漏洞
- 修复 v-html Signal 模式下直接设置 innerHTML 的安全问题
- 修复 Island hydration 使用 innerHTML 创建 DOM 的安全问题
- 添加 CSP 严格模式检测和优雅降级
- 修复 Source Map encodeMappings 始终使用 sources[0] 的问题

### Bug 修复 (P1)

- 添加 v-bind 动态属性名验证
- 添加 v-on 事件名验证
- 添加组件名验证
- 添加 v-for 无 key 警告完善
- 添加 v-if 空条件报错
- 添加模板多根节点检测
- 添加组件递归深度限制（100层）
- 完善响应式数组方法处理
- 添加计算属性循环依赖检测
- 添加 watch 回调错误捕获

### 性能优化 (P2)

- 添加 VNode 对象池，减少 GC 压力
- 添加编译缓存，避免重复编译
- 添加 DOM 批量操作队列
- 添加正则表达式预编译缓存
- 添加懒加载渲染器支持
- 优化首次渲染性能

### 代码质量改进 (P2)

- 添加全局常量包 `@lytjs/common-constants`
- 完善 JSDoc 注释
- 添加类型守卫函数
- 添加错误恢复机制
- 统一代码风格

---

## 迁移指南

### 从 5.x 升级到 6.0

#### 包名变更

| 旧包名 | 新包名/替代方案 |
| --- | --- |
| `@lytjs/shared` | 使用 `@lytjs/common-*` 系列包 |
| `@lytjs/host` | 使用 `@lytjs/adapter-web` |
| `@lytjs/runtime-convergence` | 使用拆分后的 `@lytjs/common-*` 包 |

#### 导入路径更新

```typescript
// 旧版本
import { xxx } from '@lytjs/shared';

// 新版本
import { xxx } from '@lytjs/common-xxx';
```

#### 架构分层

6.0 版本引入了严格的分层架构：

- **L0 基础层**: 无外部依赖的基础工具包
- **L1 核心原语层**: 框架核心功能实现
- **L2 平台/组件层**: 平台适配和组件系统
- **L3 应用层**: 用户面向的应用 API

请确保您的代码遵循分层依赖规则，避免跨层依赖。
