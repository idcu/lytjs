# LytJS - AI 助手快速上手指南

> **重要**：请首先阅读本文件，这是为AI助手专门优化的指南，帮助您快速理解项目。

---

## 🎯 项目身份卡（必看）

| 项目 | LytJS |
|------|-------|
| **类型** | 现代前端框架 |
| **核心特性** | 双渲染模式(Vapor+VDOM)、8层架构、零运行时依赖 |
| **当前版本** | 6.9.6 |
| **语言** | TypeScript 优先 |
| **包管理器** | pnpm |
| **架构** | monorepo |

**核心思想**：
- Vapor模式：基于Signal的细粒度更新（性能优先）
- VDOM模式：虚拟DOM（兼容性优先）
- 8层分层架构，职责清晰

---

## 📂 项目结构速览（仅看关键目录）

```
lytjs/
├── packages/                    # 核心代码（最重要）
│   ├── common/                 # L0 基础工具包 (30+子包)
│   ├── reactivity/             # L1 响应式系统
│   ├── vdom/                   # L1 虚拟DOM
│   ├── compiler/               # L1 编译器
│   ├── component/              # L2 组件系统
│   ├── renderer/               # L2 渲染引擎
│   ├── core/                   # L3 完整核心（推荐使用）
│   ├── core-signal/            # L3 仅Vapor模式
│   ├── core-vnode/             # L3 仅VDOM模式
│   ├── ecosystem/packages/     # L6 生态包 (ui/store/router/ssr等)
│   └── plugins/packages/       # L4 官方插件
├── docs/                       # 文档（如果需要详细信息）
│   ├── getting-started/quick-reference.md  # 开发者快速参考
│   └── SUMMARY.md              # 文档导航
├── examples/                   # 示例项目
└── AGENTS.md                   # 👈 AI助手必读规则
```

---

## 🔑 关键概念（先掌握这些）

### 1. 双渲染模式

**Vapor模式** (`@lytjs/core-signal`):
```typescript
import { createApp, signal } from '@lytjs/core-signal';
const count = signal(0);  // 细粒度响应式
```

**VDOM模式** (`@lytjs/core-vnode`):
```typescript
import { createApp, ref } from '@lytjs/core-vnode';
const count = ref(0);     // 基于虚拟DOM
```

**混合模式** (`@lytjs/core` - 推荐新手):
```typescript
import { createApp, signal, ref } from '@lytjs/core';
```

### 2. 8层架构（从下往上）

```
L7: 工程化工具 (CLI/DevTools)
L6: 生态系统 (UI/Router/Store)
L5: 组件基础
L4: 插件与适配
L3: 核心运行时 (core)
L2: 渲染引擎 (renderer/component)
L1: 核心原语 (reactivity/vdom/compiler)
L0: 基础工具 (common-* / shared-types)
```

---

## 📝 AI开发工作流（按此操作）

### 第一步：确定任务类型

查看 [AGENTS.md](../AGENTS.md) 中的技能链：
- 简单任务 → 技能链直接执行
- 中等任务 → 技能链 + /plan
- 复杂任务 → 技能链 + /spec

### 第二步：常用命令

```bash
# 依赖安装（根目录）
pnpm install

# 类型检查
pnpm type-check

# 测试
pnpm test

# lint检查
pnpm lint:check

# 构建
pnpm build

# 性能基准
pnpm bench
```

### 第三步：关键文件位置

| 需求 | 文件位置 |
|------|----------|
| 核心API | packages/core/src/index.ts |
| 响应式 | packages/reactivity/src/ |
| 组件系统 | packages/component/src/ |
| UI组件 | packages/ecosystem/packages/ui/src/ |
| 类型定义 | packages/shared-types/src/ |
| 示例 | examples/ |
| 文档 | docs/ |

---

## 🎨 代码风格与规范

### 1. 零依赖原则
- packages/common/, packages/ecosystem/packages/ 等核心包，运行时不允许引入第三方依赖
- 仅开发依赖允许

### 2. 分层原则
- 上层可以依赖下层
- 避免跨层依赖
- L0层可以被所有层依赖

### 3. 提交规范
```
type(scope): 描述
类型: feat/fix/refactor/docs/test/chore
```

---

## 🏗️ 开发新包或功能的路径

### 场景1：修复bug
```
定位问题 → 编写测试 → 修复代码 → 验证通过
```

### 场景2：添加新特性
```
理解需求 → 检查架构位置 → 实现代码 → 测试 → 更新文档
```

### 场景3：创建新包
```
使用模板 packages/_templates/ → 配置 package.json → 实现功能 → 集成到 monorepo
```

---

## 🔍 常见任务的快速查找

### 查找API
优先顺序：
1. docs/api/ - API文档
2. 相关包的 README.md
3. 包的 src/index.ts - 导出定义

### 查找示例
1. examples/ 目录
2. docs/examples/ 文档示例
3. playground/  playground

### 查找架构说明
1. docs/contribute/architecture/
2. README.md 架构部分

---

## ⚡ 省Token小贴士

1. **先看本文件** - 避免盲目搜索
2. **使用AGENTS.md的技能链** - 按规范流程
3. **按需阅读文件** - 不需要看每个文件
4. **利用已有的示例** - 很多模式已经实现

---

## 📚 下一步路径（按需选择）

| 目标 | 阅读顺序 |
|------|----------|
| 理解整体 | 1. README.md → 2. docs/guide/ → 3. 示例 |
| 开发功能 | 1. AGENTS.md → 2. docs/contribute/ → 3. 相关包源码 |
| 修复bug | 1. 定位文件 → 2. 查看相关测试 → 3. 修复 |
| 写文档 | 1. 查看现有文档风格 → 2. 相应位置新增 |

---

## ⚠️ 重要提醒

- ✅ 保持零运行时依赖原则
- ✅ 遵循分层架构
- ✅ 先阅读 AGENTS.md
- ❌ 不要在核心包引入第三方依赖
- ❌ 不要破坏向后兼容性（除非MAJOR版本）

---

**记住**：如果有疑问，先看 [AGENTS.md](../AGENTS.md)！
