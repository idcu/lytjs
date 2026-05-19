# LytJS v6.5.0 发布说明

## 🎉 版本亮点

LytJS v6.5.0 是一个功能完善的重要版本，包含了大量的生态系统包、增强插件和性能优化！

## 🚀 新增功能

### 阶段一：核心增强

#### 1. @lytjs/plugin-data - 增强版数据获取插件
- **特性**：
  - 乐观更新支持
  - 请求去重
  - 多种缓存策略（TTL、LRU）
  - 自动重试
  - 与 @lytjs/plugin-data-fetch 深度集成

#### 2. @lytjs/router-fs - 文件系统路由引擎
- **特性**：
  - 基于文件系统的自动路由生成
  - 支持动态路由参数
  - 支持嵌套路由
  - 零外部依赖

#### 3. @lytjs/api - API 路由引擎
- **特性**：
  - 文件系统 API 路由
  - RESTful API 规范
  - 支持中间件
  - 零外部依赖

### 阶段二：静态与构建

#### 1. @lytjs/bundler - 构建工具集成
- **特性**：
  - Vite 插件集成
  - Webpack 插件集成
  - SSG 支持
  - SSR 配置优化

#### 2. @lytjs/hmr - 热模块替换
- **特性**：
  - WebSocket 连接管理
  - 模块更新处理
  - 自动重连
  - 状态保持

#### 3. @lytjs/ssg 和 @lytjs/isr
- **特性**：已完整包含在 @lytjs/ssr 包中！
  - 静态站点生成
  - 增量静态再生成
  - 预渲染支持

### 阶段三：生态完善

#### 1. @lytjs/runtime-edge - 边缘运行时支持
- **特性**：
  - 边缘函数支持
  - 边缘路由器
  - 内存缓存
  - 响应辅助工具

#### 2. 现有插件版本升级
- **@lytjs/plugin-i18n** - 国际化插件 v6.5.0
- **@lytjs/plugin-auth** - 认证插件 v6.5.0
- **@lytjs/plugin-storage** - 存储插件 v6.5.0
- **@lytjs/plugin-testing** - 测试插件 v6.5.0

### 阶段四：性能优化

#### 1. Tree-shaking 优化
- 所有包已添加 `sideEffects: false`
- tsup 配置已启用 treeshake 选项
- 优化打包体积

#### 2. 版本统一
- 所有核心包升级至 v6.5.0
- 所有新增包版本为 v6.5.0
- 依赖关系更新为 ^6.5.0

## 📦 完整新包列表

### 插件包
1. `@lytjs/plugin-data` - 增强版数据获取插件
2. `@lytjs/plugin-data-fetch` - 数据获取基础插件（v6.5.0）

### 生态系统包
1. `@lytjs/router-fs` - 文件系统路由引擎
2. `@lytjs/api` - API 路由引擎
3. `@lytjs/bundler` - 构建工具集成
4. `@lytjs/hmr` - 热模块替换
5. `@lytjs/runtime-edge` - 边缘运行时支持

### 核心包版本升级
- `@lytjs/core` - v6.4.0 → v6.5.0
- `@lytjs/reactivity` - v6.4.0 → v6.5.0

## 📝 更新的包

### 现有插件（已存在，已升级）
1. `@lytjs/plugin-i18n` - 国际化插件
2. `@lytjs/plugin-auth` - 认证插件
3. `@lytjs/plugin-storage` - 存储插件
4. `@lytjs/plugin-testing` - 测试插件
5. `@lytjs/plugin-validation` - 验证插件（已完善）

## 🔧 改进和修复

### 构建工具
- 完善 tsup 配置，添加 `outExtension` 配置
- 统一所有包的构建配置
- 确保 `.mjs` 和 `.cjs` 双格式输出

### 文档和路线图
- 更新 [ROADMAP_NEXT_STEPS.md](../development/ROADMAP_NEXT_STEPS.md)
- 完整记录所有阶段的完成情况
- 明确后续发布计划

## 📖 升级指南

### 从 v6.4.0 升级

```bash
# 更新所有核心包
pnpm update @lytjs/core @lytjs/reactivity

# 或者使用新包
pnpm add @lytjs/plugin-data @lytjs/router-fs @lytjs/api
```

### 新包快速使用

#### 使用 @lytjs/plugin-data
```typescript
import { createData } from '@lytjs/plugin-data';

const data = createData('/api/users');
```

#### 使用 @lytjs/router-fs
```typescript
import { createFileSystemRouter } from '@lytjs/router-fs';

const router = createFileSystemRouter({ pagesDir: './src/pages' });
```

#### 使用 @lytjs/bundler
```typescript
import { createViteConfig } from '@lytjs/bundler';

export default createViteConfig();
```

## 🎯 下一步计划

1. **最终测试和集成验证** - 进行全面的 E2E 测试
2. **准备发布版本** - 生成 CHANGELOG，更新所有包的版本
3. **撰写发布文档** - 完善中文和英文文档
4. **性能基准测试** - 对比 v6.4.0 的性能改进
5. **社区准备** - 更新示例项目，写教程文章

## 👏 贡献者

感谢所有参与 v6.5 开发的贡献者！

## 📄 许可证

MIT
