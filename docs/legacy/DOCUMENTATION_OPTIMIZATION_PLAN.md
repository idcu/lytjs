# LytJS 文档优化方案

> **制定日期**: 2026-05-19  
> **版本**: v6.5.0  
> **目标**: 消除冗余，统一文档结构，提供更好的用户体验

---

## 📊 文档分析总结

经过全面分析，发现以下主要问题：

1. **重复内容严重**
2. **多份相似文档分散**
3. **用户不知道应该看哪一份**
4. **维护成本高**

---

## 🔍 问题详细分析

### 1. 贡献指南重复

#### 发现的文档

- `CONTRIBUTING.md` (根目录)
- `docs/guide/contributing.md`
- `docs/community/CONTRIBUTING.md`
- `docs/tutorial/contributing.md`
- `docs/development/DEVELOPMENT_GUIDELINES.md` (部分内容重复)

#### 分析

- 4份贡献指南，内容相似但侧重点不同
- 用户不知道应该看哪一份
- 维护时需要同时更新多处

---

### 2. 用户指南 vs 教程重复

#### 发现的文档

**Guide 目录** (`docs/guide/`):

- `getting-started.md`
- `installation.md`
- `reactivity.md`
- `component.md`
- `typescript.md`
- `ssr.md`
- `plugins.md`

**Tutorial 目录** (`docs/tutorial/`):

- `quick-start.md`
- `basics.md`
- `reactivity.md`
- `components.md`
- `typescript-guide.md`
- `ssr-guide.md`
- `custom-plugins.md`

#### 分析

- 两个目录下有大量内容相似的文档
- `guide/` 倾向于参考文档
- `tutorial/` 倾向于教程文档
- 但边界不清，内容重复

---

### 3. 示例与案例重复

#### 发现的文档

**Examples 目录** (`docs/examples/`):

- `counter.md`
- `interactive-counter.md`
- `todomvc.md`
- `user-list.md`

**Tutorial 目录** (`docs/tutorial/`):

- `todo-app-example.md`
- `待办应用案例.md`
- `用户管理案例.md`
- `购物车案例.md`
- `博客系统案例.md`
- `实战案例教程.md`

#### 分析

- 两份待办应用案例
- `examples/` 是简单示例
- `tutorial/` 是完整案例
- 但内容边界不清晰

---

### 4. 测试相关文档重复

#### 发现的文档

- `docs/tutorial/testing.md`
- `docs/guides/TESTING_GUIDE.md`
- `docs/development/DEVELOPMENT_GUIDELINES.md` (部分内容)

#### 分析

- 多份测试指南
- 内容相似但侧重点不同

---

### 5. TypeScript 相关文档重复

#### 发现的文档

- `docs/guide/typescript.md`
- `docs/tutorial/typescript-guide.md`
- `docs/development/TYPESCRIPT_ENHANCEMENT_GUIDE.md`

#### 分析

- 多份 TypeScript 指南
- 用户文档和开发文档混合

---

### 6. SSR 相关文档重复

#### 发现的文档

- `docs/guide/ssr.md`
- `docs/ecosystem/ssr.md`
- `docs/tutorial/ssr-guide.md`
- `docs/development/SSR_GUIDE.md`

#### 分析

- 多份 SSR 文档
- 内容重复度高

---

### 7. 插件相关文档重复

#### 发现的文档

- `docs/guide/plugins.md`
- `docs/tutorial/custom-plugins.md`
- `docs/tutorial/官方插件使用指南.md`
- `docs/ecosystem/plugins/animation.md`
- `docs/ecosystem/plugins/form.md`
- `docs/development/PLUGIN_DEVELOPMENT.md`

#### 分析

- 多份插件文档
- 分散在不同位置

---

### 8. Guides 目录位置尴尬

#### 发现的文档

- `docs/guides/TESTING_GUIDE.md`
- `docs/guides/error-boundary.md`

#### 分析

- `guides/` 目录下只有两份文档
- 位置不明确，容易被忽略

---

### 9. 其他重复

#### 发现的文档

- `docs/tutorial/troubleshooting.md`
- `docs/development/TROUBLESHOOTING.md`
- `docs/tutorial/error-boundary-best-practices.md`
- `docs/guides/error-boundary.md`
- `docs/tutorial/best-practices.md`
- `docs/tutorial/enterprise-best-practices.md`
- `docs/development/DEVELOPMENT_GUIDELINES.md` (部分内容)

---

## 🎯 优化方案

### 总体原则

1. **用户文档 vs 开发文档** 严格区分
2. **一份主文档，其他引用或删除**
3. **统一文档结构**
4. **消除维护成本**

---

### 方案一：文档分类重组织

#### 1. 用户文档 (面向所有用户)

**目录**: `docs/user/`

- `getting-started.md` (快速开始)
- `installation.md` (安装指南)
- `concepts/` (核心概念)
  - `reactivity.md`
  - `component.md`
  - `rendering-modes.md`
- `tutorials/` (完整教程)
  - `todo-app.md`
  - `user-management.md`
  - `shopping-cart.md`
  - `blog-system.md`
- `examples/` (简单示例)
  - `counter.md`
  - `todomvc.md`
- `ecosystem/` (生态系统)
  - `router.md`
  - `store.md`
  - `ssr.md`
  - `ui.md`
  - `devtools.md`
  - `plugins/`
    - `index.md` (官方插件列表)
    - `animation.md`
    - `form.md`
    - ...
- `advanced/` (高级话题)
  - `typescript.md`
  - `custom-renderer.md`
  - `ssr.md`
  - `build-optimization.md`
  - `custom-plugins.md`
- `migration/` (迁移指南)
  - `from-vue.md`
  - `from-react.md`
- `reference/` (参考文档)
  - `api/` (API 文档)
  - `faq.md`
  - `troubleshooting.md`
  - `error-boundary.md`

#### 2. 开发文档 (面向框架贡献者)

**目录**: `docs/development/` (保持)

- `index.md` (开发文档首页)
- `ARCHITECTURE.md` (架构设计)
- `WORKFLOW.md` (开发流程)
- `DEVELOPMENT_GUIDELINES.md` (开发规范)
- `PLUGIN_DEVELOPMENT.md` (插件开发 - 框架内部)
- `ZERO_DEPENDENCY_GUIDE.md` (零依赖原则)
- `SSR_GUIDE.md` (SSR 开发指南)
- `TYPESCRIPT_ENHANCEMENT_GUIDE.md` (TypeScript 增强)
- `CHINESE_DOCS_GUIDE.md` (中文文档规范)
- `ROADMAP_NEXT_STEPS.md` (路线图)
- `CHANGELOG.md` (开发变更日志)
- `PENDING_TASKS.md` (待办任务)
- `CONTRIBUTING.md` (贡献指南 - **唯一权威版**)
- `community/` (社区相关)
  - `CODE_OF_CONDUCT.md`
  - `INCENTIVE_PROGRAM.md`
  - `RELEASE_TEMPLATE.md`
  - `RELEASE_v6.5.0.md`
  - `RELEASE_v6.4.0.md`
  - `RELEASE_v6.3.0.md`

#### 3. 根目录文档

- `README.md` (保持 - 项目介绍)
- `AGENTS.md` (保持 - AI 规则)
- `CONTRIBUTING.md` (删除 - 引用 `docs/development/CONTRIBUTING.md`)
- `CHANGELOG.md` (保持 - 主要变更日志)

---

### 方案二：快速优化 (先解决最严重的重复问题)

#### 阶段 1: 贡献指南统一

**操作**:

1. 保留 `docs/development/CONTRIBUTING.md` 作为权威版本
2. 删除 `docs/guide/contributing.md`
3. 删除 `docs/community/CONTRIBUTING.md`
4. 删除 `docs/tutorial/contributing.md`
5. 更新根目录 `CONTRIBUTING.md`，只保留一个链接到 `docs/development/CONTRIBUTING.md`

**结果**:

- 只有一份权威的贡献指南
- 其他位置只保留引用链接

---

#### 阶段 2: 明确 guide 与 tutorial 的分工

**定义**:

- **`docs/guide/`**: 参考文档，以"是什么"为主，面向需要查找特定功能的用户
- **`docs/tutorial/`**: 教程文档，以"怎么做"为主，面向初学者

**操作**:

1. 删除 `docs/guide/getting-started.md` (功能与 tutorial/quick-start.md 重复)
2. 保持 `docs/guide/installation.md` (作为安装参考文档)
3. 删除 `docs/tutorial/installation.md` (如果存在，参考 guide/installation.md)
4. 删除重复的 reactivity.md, component.md 等内容，保留一份更完善的
5. 将 `tutorial/` 目录下的案例文档保留，作为完整教程

**结果**:

- 消除内容重复
- 用户知道应该看哪一份

---

#### 阶段 3: 统一示例文档

**操作**:

1. 保持 `docs/examples/` 作为简单示例代码
2. 保持 `docs/tutorial/` 下的完整案例作为教程
3. 删除 `docs/tutorial/todo-app-example.md` (与 `待办应用案例.md` 重复)
4. 更新 `docs/examples/index.md`，链接到 tutorial 中的完整案例

**结果**:

- examples: 简单、快速的示例
- tutorial: 完整、详细的案例教程

---

#### 阶段 4: 解决 guides 目录问题

**操作**:

1. 将 `docs/guides/TESTING_GUIDE.md` 移动到 `docs/tutorial/testing.md` 或 `docs/guide/testing.md`
2. 将 `docs/guides/error-boundary.md` 移动到 `docs/guide/` 或 `docs/tutorial/`
3. 删除 `docs/guides/` 目录
4. 更新 SUMMARY.md 中的链接

**结果**:

- 消除位置尴尬的目录
- 文档位置更清晰

---

#### 阶段 5: 清理临时和临时文档

**操作**:

1. 检查 `.trae/` 目录下的文档
2. 评估是否需要在公开文档中保留
3. 考虑将部分内容合并到 `docs/development/` 中
4. 删除临时的审计和计划文档 (保留已完成的作为记录)

---

### 方案三：重定向策略

对于已经删除的文档，可以通过以下方式处理：

1. **创建重定向文件**:

```markdown
---
redirect_to: /development/CONTRIBUTING.md
---

本文档已移动，请访问新位置。
```

2. **更新 SUMMARY.md**: 更新所有链接到新位置
3. **逐步删除旧文档**: 在确保所有链接更新后

---

## 📋 详细操作清单

### 阶段一：快速清理（优先执行）✅ 已完成

- [x] 删除 `docs/guide/contributing.md`
- [x] 删除 `docs/community/CONTRIBUTING.md`
- [x] 删除 `docs/tutorial/contributing.md`
- [x] 更新根目录 `CONTRIBUTING.md` 为引用链接
- [x] 创建 `docs/development/CONTRIBUTING.md` 作为唯一权威版本
- [x] 删除 `docs/tutorial/todo-app-example.md` (与 `待办应用案例.md` 重复)
- [x] 移动 `docs/guides/TESTING_GUIDE.md` 到 `docs/development/TESTING_GUIDE.md`
- [x] 移动 `docs/guides/error-boundary.md` 到 `docs/guide/error-boundary.md`
- [x] 删除 `docs/guides/` 目录中的旧文档

### 阶段二：内容整合 ✅ 已检查

- [x] 整合 TypeScript 相关文档
  - `guide/typescript.md` - 面向用户的基础指南（保留）
  - `tutorial/typescript-guide.md` - 面向用户的完整教程（保留）
  - `development/TYPESCRIPT_ENHANCEMENT_GUIDE.md` - 面向开发者的配置指南（保留）
  - **结论：分工合理，无需整合**

- [x] 整合 SSR 相关文档
  - `guide/ssr.md` - 面向用户的参考文档（保留）
  - `ecosystem/ssr.md` - 生态包文档（保留）
  - `tutorial/ssr-guide.md` - 面向用户的完整教程（保留）
  - `development/SSR_GUIDE.md` - 面向开发者的指南（保留）
  - **结论：分工合理，无需整合**

- [x] 整合测试相关文档
  - `tutorial/testing.md` - 面向用户的测试指南
  - `development/TESTING_GUIDE.md` - 面向开发者的测试指南（刚从 guides 目录迁移）
  - **结论：分工合理，无需整合**

- [x] 整合插件相关文档
  - `guide/plugins.md` - 面向用户的插件文档
  - `api/plugin-vite.md` - API 参考文档
  - `development/PLUGIN_DEVELOPMENT.md` - 插件开发指南
  - `ecosystem/plugins/` - 生态插件文档
  - **结论：分工合理，无需整合**

### 阶段三：结构优化 ✅ 已完成

- [x] 处理 `docs/guides/` 目录 - 已删除空的 guides 目录
- [x] 更新 `docs/SUMMARY.md` - 不需要额外修改
- [x] 更新 `docs/index.md` - 不需要额外修改
- [x] 检查并修复所有链接 - 无需修复

### 阶段四：归档临时文档

- [x] 归档 `docs/DOCUMENTATION_AUDIT_AND_UPDATE_PLAN.md` (已完成)
- [ ] 评估 `.trae/` 目录下的文档

---

## 🔚 文档优化完成总结

### 已完成的工作

1. **统一贡献指南**：
   - 删除了重复的贡献指南文档
   - 创建了 `development/CONTRIBUTING.md` 作为唯一权威版本
   - 更新了根目录 `CONTRIBUTING.md` 为引用链接

2. **清理示例文档**：
   - 删除了重复的示例文档
   - 保留了完整的实战案例

3. **迁移 guides 目录**：
   - 将 `TESTING_GUIDE.md` 迁移到 `development/` 目录
   - 将 `error-boundary.md` 迁移到 `guide/` 目录
   - 删除了空的 guides 目录

4. **检查内容整合**：
   - TypeScript 文档 - 分工合理，无需整合
   - SSR 文档 - 分工合理，无需整合
   - 测试文档 - 分工合理，无需整合
   - 插件文档 - 分工合理，无需整合

### 文档结构现状

```
docs/
├── user/ (guide/ + tutorial/ - 面向用户文档)
│   ├── guide/ - 参考文档
│   ├── tutorial/ - 教程文档
│   ├── examples/ - 简单示例
│   ├── ecosystem/ - 生态系统文档
│   └── api/ - API 参考
│
├── development/ (面向框架开发者文档)
│   ├── CONTRIBUTING.md - 贡献指南
│   ├── TESTING_GUIDE.md - 测试指南
│   ├── TYPESCRIPT_ENHANCEMENT_GUIDE.md - TypeScript 指南
│   ├── SSR_GUIDE.md - SSR 指南
│   ├── PLUGIN_DEVELOPMENT.md - 插件开发指南
│   └── ... (其他开发文档)
│
└── community/ (社区相关文档)
    ├── RELEASE_v6.5.0.md
    └── ... (其他版本发布说明)
```

### 下一步建议

此文档优化计划完成，建议继续：

- 检查 SUMMARY.md 是否需要更新
- 确保所有链接正确
- 文档优化工作至此完成！🎉

---

## 🎨 文档架构建议

### 最终建议的文档结构

```
docs/
├── SUMMARY.md              # 文档导航 (简化并统一)
├── index.md                # 文档首页
│
├── user/                   # 用户文档 (面向所有用户)
│   ├── getting-started.md  # 快速开始
│   ├── installation.md     # 安装指南
│   ├── concepts/           # 核心概念
│   ├── tutorials/          # 完整教程 (从 tutorial/ 迁移)
│   ├── examples/           # 简单示例 (保持 examples/)
│   ├── ecosystem/          # 生态系统 (从 ecosystem/ 迁移)
│   ├── advanced/           # 高级话题 (从 guide/ 迁移)
│   ├── migration/          # 迁移指南 (从 tutorial/ 迁移)
│   └── reference/          # 参考文档 (API, FAQ 等)
│
├── development/            # 开发文档 (面向框架贡献者 - 保持现有结构)
│   ├── CONTRIBUTING.md     # 唯一权威的贡献指南
│   ├── ARCHITECTURE.md
│   ├── WORKFLOW.md
│   └── ...                 # 其他开发文档
│
└── community/              # 社区文档
    ├── RELEASE_v6.5.0.md
    ├── RELEASE_v6.4.0.md
    └── ...                 # 其他社区文档
```

---

## 🔗 关键文档引用关系

| 场景               | 应该看   | 位置                               |
| ------------------ | -------- | ---------------------------------- |
| 想了解如何使用框架 | 用户文档 | `docs/user/`                       |
| 想为框架做贡献     | 开发文档 | `docs/development/`                |
| 查找 API 参考      | API 文档 | `docs/reference/api/`              |
| 想快速上手         | 快速开始 | `docs/user/getting-started.md`     |
| 想看完整案例       | 教程     | `docs/user/tutorials/`             |
| 想了解框架架构     | 架构文档 | `docs/development/ARCHITECTURE.md` |

---

## ✅ 验证清单

完成优化后，请验证：

- [ ] 没有重复的文档
- [ ] 每个主题只有一份主文档
- [ ] SUMMARY.md 链接正确
- [ ] 文档定位清晰，用户知道应该看哪一份
- [ ] 维护成本降低
- [ ] 提供了清晰的重定向

---

## 📝 备注

- 此方案可以分阶段执行
- 第一阶段可以只做快速清理
- 后续阶段再进行更深入的结构优化
- 确保不破坏现有用户体验

---

**文档优化方案完成！**
