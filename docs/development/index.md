# LytJS 开发文档

欢迎来到 LytJS 开发文档！本目录包含框架内部架构、开发规范和项目管理相关文档。

## 📋 文档导航

### 🏛️ 核心架构

- [架构设计](./ARCHITECTURE.md) - 深入了解 LytJS 的 8 层架构设计
- [零依赖开发规范](./ZERO_DEPENDENCY_GUIDE.md) - 零依赖开发原则和指南

### 🛠️ 开发指南

- [开发规范指南](./DEVELOPMENT_GUIDELINES.md) - 完整的开发规范（编码、测试、构建等）
- [TypeScript 类型系统增强指南](./TYPESCRIPT_ENHANCEMENT_GUIDE.md) - 类型系统最佳实践和增强计划
- [AI 开发规则](./AI_IDE_RULES.md) - AI 辅助开发的规范和最佳实践
- [插件开发指南](./PLUGIN_DEVELOPMENT.md) - 如何创建和发布官方插件
- [中文文档指南](./CHINESE_DOCS_GUIDE.md) - 文档编写规范

### 📦 使用指南

- [SSR 使用指南](./SSR_GUIDE.md) - 服务端渲染完整指南
- [第三方插件生态](./third-party-ecosystem.md) - 生态建设与插件审核指南

### 🧰 开发技能库

- [开发技能模板](./DEVELOPMENT_SKILLS.md) - 通用开发技能模板
- [知识库](./KNOWLEDGE_BASE.md) - 开发经验和最佳实践汇总（含专项技能流程）
  - UI 组件类型安全修复
  - SSR 压力测试与性能验证
  - 测试内存溢出优化

### 📈 性能与优化

- [性能基准与优化计划](./PERFORMANCE_BASELINE_AND_PLANS.md) - 整合了 v6.0.0 基准、v6.1 报告、优化计划

### 🗓️ 项目规划

- [路线图与后续计划](./ROADMAP_NEXT_STEPS.md) - 长期发展规划（含 v6.1-v7.0 详细计划）

### 📋 进度追踪

- [变更日志](./CHANGELOG.md) - 完整的版本更新记录
- [待办任务汇总](./PENDING_TASKS.md) - 当前未完成任务汇总
- [常见问题排查](./TROUBLESHOOTING.md) - 常见问题解决指南
- [基准测试 PR 指南](./BENCHMARK_PR_GUIDE.md) - 提交性能基准测试的指南

## 🏗️ 架构概览

LytJS 采用 8 层架构设计，从底层到上层分别为：

1. **L0 基础工具层** - 原生 JS 工具封装、常量定义
2. **L1 核心原语层** - 响应式系统、虚拟 DOM、编译器
3. **L2 渲染引擎层** - Vapor 渲染器、VDOM 渲染器、组件系统
4. **L3 核心运行时层** - 应用实例、生命周期、插件机制
5. **L4 插件与适配层** - 官方插件、跨平台适配器
6. **L5 组件基础层** - 组件通用逻辑、通信机制
7. **L6 生态系统层** - UI 组件库、路由、状态管理、SSR
8. **L7 工程化工具层** - 构建工具、CLI、DevTools

详细内容请参考 [架构设计文档](./ARCHITECTURE.md)。

## 🤝 参与贡献

我们欢迎任何形式的贡献！

1. 阅读 [贡献指南](../guide/contributing.md)
2. 查看 [架构设计](./ARCHITECTURE.md) 了解代码组织
3. 遵循 [开发规范指南](./DEVELOPMENT_GUIDELINES.md) 进行开发
4. 查看 [路线图](./ROADMAP_NEXT_STEPS.md) 了解当前进度

---

**文档版本**: v5.0（最终优化版）
**最后更新**: 2026-05-17
**维护者**: LytJS Team
**整合内容**: 从 30 个文档优化整合为 17 个，删除了 13 个重复文档
