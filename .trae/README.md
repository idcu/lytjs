# Lyt.js AI IDE 集成

欢迎使用 Lyt.js！这个目录包含了 AI IDE（Trae、Cursor 等）的集成配置，帮助您更高效地开发 Lyt.js 应用。

## 📁 目录结构

```
.trae/
├── README.md                    # 本文件
├── context.md                  # 项目上下文
├── api-reference.md            # API 快速参考
├── quick-start.md              # 快速入门指南
├── best-practices.md          # 最佳实践
├── ai-integration-examples.md # AI 使用示例
└── prompts/
    ├── component.md            # 组件生成提示词
    ├── store.md               # Store 生成提示词
    ├── page.md                # 页面生成提示词
    └── api.md                 # API 生成提示词
```

## 🚀 快速开始

### 1. 配置 AI 助手

如果您想使用 AI 生成代码，请先运行：

```bash
lyt-ai init
```

这会创建 `.lytrc.json` 配置文件，您需要在其中填入 API Key。

### 2. 使用 CLI 生成代码

```bash
# 生成组件（模板）
lytx generate component MyButton --type button

# 生成组件（AI）
lytx generate component MyButton --type button --ai

# 生成 Store
lytx generate store counter

# 生成页面
lytx generate page Home

# 生成 API
lytx generate api users
```

### 3. 使用 AI IDE

直接在 AI IDE 中引用本目录的文件，或者复制 `prompts/` 目录中的提示词使用。

## 📚 相关文档

- [项目上下文](./context.md) - 了解项目整体
- [API 快速参考](./api-reference.md) - API 速查
- [最佳实践](./best-practices.md) - 开发建议
- [AI 使用示例](./ai-integration-examples.md) - 更多示例

## 🎯 Lyt.js 核心特性

- **零依赖**: 纯原生实现，无第三方运行时依赖
- **Vue 兼容**: API 与 Vue 3 高度兼容
- **无 v- 前缀**: 更简洁的模板语法
- **双模式**: 同时支持 Options API 和 Composition API
- **内置路由 & 状态管理**: 无需额外安装

## 📖 更多资源

- 查看项目根目录的 `llms.txt` 和 `llms-full.txt` 获取完整文档
- 访问 [Lyt.js 官方网站](https://lyt.js.org) (如果有)
- 查看 GitHub 仓库 (如果有)

## 💡 提示

如果您是 AI 助手，请优先使用 `llms.txt` 和 `llms-full.txt` 了解项目，然后使用 `prompts/` 目录中的专门提示词生成代码。
