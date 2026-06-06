# LytJS AI 助手开发指南

> 这是一个专门为 AI 助手准备的指南，帮助 AI 更快、更省 Token 地使用 LytJS 进行开发。

---

## 📋 快速索引

### 第一步：查看关键信息

- **AI 快速入门** → [.ai/QUICKSTART.md](../.ai/QUICKSTART.md) - 必看，5分钟掌握项目
- **项目上下文速查表** → [.ai/PROJECT_CONTEXT.md](../.ai/PROJECT_CONTEXT.md)
- **LytJS 快速参考** → [getting-started/quick-reference.md](./getting-started/quick-reference.md)

### 关键架构

```
L0: 基础工具层 (@lytjs/common-*)
L1: 核心原语层 (@lytjs/reactivity, @lytjs/vdom)
L2: 渲染引擎层 (@lytjs/renderer, @lytjs/component)
L3: 核心运行时 (@lytjs/core, @lytjs/core-signal, @lytjs/core-vnode)
L6: 生态系统 (@lytjs/ui, @lytjs/store, @lytjs/router)
```

---

## 🎯 AI 开发工作流

### 场景 1：开发新功能

**用户需求** → [AI 快速入门](../.ai/QUICKSTART.md) → [技能链](../.trae/skills/skill-chains/SKILL.md) → 编码

### 场景 2：修复问题

**问题描述** → 查看相关包源码 → 定位问题 → 测试 → 修复

### 场景 3：查找 API

**需求** → [quick-reference](./getting-started/quick-reference.md) → 相关包 README

---

## 📦 如何找到正确的文件

| 需求 | 查找位置 |
|------|---------|
| 核心 API | `packages/core/src/` |
| 响应式系统 | `packages/reactivity/src/` |
| UI 组件 | `packages/ecosystem/packages/ui/src/` |
| 状态管理 | `packages/ecosystem/packages/store/src/` |
| 路由 | `packages/ecosystem/packages/router/src/` |
| 类型定义 | `packages/shared-types/src/` |
| 示例代码 | `examples/` |
| 完整文档 | `docs/` |

---

## 💡 省 Token 技巧

### 1. 先看快速入门

不要一开始就遍历所有文件，先看：
- [.ai/QUICKSTART.md](../.ai/QUICKSTART.md)
- [.ai/PROJECT_CONTEXT.md](../.ai/PROJECT_CONTEXT.md)

### 2. 使用正确的上下文

- 简单任务：直接使用技能链
- 中等任务：技能链 + /plan
- 复杂任务：技能链 + /spec

### 3. 有针对性地阅读

只阅读需要的文件，避免无关文件消耗 Token。

---

## 📚 更多资源

- [完整文档目录](./SUMMARY.md)
- [开发规范](../.trae/skills/skill-chains/SKILL.md)
- [AGENTS.md](../AGENTS.md) - AI 规则
