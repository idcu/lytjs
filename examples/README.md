# LytJS 示例项目

本目录包含多个使用 LytJS 构建的示例项目。

## 📋 目录

- [Counter](./counter/) - 简单计数器示例
- [Complete Todo](./complete-todo/) - 完整待办事项应用
- [Plugins Demo](./plugins-demo/) - 插件使用示例
- [Admin Dashboard](./admin-dashboard/) - 管理后台示例
- [E-commerce Cart](./ecommerce-cart/) - 购物车示例
- [User Management](./user-management/) - 用户管理示例
- [Weather Dashboard](./weather-dashboard/) - 天气仪表盘示例
- [UI Components](./ui-components/) - UI 组件展示

## 🚀 快速开始

### 安装依赖

在项目根目录运行安装命令（因为使用 monorepo workspace）：

```bash
cd ..
pnpm install
```

### 运行开发服务器

```bash
cd examples
pnpm dev
```

然后在浏览器中打开相应的 HTML 文件即可查看示例。

## 📦 关于 workspace 依赖

本项目使用 monorepo 架构，示例项目使用 `workspace:*` 依赖本地的 LytJS 包，而不是从 npm 官方仓库安装。这样的好处：

1. **开发体验好** - 本地修改代码后立即生效，无需发布
2. **版本一致** - 确保所有包使用相同版本
3. **构建优化** - 可以进行更优化的构建和 tree-shaking

**注意**：如果你想将这些示例作为自己项目的起点，请将 `package.json` 中的依赖从 `workspace:*` 改为具体的版本号（如 `^6.9.6`）。

## 📚 文档

查看完整文档，请访问 [docs](../docs/) 目录。

## 🔗 相关资源

- [LytJS 主文档](../README.md)
- [快速参考指南](../docs/getting-started/quick-reference.md)
- [API 文档](../docs/api/)
- [架构文档](../docs/contribute/architecture/)

## 💡 提示

所有示例都是在 LytJS 的双渲染模式下构建的，你可以：

1. 使用 `@lytjs/core` - 完整双模式支持（推荐）
2. 使用 `@lytjs/core-signal` - 仅 Vapor 模式，性能更好
3. 使用 `@lytjs/core-vnode` - 仅 VDOM 模式，兼容性更好
