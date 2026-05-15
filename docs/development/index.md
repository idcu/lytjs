# 开发文档

欢迎来到 LytJS 开发文档！这里提供了框架内部架构、开发规范和贡献指南等内容。

## 快速导航

### 核心文档

- [AI 开发规则](./AI_IDE_RULES.md) - AI 辅助开发的规范和最佳实践
- [架构设计](./ARCHITECTURE.md) - 深入了解 LytJS 的 8 层架构设计
- [中文文档指南](./CHINESE_DOCS_GUIDE.md) - 文档编写规范

### 开发规范

- [开发规范指南](./DEVELOPMENT_GUIDELINES.md) - 完整的开发规范
- [零依赖开发规范](./ZERO_DEPENDENCY_GUIDE.md) - 零依赖开发指南
- [插件开发指南](./PLUGIN_DEVELOPMENT.md) - 如何创建和发布插件
- [开发技能](./DEVELOPMENT_SKILLS.md) - 开发技能模板

### 问题排查

- [常见问题排查](./TROUBLESHOOTING.md) - 常见问题解决指南

### 规划

- [路线图](./ROADMAP_NEXT_STEPS.md) - 查看开发计划和进度

## 参与贡献

我们欢迎任何形式的贡献！请阅读以下文档了解如何参与：

1. 阅读 [贡献指南](../guide/contributing.md)
2. 查看 [架构设计](./ARCHITECTURE.md) 了解代码组织
3. 遵循 [开发规范指南](./DEVELOPMENT_GUIDELINES.md) 进行开发
4. 查看 [路线图](./ROADMAP_NEXT_STEPS.md) 了解当前进展

## 架构概览

LytJS 采用 8 层架构设计，从底层到上层分别为：

1. **L0 基础工具层** - 原生 JS 工具封装、常量定义
2. **L1 核心原语层** - 响应式系统、虚拟 DOM、编译器
3. **L2 渲染引擎层** - Vapor 渲染器、VDOM 渲染器、组件系统
4. **L3 核心运行时层** - 应用实例、生命周期、插件机制
5. **L4 插件与适配层** - 官方插件、跨平台适配器
6. **L5 组件基础层** - 组件通用逻辑、通信机制
7. **L6 生态系统层** - UI 组件库、Router、Store、SSR
8. **L7 工程化工具层** - 构建工具、CLI、DevTools

详细内容请查看 [架构设计文档](./ARCHITECTURE.md)。

---

**文档版本**: v2.0
**最后更新**: 2026-05-16
**维护者**: LytJS Team
