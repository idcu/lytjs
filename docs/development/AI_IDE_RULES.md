# AI IDE 开发规则

> 本文档包含 AI IDE 使用的核心规则

## 快速参考

### 5 分钟开始工作

```bash
# 1. 确保环境
node -v  # >= 18
pnpm -v  # >= 9

# 2. 安装依赖
pnpm install

# 3. 检查现有问题
pnpm lint:check
pnpm type-check

# 4. 构建验证
pnpm build

# 5. 开始开发
git checkout -b feature/你的功能
```

### 常用命令速查

```bash
# 类型检查
pnpm type-check

# Lint 检查
pnpm lint:check

# Lint 自动修复
pnpm lint

# 构建
pnpm build

# 运行测试
pnpm test

# 检查循环依赖
pnpm run check-circular

# 检查零依赖规范
pnpm run check-zero-deps
```

### 常用包速查

| 功能       | 包名                    |
| ---------- | ----------------------- |
| 类型检查   | @lytjs/common-is        |
| 常量定义   | @lytjs/common-constants |
| 响应式系统 | @lytjs/reactivity       |
| 虚拟 DOM   | @lytjs/vdom             |
| 核心框架   | @lytjs/core             |

---

## 核心规则总结

### 语言规则

- 所有回答使用中文
- 变量名函数名用英文
- 公共 API 必须有中文 JSDoc

### 类型安全

- 禁止 any 类型
- 优先使用 import type
- 优先使用类型守卫

### 零依赖原则

- L0-L6 层运行时无第三方依赖
- 优先使用 @lytjs/common-\*
- 使用原生 API 替代第三方库

### 8 层架构

- L0 基础工具层可被任意层依赖
- 单向依赖，禁止反向依赖
- 合理分层，减少跨层依赖

---

## 相关文档

- [开发规范指南](./DEVELOPMENT_GUIDELINES.md) - 详细开发规范
- [架构设计文档](./ARCHITECTURE.md) - 8 层架构详解
- [插件开发指南](./PLUGIN_DEVELOPMENT.md) - 插件开发规范
- [零依赖开发规范](./ZERO_DEPENDENCY_GUIDE.md) - 零依赖开发指南
- [常见问题排查](./TROUBLESHOOTING.md) - 问题排查指南
- [开发技能](./DEVELOPMENT_SKILLS.md) - 开发技能模板

---

**文档版本**: v2.0
**最后更新**: 2026-05-16
**维护者**: LytJS Team
