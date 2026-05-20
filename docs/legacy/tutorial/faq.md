# 常见问题 FAQ

> 关于 LytJS 的常见问题解答

---

## 目录

- [基础问题](#基础问题)
- [安装和配置](#安装和配置)
- [使用问题](#使用问题)
- [性能优化](#性能优化)
- [与其他框架对比](#与其他框架对比)
- [迁移相关](#迁移相关)
- [贡献相关](#贡献相关)

---

## 基础问题

### Q: LytJS 是什么？

LytJS 是一个下一代轻量级前端框架，具有以下特点：

- 🚀 高性能：基于信号的响应式系统，细粒度更新
- 📦 超小体积：核心包 < 10KB gzip
- 🎯 零第三方依赖：运行时无外部依赖
- 🔧 双模式支持：Vapor 模式和 VDOM 模式
- 📝 优秀的 TypeScript 支持
- 🔌 插件系统：丰富的官方插件生态

### Q: LytJS 的名字是什么意思？

"Lyt" 来自 "Light"（轻量）的缩写，代表了我们追求轻量、快速的核心理念。

### Q: LytJS 适合生产环境使用吗？

是的！LytJS v6.0.0 已经可以用于生产环境。我们有完整的测试覆盖和生产项目在使用。

### Q: LytJS 浏览器兼容性如何？

LytJS 支持现代浏览器：

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+

需要支持更老浏览器可以使用 polyfills。

### Q: LytJS 支持 SSR 吗？

是的！LytJS 内置支持服务端渲染（SSR）和静态站点生成（SSG），查看 [SSR/SSG 指南](./ssr-guide.md)。

---

## 安装和配置

### Q: 推荐使用哪个包管理器？

我们推荐使用 **pnpm**，它具有：

- 更好的磁盘空间效率
- 更快的安装速度
- 更好的 monorepo 支持

当然，npm 和 yarn 也完全支持。

### Q: 如何选择 Vapor 模式还是 VDOM 模式？

| 特点         | Vapor 模式          | VDOM 模式         |
| ------------ | ------------------- | ----------------- |
| **性能**     | ⭐⭐⭐⭐⭐ 更优秀   | ⭐⭐⭐⭐ 良好     |
| **包体积**   | ⭐⭐⭐⭐⭐ 更小     | ⭐⭐⭐⭐ 稍大     |
| **学习曲线** | ⭐⭐⭐ 需要理解信号 | ⭐⭐⭐⭐⭐ 更熟悉 |
| **兼容性**   | ⭐⭐⭐⭐ 良好       | ⭐⭐⭐⭐⭐ 最好   |

**推荐**:

- 新项目 → Vapor 模式
- 从 Vue/React 迁移 → VDOM 模式（先熟悉，再优化）

### Q: 如何配置 TypeScript？

LytJS 内置 TypeScript 支持，只需确保：

1. `tsconfig.json` 中设置 `"strict": true`
2. 安装 `@lytjs/shared-types` 类型包
3. 查看 [TypeScript 类型指南](./typescript-guide.md)

---

## 使用问题

### Q: Signal 和 Ref 有什么区别？

在 LytJS 中：

```typescript
// Signal - 推荐，基础响应式单元
const count = signal(0);
count.value++;

// Ref - 为了兼容性保留，API 相同
const count = ref(0);
count.value++;
```

它们在 LytJS 中是相同的，推荐使用 `signal`。

### Q: 如何处理异步操作？

LytJS 提供多种方式：

```typescript
import { signal, effect } from '@lytjs/reactivity';
import { useDataFetch } from '@lytjs/plugin-data-fetch';

// 方式 1: 基础异步
const data = signal(null);
const loading = signal(false);

async function fetchData() {
  loading.value = true;
  try {
    data.value = await fetch('/api/data').then((r) => r.json());
  } finally {
    loading.value = false;
  }
}

// 方式 2: 使用插件
const { data, loading, error } = useDataFetch('/api/data');
```

### Q: 如何进行状态管理？

对于简单应用：

- 使用 `signal` 和 `computed`

对于复杂应用：

- 使用 store 模式
- 或者使用 [`@lytjs/store`](https://github.com/lytjs/store) 插件

### Q: 组件之间如何通信？

1. **Props & Events**: 父子组件通信
2. **Provide/Inject**: 跨层级通信
3. **全局状态**: 全局 store
4. **事件总线**: 插件或第三方库

---

## 性能优化

### Q: LytJS 性能如何？

LytJS 性能非常优秀：

- 🏆 在 js-framework-benchmark 中名列前茅
- ⚡ 细粒度更新，只更新变化的部分
- 📦 超小体积，加载快速
- 🔥 高效的 Vapor 模式

### Q: 如何优化应用性能？

1. **使用 Vapor 模式**: 默认细粒度更新
2. **避免过度响应式**: 不需要响应的数据用普通变量
3. **合理使用计算属性**: 缓存计算结果
4. **合理的批量更新**: 合并多次更新
5. **使用插件优化**: 如 `@lytjs/plugin-animation`

### Q: 如何进行性能分析？

使用浏览器 DevTools：

1. Performance 面板录制
2. 使用 `@lytjs/plugin-perf` 性能分析插件
3. 查看 React DevTools（如果用 VDOM 模式）

---

## 与其他框架对比

### Q: LytJS vs Vue

| 特点          | LytJS     | Vue 3        |
| ------------- | --------- | ------------ |
| **响应式**    | 信号系统  | Proxy 响应式 |
| **核心体积**  | <10KB     | ~30KB        |
| **更新粒度**  | 细粒度    | 组件级       |
| **VDOM 支持** | ✅ (可选) | ✅ (主要)    |
| **学习曲线**  | 中等      | 中等         |

详见 [Vue 迁移指南](./migration-from-vue.md)

### Q: LytJS vs React

| 特点         | LytJS      | React            |
| ------------ | ---------- | ---------------- |
| **响应式**   | 信号系统   | 状态 + Effect    |
| **渲染模式** | 细粒度更新 | 重渲染 + Diff    |
| **核心体积** | <10KB      | ~40KB + ReactDOM |
| **更新策略** | 精确更新   | 调度更新         |

详见 [React 迁移指南](./migration-from-react.md)

### Q: 为什么不直接用 Vue/React？

LytJS 的优势：

- 📦 更小的体积
- ⚡ 更好的性能（Vapor 模式）
- 🔧 更灵活的架构选择
- 🎯 零第三方依赖原则
- 🔌 精心设计的插件系统

---

## 迁移相关

### Q: 从 Vue 迁移到 LytJS 成本高吗？

不高！LytJS 提供了：

- 相似的单文件组件语法
- 兼容的响应式概念
- 专门的 [Vue 迁移指南](./migration-from-vue.md)
- CLI 迁移工具

大多数应用可以在几天内完成迁移。

### Q: 从 React 迁移到 LytJS 成本高吗？

React 开发者会发现很多相似概念，查看 [React 迁移指南](./migration-from-react.md)。

### Q: 可以逐步迁移吗？

是的！可以：

1. 先使用 VDOM 模式保持熟悉感
2. 逐步把组件迁移到 Vapor 模式
3. 使用 `@lytjs/plugin-vue-compat` 兼容层

---

## 贡献相关

### Q: 如何为 LytJS 做贡献？

感谢你的兴趣！请参考 [贡献指南](../development/CONTRIBUTING.md)。

### Q: 报告问题需要什么信息？

报告问题时请包含：

1. LytJS 版本
2. 复现步骤（最小化示例）
3. 预期行为和实际行为
4. 浏览器环境
5. 错误信息（如果有）

### Q: 如何贡献文档？

文档在 `docs/` 目录下，提交 PR 即可！

### Q: 如何开发插件？

查看 [插件开发指南](./plugin-development.md)。

---

## 其他问题

### Q: LytJS 有官方 UI 组件库吗？

有！`@lytjs/ui` - 查看 [UI 组件库文档](../components/README.md)。

### Q: 有路由方案吗？

有！`@lytjs/router` - 完整的路由解决方案。

### Q: 有状态管理方案吗？

有！`@lytjs/store` - 简单轻量的状态管理。

### Q: LytJS 未来的发展方向？

查看 [ROADMAP](../development/ROADMAP_NEXT_STEPS.md) 了解我们的计划。

### Q: 如何获取支持？

- 📖 查看文档（你正在看！）
- ❓ 搜索 [GitHub Issues](https://github.com/lytjs/lytjs/issues)
- 💬 加入 [Discord 社区](https://discord.gg/lytjs)
- 🐦 关注 [Twitter](https://twitter.com/lytjs)

---

## 没有找到答案？

如果这里没有解答你的问题：

1. 🔍 搜索现有 [GitHub Issues](https://github.com/lytjs/lytjs/issues)
2. 📝 创建新的 [Issue](https://github.com/lytjs/lytjs/issues/new)
3. 💬 在 Discord 社区提问

---

**感谢使用 LytJS！** 🎉

[返回文档索引](../SUMMARY.md)
