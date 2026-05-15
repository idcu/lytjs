# LytJS 项目结构说明

## 📁 目录概览

```
packages/
├── core/                  # 核心框架（v6.0.0）
├── reactivity/           # 响应式系统
├── vdom/                 # 虚拟 DOM
├── component/            # 组件系统
├── renderer/             # 渲染器
├── compiler/             # 编译器
├── common/               # 通用工具包（L0-L1 层）
│   └── packages/          # 各种通用工具
├── adapter-web/          # Web 适配器
├── plugins/              # 官方基础插件（L4 层）
│   └── packages/         # 插件集合
├── ecosystem/             # 生态系统包（L5-L6 层）
│   └── packages/         # 高级功能包
└── tools/                # 工程化工具（L7 层）
```

## 🎯 目录职责划分

### 1. `packages/plugins` - 官方基础插件

**定位**：L4 层官方插件，提供框架核心功能支持

**职责**：

- 提供可插拔的基础功能
- 与核心框架紧密集成
- 零第三方依赖
- 基于 definePlugin API 开发

**包含插件**：

- `@lytjs/plugin-theme` - 主题插件（深色/浅色、CSS 变量）
- `@lytjs/plugin-logger` - 日志插件（分级、性能追踪）
- `@lytjs/plugin-auth` - 认证插件（角色、权限）
- `@lytjs/plugin-storage` - 存储插件（localStorage、过期时间）
- `@lytjs/plugin-i18n` - 国际化插件（多语言、翻译插值）
- `@lytjs/plugin-vite` - Vite 构建插件

**特点**：

- 所有插件遵循统一的插件 API
- 可按需引入
- 完整的 TypeScript 类型支持
- 统一的代码风格和文档

### 2. `packages/ecosystem` - 生态系统包

**定位**：L5-L6 层高级功能包，提供业务层面的完整解决方案

**职责**：

- 提供完整的功能模块
- 依赖多个核心包和插件
- 可以依赖第三方库
- 提供完整的业务功能

**包含包**：

- `@lytjs/router` - 路由系统
- `@lytjs/store` - 状态管理
- `@lytjs/ui` - UI 组件库
- `@lytjs/devtools` - 开发者工具
- `@lytjs/ssr` - 服务端渲染
- `@lytjs/compat` - 兼容层
- `@lytjs/platform-adapter` - 平台适配器

**特点**：

- 功能完整，开箱即用
- 可以依赖第三方库
- 提供完整的文档和示例
- 适合构建完整的应用

## 🔍 对比表

| 特性       | plugins              | ecosystem          |
| ---------- | -------------------- | ------------------ |
| 架构层级   | L4 官方插件层        | L5-L6 业务组件层   |
| 依赖方式   | 可选、按需引入       | 功能完整、整体使用 |
| 第三方依赖 | 禁止                 | 可以               |
| 代码规模   | 小型、专注           | 大型、完整         |
| API 风格   | 统一（definePlugin） | 多样（各自定义）   |
| 集成度     | 与核心框架紧密集成   | 独立功能模块       |

## 🚀 使用建议

### 基础项目

如果只需要核心功能和少量插件，使用 core + plugins：

```typescript
import { createApp } from '@lytjs/core';
import pluginTheme from '@lytjs/plugin-theme';
import pluginLogger from '@lytjs/plugin-logger';

const app = createApp();
app.use(pluginTheme);
app.use(pluginLogger);
```

### 完整项目

如果需要完整的功能模块，使用 core + plugins + ecosystem：

```typescript
import { createApp } from '@lytjs/core';
import { router } from '@lytjs/router';
import { createPinia } from '@lytjs/store';
import { Button, Input, Dialog } from '@lytjs/ui';
import pluginTheme from '@lytjs/plugin-theme';

const app = createApp();
app.use(router);
app.use(createPinia());
app.use(pluginTheme);
```

## 📝 开发规范

### 开发新插件（plugins）

1. 在 `packages/plugins/packages/` 下创建目录
2. 参考现有插件的结构
3. 使用 definePlugin API
4. 遵循零第三方依赖原则
5. 保持代码风格一致

### 开发新功能包（ecosystem）

1. 在 `packages/ecosystem/packages/` 下创建目录
2. 定义清晰的 API 接口
3. 可以依赖第三方库
4. 提供完整的文档和测试

## 🔄 包管理

### 构建命令

```bash
# 构建核心包
pnpm build:core

# 构建所有插件
pnpm build:plugins

# 构建生态系统包
pnpm build:ecosystem

# 构建所有
pnpm build
```

### 测试命令

```bash
# 运行所有测试
pnpm test

# 运行插件测试
cd packages/plugins/packages/{plugin-name}
pnpm test
```

## 📚 相关文档

- [插件开发指南](./PLUGIN_DEVELOPMENT.md)
- [8层架构说明](./ARCHITECTURE.md)
- [中文文档指南](./CHINESE_DOCS_GUIDE.md)

---

**文档版本**: v1.1
**最后更新**: 2026-05-14
**维护者**: LytJS Team
