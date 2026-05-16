# LytJS 贡献者指南

感谢您对 LytJS 的关注！本指南将帮助您了解如何为 LytJS 项目做出贡献。

## 目录

- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [快速开始](#快速开始)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [插件开发](#插件开发)
- [社区规范](#社区规范)

---

## 如何贡献

### 贡献类型

LytJS 欢迎各种形式的贡献：

#### 1. 代码贡献

| 类型 | 说明 |
|------|------|
| Bug 修复 | 修复现有问题 |
| 新功能 | 实现新特性 |
| 性能优化 | 提升框架性能 |
| 代码重构 | 改善代码结构 |

#### 2. 文档贡献

| 类型 | 说明 |
|------|------|
| 文档完善 | 补充缺失内容 |
| 翻译文档 | 多语言支持 |
| 教程撰写 | 使用教程 |
| 案例分享 | 实战案例 |

#### 3. 社区贡献

| 类型 | 说明 |
|------|------|
| 问题解答 | 回答社区问题 |
| 代码审查 | Review Pull Request |
| 功能测试 | 验证新功能 |
| 反馈建议 | 改进建议 |

---

## 开发环境

### 环境要求

```bash
Node.js >= 18.0.0
pnpm >= 9.0.0
Git
```

### 安装步骤

```bash
# 1. Fork 仓库
git clone https://github.com/idcu/lytjs.git
cd lytjs

# 2. 安装依赖
pnpm install

# 3. 验证安装
pnpm build
```

### 开发工具

推荐使用以下开发工具：

- **IDE**: VS Code
- **插件**: ESLint, Prettier, TypeScript
- **终端**: Windows Terminal / iTerm2

---

## 快速开始

### 1. 创建分支

```bash
# 从 develop 分支创建
git checkout develop
git pull origin develop

# 创建功能分支
git checkout -b feature/your-feature
```

### 2. 开发流程

```bash
# 1. 编写代码
# ... 编辑代码 ...

# 2. 运行测试
pnpm test

# 3. 代码检查
pnpm lint:check

# 4. 类型检查
pnpm type-check

# 5. 构建
pnpm build
```

### 3. 提交代码

```bash
# 1. 添加修改
git add .

# 2. 提交（使用规范的提交信息）
git commit -m "feat(scope): 添加新功能"

# 3. 推送到远程
git push origin feature/your-feature
```

### 4. 创建 Pull Request

1. 访问 GitHub 仓库
2. 点击 "New Pull Request"
3. 选择分支并填写描述
4. 等待代码审查

---

## 代码规范

### TypeScript 规范

```typescript
// ✅ 正确：使用明确的类型
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// ❌ 错误：使用 any
function greet(name: any): any {
  return `Hello, ${name}!`;
}

// ✅ 正确：使用 interface
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ 错误：使用 type 与对象字面量混用
type User = {
  id: string;
};
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `userName`, `getUser()` |
| 类/接口/类型 | PascalCase | `UserService`, `UserData` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_URL` |
| 文件 | kebab-case | `user-service.ts`, `error-boundary.ts` |
| 组件 | PascalCase | `UserCard.tsx`, `ErrorBoundary.tsx` |

### 代码风格

```typescript
// 1. 4 空格缩进
function example() {
    if (condition) {
        doSomething();
    }
}

// 2. 单引号字符串
const name = 'LytJS';

// 3. 分号结尾
const result = 'success';

// 4. 80 字符限制
// 长字符串可以拆分为多行
const longMessage = '这是一个很长的消息，' +
    '需要拆分成多行以保持代码整洁';

// 5. 箭头函数
const add = (a: number, b: number): number => a + b;

// 6. 异步函数
async function fetchData(): Promise<Data> {
    const response = await fetch(url);
    return response.json();
}
```

### 注释规范

```typescript
/**
 * 获取用户信息
 *
 * @param userId - 用户 ID
 * @returns 用户信息对象
 * @throws {NotFoundError} 用户不存在时抛出
 */
async function getUser(userId: string): Promise<User> {
    // 单行注释用于解释不明显的代码
    const cacheKey = `user:${userId}`;
    
    // TODO: 优化缓存策略
    const cached = await cache.get(cacheKey);
    
    return cached || fetchFromDatabase(userId);
}
```

### 导入规范

```typescript
// 1. 按顺序分组
// 外部依赖
import React from 'react';

// 内部依赖（按相对路径长度排序）
import { useState } from 'react';
import type { User } from '../types';
import { UserService } from './user-service';

// 2. 类型导入使用 type 关键字
import type { VNode } from '@lytjs/vdom';

// 3. 同模块多个导入可以合并
import { 
    createVNode, 
    h,
    Fragment 
} from '@lytjs/vdom';
```

---

## 提交规范

### 提交信息格式

```
<类型>(<范围>): <主题>

<正文>

<脚注>
```

### 提交类型

| 类型 | 说明 | 何时使用 |
|------|------|----------|
| feat | 新功能 | 添加新特性 |
| fix | 修复错误 | 修复 Bug |
| docs | 文档更改 | 仅文档修改 |
| style | 代码格式 | 不影响功能 |
| refactor | 重构 | 不修复也不添加 |
| test | 测试 | 添加或修改测试 |
| chore | 构建/工具 | 工具或依赖更新 |

### 范围标识

| 范围 | 说明 |
|------|------|
| core | 核心框架 |
| reactivity | 响应式系统 |
| vdom | 虚拟 DOM |
| router | 路由 |
| store | 状态管理 |
| ssr | 服务端渲染 |
| docs | 文档 |
| test | 测试 |
| build | 构建 |
| ci | CI/CD |

### 示例

```
feat(core): 添加 ErrorBoundary 组件

实现错误边界组件，支持：
- 自定义降级 UI
- 错误重试机制
- 错误日志记录

Closes #123
```

```
fix(router): 修复路由守卫重复执行问题

- 添加守卫执行状态追踪
- 避免重复触发守卫

Fixes #456
```

```
docs: 更新贡献者指南

- 添加代码规范说明
- 完善提交信息规范
- 增加测试要求说明
```

### 提交注意事项

1. **主题行**：不超过 50 个字符
2. **正文**：解释"为什么"而不是"做了什么"
3. **使用祈使语气**："添加"而不是"已添加"
4. **关联 Issue**：在脚注中引用相关 Issue

---

## 测试要求

### 测试覆盖率

- **核心包**: >= 90% 覆盖率
- **普通代码**: >= 80% 覆盖率
- **所有 PR**: 必须通过测试

### 测试文件命名

```
组件.test.ts       # 单元测试
组件.integration.test.ts  # 集成测试
组件.e2e.test.ts    # 端到端测试
```

### 测试示例

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../src/error-boundary';

describe('ErrorBoundary', () => {
    it('should render children when no error', () => {
        const vnode = ErrorBoundary({
            children: null,
        });
        expect(vnode).toBeDefined();
    });

    it('should call onError callback when error occurs', () => {
        const onError = vi.fn();
        const vnode = ErrorBoundary({
            onError,
        });
        expect(vnode).toBeDefined();
    });
});
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test -- error-boundary.test.ts

# 监听模式
pnpm test --watch

# 生成覆盖率报告
pnpm test --coverage
```

---

## 插件开发

### 创建插件

```typescript
// packages/plugins/packages/your-plugin/src/index.ts
import { definePlugin } from '@lytjs/core';

export const yourPlugin = definePlugin({
    name: 'your-plugin',
    version: '1.0.0',

    install(app, options) {
        // 插件安装逻辑
        app.component('your-component', YourComponent);
        app.directive('your-directive', YourDirective);
    }
});
```

### 插件审核

提交插件到官方生态需要通过审核：

1. **代码质量**
   - TypeScript 类型完整
   - 测试覆盖率 >= 80%
   - 无 lint 错误
   - 零运行时依赖

2. **文档完整**
   - README.md 完整
   - API 文档齐全
   - 使用示例 >= 3 个

3. **提交审核**
   - 创建 GitHub Issue
   - 等待 3-5 工作日审查
   - 通过后发布到 npm

---

## 社区规范

### 行为准则

- **尊重他人**: 友善交流，避免人身攻击
- **专业交流**: 技术讨论为主，保持开放心态
- **开放包容**: 欢迎不同背景的贡献者
- **积极贡献**: 分享知识，帮助他人

### 问题反馈

1. **搜索现有 Issue** - 避免重复
2. **提供最小可复现代码** - 方便定位问题
3. **填写 Issue 模板** - 包含环境信息
4. **保持耐心** - 维护者会尽快响应

### 联系方式

| 渠道 | 地址 |
|------|------|
| GitHub Issues | https://github.com/idcu/lytjs/issues |
| 官网 | https://idcu.github.io/lytjs/ |
| 邮箱 | idcu@qq.com |

---

## 常见问题

### Q: 如何选择分支？

```
develop   -> 开发分支（默认）
feature/* -> 功能分支
fix/*     -> 修复分支
```

### Q: PR 被拒绝怎么办？

1. 仔细阅读审查意见
2. 根据意见修改代码
3. 重新提交

### Q: 测试失败怎么办？

1. 确保本地测试通过
2. 检查是否有遗漏的测试用例
3. 提交修复或新增测试

---

## 许可证

贡献 LytJS 即表示您同意将您的代码按 MIT 许可证授权。

---

**最后更新**: 2026-05-16
