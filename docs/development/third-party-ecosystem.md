# LytJS 第三方插件生态

欢迎为 LytJS 贡献第三方插件和组件！

## 目录

1. [插件开发指南](#插件开发指南)
2. [插件审核与推荐](#插件审核与推荐)
3. [发布流程](#发布流程)
4. [最佳实践](#最佳实践)

---

## 插件开发指南

### 基本架构

LytJS 插件应该遵循以下架构：

```javascript
import { definePlugin } from '@lytjs/core';

export default definePlugin({
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'A brief description of what this plugin does',
  author: 'Your Name',
  keywords: ['lytjs', 'plugin'],
  install(app, options) {
    // Plugin implementation
  },
});
```

### 零依赖原则

所有核心运行时代码应该保持零第三方依赖，只可以在开发/构建工具中引入依赖。

### TypeScript 类型

确保提供完整的 TypeScript 类型定义，便于用户使用。

---

## 插件审核与推荐

### 审核标准

为了保证用户体验，插件需要满足以下条件才能获得官方推荐：

1. **零运行时依赖**：核心运行时代码不引入第三方依赖
2. **完整的类型定义**：提供完整的 TypeScript 类型支持
3. **测试覆盖**：包含单元测试，核心功能覆盖率 > 80%
4. **文档完善**：提供详细的使用文档和示例
5. **功能实用**：解决实际问题，功能明确清晰
6. **性能良好**：没有明显的性能问题
7. **代码质量**：遵循代码规范，有适当的注释

### 推荐流程

1. 在 GitHub 或 NPM 上发布您的插件
2. 创建一个 Pull Request 到 LytJS 主仓库
3. 在 PR 中描述您的插件功能和特性
4. 等待审核
5. 审核通过后，您的插件将被添加到推荐列表中

---

## 发布流程

### 发布到 NPM

```bash
# 1. 构建您的插件
pnpm build

# 2. 发布（需要先登录）
pnpm login
pnpm publish --access=public
```

### 推荐的 package.json 结构

```json
{
  "name": "lytjs-plugin-xxx",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "devDependencies": {
    "@lytjs/core": "^6.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "@lytjs/core": "^6.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/lytjs-plugin-xxx.git"
  },
  "keywords": ["lytjs", "plugin"],
  "license": "MIT"
}
```

---

## 最佳实践

### 插件命名规范

使用 `lytjs-plugin-xxx` 或 `@your-scope/lytjs-plugin-xxx` 的格式。

### 文档示例

提供完整的示例代码：

```javascript
import { createApp } from '@lytjs/core';
import myPlugin from 'lytjs-plugin-xxx';

const app = createApp();
app.use(myPlugin, {
  /* options */
});
app.mount('#app');
```

### 测试规范

使用 Vitest 作为测试框架，确保核心功能都有测试覆盖。

---

## 交流与反馈

如有任何问题或建议，欢迎：

- 在 GitHub 上创建 Issue
- 加入我们的社区讨论
- 发送邮件到 contact@lytjs.dev

感谢您对 LytJS 社区的贡献！
