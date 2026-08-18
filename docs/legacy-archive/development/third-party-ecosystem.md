# LytJS 第三方插件生态

> 为 LytJS 贡献第三方插件和组件，建立繁荣的生态系统

## 目录

1. [插件开发指南](#插件开发指南)
2. [插件审核与推荐](#插件审核与推荐)
3. [官方推荐插件列表](#官方推荐插件列表)
4. [发布流程](#发布流程)
5. [最佳实践](#最佳实践)
6. [社区治理](#社区治理)

---

## 插件开发指南

### 基本架构

LytJS 插件应该遵循以下架构：

```typescript
import { definePlugin } from '@lytjs/core';
import type { Plugin, App } from '@lytjs/core';

export interface MyPluginOptions {
  debug?: boolean;
  timeout?: number;
}

export const myPlugin = definePlugin<MyPluginOptions>({
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'A brief description of what this plugin does',
  author: 'Your Name',
  keywords: ['lytjs', 'plugin'],

  install(app: App, options?: MyPluginOptions) {
    const debug = options?.debug ?? false;
    const timeout = options?.timeout ?? 5000;

    if (debug) {
      console.log('[MyPlugin] Plugin installed with options:', options);
    }

    // 注册全局组件
    app.component('MyComponent', {
      setup() {
        // 组件实现
        return () => h('div', 'Hello from MyPlugin!');
      },
    });

    // 提供依赖
    app.provide('myPlugin', {
      debug,
      timeout,
      doSomething() {
        console.log('Doing something...');
      },
    });
  },

  // 可选：生命周期钩子
  onMounted() {
    console.log('[MyPlugin] App mounted');
  },

  onUnmounted() {
    console.log('[MyPlugin] App unmounted');
  },
});

export default myPlugin;
```

### 零依赖原则

所有核心运行时代码应该保持**零第三方依赖**，只可以在开发/构建工具中引入依赖。

**允许的依赖**：

- TypeScript 类型定义包
- 构建工具（tsup、vite、rollup 等）
- 测试框架（vitest、jest 等）
- Lint 工具（eslint、prettier 等）

**禁止的依赖**：

- 运行时业务逻辑库
- UI 组件库
- 状态管理库
- HTTP 客户端库
- 工具函数库（请使用 @lytjs/common-\* 系列）

### TypeScript 类型

确保提供完整的 TypeScript 类型定义，便于用户使用。

```typescript
// src/index.ts
export interface MyPluginOptions {
  debug?: boolean;
  timeout?: number;
  customOption?: string;
}

// 导出的类型
export type { MyPluginOptions };

// 插件定义
export const myPlugin = definePlugin<MyPluginOptions>({
  name: 'my-plugin',
  // ...
});

// 默认导出
export default myPlugin;
```

---

## 插件审核与推荐

### 审核标准

为了保证用户体验，插件需要满足以下条件才能获得官方推荐：

#### 1. 代码质量（必需）

- ✅ **零运行时依赖**：核心运行时代码不引入第三方依赖
- ✅ **完整的类型定义**：提供完整的 TypeScript 类型支持
- ✅ **测试覆盖**：包含单元测试，核心功能覆盖率 > 80%
- ✅ **无编译错误**：TypeScript strict 模式下无错误

#### 2. 文档完整性（必需）

- ✅ **README.md**：包含安装、使用、API 文档
- ✅ **使用示例**：至少 3 个不同场景的示例
- ✅ **中文文档**：（推荐）提供中文使用指南
- ✅ **变更日志**：记录版本更新内容

#### 3. 功能完整性（必需）

- ✅ **核心功能稳定**：通过完整测试
- ✅ **边界情况处理**：处理错误和异常
- ✅ **性能达标**：无明显的性能问题

#### 4. 安全性（必需）

- ✅ **无恶意代码**：通过代码审查
- ✅ **依赖安全**：无已知安全漏洞
- ✅ **隐私合规**：不收集敏感用户数据

#### 5. 额外加分项

- ⭐ 提供交互式演示（在线 Demo）
- ⭐ 支持 SSR/SSG
- ⭐ 支持 Vapor 模式
- ⭐ 完整的 CI/CD 流程
- ⭐ 有多个贡献者

### 审核维度权重

| 维度       | 权重   | 最低要求 |
| ---------- | ------ | -------- |
| 代码质量   | 30%    | 必须达标 |
| 文档完整性 | 25%    | 必须达标 |
| 功能完整性 | 25%    | 必须达标 |
| 安全性     | 20%    | 必须达标 |
| 额外特性   | 加分项 | 可选     |

### 推荐等级

#### 🏆 官方插件

由 LytJS 核心团队维护的插件，享受最高优先级支持。

- 包名：`@lytjs/plugin-*`
- 质量标准：最高
- 支持：核心团队优先维护

#### ⭐ 推荐插件

通过官方审核的社区插件，享受官方推荐和宣传。

- 包名：`lytjs-plugin-*` 或 `@scope/lytjs-plugin-*`
- 质量标准：高
- 支持：社区支持 + 官方宣传

#### 🔧 社区插件

社区开发者创建的插件，可在社区交流。

- 包名：任意
- 质量标准：基础
- 支持：社区支持

### 审核流程

```
1. 准备阶段
   ├── 阅读审核标准
   ├── 确保符合所有必需条件
   └── 准备审核材料

2. 提交申请
   ├── 在 LytJS 主仓库创建 Issue
   ├── 使用插件审核模板
   └── 包含插件信息和审核材料

3. 初步审查（3-5 工作日）
   ├── 检查提交材料完整性
   ├── 验证基本信息
   └── 分配审核人员

4. 技术审核（5-10 工作日）
   ├── 代码审查
   ├── 功能测试
   └── 性能评估

5. 安全扫描（1-2 工作日）
   ├── 依赖安全检查
   └── 代码安全审查

6. 结果通知
   ├── 通过：添加到推荐列表
   ├── 需要修改：提供反馈
   └── 未通过：说明原因

7. 发布
   ├── 在推荐列表中添加
   ├── 官方渠道宣传（可选）
   └── 持续维护
```

### 审核费用

**免费** - LytJS 官方不收取任何审核费用

---

## 官方推荐插件列表

### 核心插件（官方维护）

| 插件                    | 版本  | 说明       | 推荐场景 | 状态    |
| ----------------------- | ----- | ---------- | -------- | ------- |
| @lytjs/plugin-form      | 6.2.0 | 表单验证   | 所有应用 | 🏆 官方 |
| @lytjs/plugin-animation | 6.2.0 | 动画效果   | 交互应用 | 🏆 官方 |
| @lytjs/plugin-router    | 6.0.0 | 路由管理   | SPA 应用 | 🏆 官方 |
| @lytjs/plugin-store     | 6.0.0 | 状态管理   | 复杂应用 | 🏆 官方 |
| @lytjs/ssr              | 6.2.0 | 服务端渲染 | SSR/SSG  | 🏆 官方 |

### 社区插件（审核通过）

#### 表单与验证

| 插件                    | 作者 | 说明         | 推荐场景 | 状态    |
| ----------------------- | ---- | ------------ | -------- | ------- |
| lytjs-plugin-validation | 社区 | 高级验证规则 | 表单验证 | ⭐ 推荐 |
| lytjs-plugin-schema     | 社区 | Schema 验证  | 数据验证 | ⭐ 推荐 |

#### UI 组件

| 插件                | 作者 | 说明       | 推荐场景   | 状态    |
| ------------------- | ---- | ---------- | ---------- | ------- |
| lytjs-plugin-charts | 社区 | 图表组件   | 数据可视化 | ⭐ 推荐 |
| lytjs-plugin-icons  | 社区 | 图标库集成 | UI 开发    | ⭐ 推荐 |

#### 工具类

| 插件                 | 作者 | 说明        | 推荐场景   | 状态    |
| -------------------- | ---- | ----------- | ---------- | ------- |
| lytjs-plugin-http    | 社区 | HTTP 客户端 | API 调用   | ⭐ 推荐 |
| lytjs-plugin-storage | 社区 | 本地存储    | 数据持久化 | ⭐ 推荐 |

_持续更新中，欢迎提交插件！_

---

## 发布流程

### 发布到 NPM

```bash
# 1. 确保版本号正确
# 使用语义化版本控制 (semver)

# 2. 构建您的插件
pnpm build

# 3. 发布（需要先登录 NPM）
npm login
pnpm publish --access=public

# 4. 创建 Git Tag
git tag v1.0.0
git push origin v1.0.0
```

### 推荐的 package.json 结构

```json
{
  "name": "lytjs-plugin-xxx",
  "version": "1.0.0",
  "description": "A brief description of what this plugin does",
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
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "devDependencies": {
    "@lytjs/core": "^6.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0",
    "tsup": "^8.0.0",
    "eslint": "^9.0.0"
  },
  "peerDependencies": {
    "@lytjs/core": "^6.0.0"
  },
  "peerDependenciesMeta": {
    "@lytjs/core": {
      "optional": false
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/lytjs-plugin-xxx.git"
  },
  "keywords": ["lytjs", "plugin", "lytjs-plugin"],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 最佳实践

### 插件命名规范

使用以下格式之一：

```
lytjs-plugin-xxx          # 官方格式
@scope/lytjs-plugin-xxx   # 作用域包
@lytjs/plugin-xxx          # 官方插件（需申请）
```

### 文档示例

提供完整的示例代码：

````typescript
// README.md
# 安装

```bash
npm install lytjs-plugin-xxx
# 或
pnpm add lytjs-plugin-xxx
````

# 使用

```typescript
import { createApp } from '@lytjs/core';
import myPlugin from 'lytjs-plugin-xxx';

const app = createApp();
app.use(myPlugin, {
  debug: true,
  timeout: 5000,
});
app.mount('#app');
```

# API

## Options

| 属性    | 类型    | 默认值 | 说明             |
| ------- | ------- | ------ | ---------------- |
| debug   | boolean | false  | 开启调试模式     |
| timeout | number  | 5000   | 超时时间（毫秒） |

## 示例

### 示例 1：基础用法

```typescript
app.use(myPlugin);
```

### 示例 2：配置选项

```typescript
app.use(myPlugin, {
  debug: true,
  timeout: 10000,
});
```

### 示例 3：高级用法

```typescript
const pluginInstance = app.use(myPlugin, {
  debug: true,
});

const pluginApi = app.inject('myPlugin');
pluginApi.doSomething();
```

````

### 测试规范

使用 Vitest 作为测试框架，确保核心功能都有测试覆盖：

```typescript
// src/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import { myPlugin } from '../src';

describe('myPlugin', () => {
  it('should install successfully', () => {
    const app = createApp();
    expect(() => app.use(myPlugin)).not.toThrow();
  });

  it('should apply options', () => {
    const app = createApp();
    app.use(myPlugin, { debug: true });
    // ...
  });
});
````

---

## 社区治理

### 行为准则

我们致力于为每个人提供友好、安全和热情的社区环境。

**期望的行为**：

- 使用欢迎和包容性的语言
- 尊重不同的观点和经验
- 优雅地接受建设性的批评
- 关注对社区最有利的事情
- 与社区其他成员展现同理心

**不可接受的行为**：

- 发表人身攻击或贬低性评论
- 进行人身攻击或贬低个人特征
- 公开或私下骚扰
- 未经明确许可发布他人的私人信息
- 其他不道德或不专业的行为

### 联系方式

- 📧 邮箱：idcu@qq.com
- 💬 GitHub Issues：https://gitee.com/lytjs/lytjs/issues
- 🌐 官网：https://idcu.github.io/lytjs/

### 贡献者许可证

通过向 LytJS 项目贡献代码，您同意将您的贡献按 MIT 许可证授权。

---

## 交流与反馈

如有任何问题或建议，欢迎：

- 在 GitHub/Gitee 上创建 Issue：https://gitee.com/lytjs/lytjs/issues
- 访问官网：https://idcu.github.io/lytjs/
- 发送邮件到 idcu@qq.com

感谢您对 LytJS 社区的贡献！🎉

---

## 更新记录

- 2026-05-16: 完善审核机制和推荐流程
- 2026-05-16: 添加官方推荐插件列表
- 2026-05-16: 增加社区治理章节
