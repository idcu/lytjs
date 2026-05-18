# 🎉 LytJS v6.4.0 版本发布公告

**发布日期**: 2026-05-18
**版本类型**: Minor

---

## 📖 版本亮点

我们很高兴宣布 **LytJS v6.4.0** 正式发布！🎊

本次更新聚焦于**完整的 Monorepo 包发布**和**文档体系完善**，为开发者提供更稳定、更易用的开发体验。

### 🌟 主要亮点

- 🚀 **完整的 Monorepo 包发布** - 所有官方包统一发布到 npm
- 🛠️ **类型系统修复** - ColorPicker 组件 const 赋值问题修复
- 📚 **文档体系全面升级** - 全项目文档统一版本，中文优先
- ✅ **构建发布流程优化** - npm 发布流程完善

---

## 🆕 新功能

### Monorepo 完整发布

v6.4.0 将所有官方包统一发布到 npm，版本号统一为 6.4.0。

**核心包:**
- `@lytjs/core` - 完整核心
- `@lytjs/core-signal` - Signal 模式
- `@lytjs/core-vnode` - VNode 模式
- `@lytjs/reactivity` - 响应式系统
- `@lytjs/vdom` - 虚拟 DOM
- `@lytjs/compiler` - 编译器
- `@lytjs/renderer` - 渲染器
- `@lytjs/component` - 组件系统
- `@lytjs/dom` - DOM 平台
- `@lytjs/web` - Web 平台
- `@lytjs/dom-runtime` - DOM 运行时
- `@lytjs/adapter-web` - Web 适配器
- `@lytjs/shared-types` - 共享类型
- `@lytjs/host-contract` - 宿主契约

**生态包:**
- `@lytjs/router` - 路由系统
- `@lytjs/store` - 状态管理
- `@lytjs/ssr` - 服务端渲染
- `@lytjs/ui` - UI 组件库
- `@lytjs/devtools` - 开发者工具
- `@lytjs/compat` - 兼容性层
- `@lytjs/platform-adapter` - 平台适配器

**官方插件:**
- `@lytjs/plugin-vite` - Vite 集成
- `@lytjs/plugin-theme` - 主题管理
- `@lytjs/plugin-logger` - 日志插件
- `@lytjs/plugin-auth` - 认证插件
- `@lytjs/plugin-storage` - 存储插件
- `@lytjs/plugin-i18n` - 国际化插件

**工具包:**
- `@lytjs/cli` - 命令行工具
- `@lytjs/devtools-extension` - DevTools 扩展
- `@lytjs/test-utils` - 测试工具
- 所有 `@lytjs/common-*` 工具包（29+）

---

### 类型系统修复

修复了 UI 组件库中的类型问题：

**问题解决:**
- ColorPicker 组件中 const 变量赋值错误
- 将 const 改为 let 以允许赋值操作
- 所有包完整类型检查通过

---

### 文档体系完善

对全项目文档进行了全面升级：

**更新内容:**
- 所有包的 README.md 翻译为中文
- 所有包的 CHANGELOG.md 更新到 v6.4.0
- 文档站所有文档版本号统一更新
- 新增 6 个生态包的完整中文 README
- 新增 12 个包的 CHANGELOG.md
- 根目录和文档站的 CHANGELOG.md 同步更新

---

## 📦 安装与升级

### 新用户

```bash
# 使用 CLI 创建新项目（推荐）
npx @lytjs/cli create my-lytjs-app

# 进入目录
cd my-lytjs-app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 从旧版本升级

```bash
# 更新所有 @lytjs/* 依赖
pnpm update "@lytjs/*@6.4.0"

# 或者逐个更新
pnpm add @lytjs/core@6.4.0
pnpm add @lytjs/reactivity@6.4.0
```

---

## 📚 文档资源

- 📖 **快速开始**: [快速入门指南](../tutorial/quick-start.md)
- 📚 **完整文档**: [SUMMARY.md](../SUMMARY.md)
- 🔧 **API 参考**: [API 文档](../api/index.md)
- 🎨 **组件文档**: [UI 组件库](../ecosystem/ui.md)
- 🛠️ **插件开发**: [插件开发指南](../development/PLUGIN_DEVELOPMENT.md)

---

## 🚀 下一步计划

v6.4.0 发布后，我们将继续推进：

- 性能优化和基准测试
- 更多生态系统组件
- 开发者体验改进
- 社区贡献激励

---

## 💬 反馈与支持

- 📝 **Issue 反馈**: [GitHub Issues](https://github.com/lytjs/lytjs/issues)
- 💬 **Discord 社区**: 加入我们的 [Discord 服务器](https://discord.gg/lytjs)
- 📧 **邮件联系**: contact@lytjs.org

---

## 📄 完整变更日志

详细变更请查看 [CHANGELOG.md](../development/CHANGELOG.md)。

---

**感谢所有贡献者！** 🙏

— LytJS 团队
