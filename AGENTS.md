# LytJS 项目规则

## 项目基础
- **项目**: Lyt.js v6.0.0 - 轻量级前端框架
- **包管理器**: pnpm (>=9.0.0)
- **Node.js**: >=18.0.0
- **语言**: TypeScript（严格模式）
- **测试**: Vitest
- **分支**: develop
- **结构**: Monorepo

## 核心规则
- **语言**: 所有回答使用中文，变量名函数名用英文（camelCase/PascalCase）
- **注释**: 公共 API 必须有中文 JSDoc，关键逻辑加中文注释
- **类型**: 禁止 any（测试除外），优先 import type
- **代码**: 单个函数不超过 50 行，避免过度设计
- **零依赖**: L0-L6 层运行时无第三方依赖，优先用 @lytjs/common-*
- **架构**: 8 层架构，L0 基础工具层可被任意层依赖

## Git 工作流
```bash
git checkout -b feature/xxx  # 创建功能分支
pnpm lint:check && pnpm type-check  # 提交前检查
git commit --no-verify -m "feat(scope): 描述"  # 提交
```

## 常用命令
```bash
pnpm install          # 安装依赖
pnpm build            # 构建
pnpm test             # 测试
pnpm lint:check       # 代码检查
pnpm type-check     # 类型检查
```

## 核心包速查
- `@lytjs/common-is` - 类型检查
- `@lytjs/common-constants` - 常量
- `@lytjs/reactivity` - 响应式
- `@lytjs/vdom` - 虚拟 DOM
- `@lytjs/core` - 核心框架
- `@lytjs/router` - 路由
- `@lytjs/store` - 状态管理
- `@lytjs/ui` - UI 组件库

## 详细文档
- 开发规范: [docs/development/DEVELOPMENT_GUIDELINES.md](./docs/development/DEVELOPMENT_GUIDELINES.md)
- 常见问题: [docs/development/TROUBLESHOOTING.md](./docs/development/TROUBLESHOOTING.md)
- 开发技能: [docs/development/DEVELOPMENT_SKILLS.md](./docs/development/DEVELOPMENT_SKILLS.md)
