# LytJS v6.6.0 发布说明

## 🎉 版本亮点

LytJS v6.6.0 是一个优化和完善的重要版本，重点关注包复用、HTTP 工具集增强和查询参数处理功能！

## 🚀 新增功能

### 1. @lytjs/common-query - 增强版查询参数处理

- **新特性**：
  - 支持数组查询参数解析
  - `parseQueryStringWithArrays` - 便捷函数，直接支持数组值
  - `stringifyQueryString` - 增强版，支持数组、布尔值、数字等多种类型
  - 保持完全向后兼容
  - 完整的 TypeScript 类型支持

### 2. @lytjs/common-http - 增强版 HTTP 客户端

- **新特性**：
  - 添加了大量便捷方法（`get`, `post`, `put`, `patch`, `del`）
  - 添加了直接返回数据的 JSON 方法（`getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson`, `requestJson`）
  - 集成了 `@lytjs/common-query`，支持数组查询参数
  - 完善了文档和示例代码
  - 添加了完整的测试用例

### 3. 包复用优化

- **@lytjs/http-server** 重构完成：
  - 移除了重复的 `parseQuery` 实现
  - 直接使用 `@lytjs/common-query` 中的 `parseQueryStringWithArrays`
  - 添加了 `@lytjs/common-query` 依赖
  - 保持了完全的功能完整性

### 4. 完善的生态系统包文档

- **@lytjs/common-http** - 添加了完整的 README 文档
- **@lytjs/api** - 添加了完整的 README 文档
- **@lytjs/common-cache** - 已有完善的文档
- **@lytjs/common-string** - 已有完善的文档

## 📦 完整更新包列表

### common 包升级

1. `@lytjs/common-query` - 重要功能增强
2. `@lytjs/common-http` - 重要功能增强

### 生态包升级

1. `@lytjs/http-server` - 依赖优化和重构

## 🔧 改进和修复

### 代码质量优化

- 移除了重复的代码实现
- 统一了查询参数处理逻辑
- 优化了 `requestJson` 函数实现
- 添加了更完整的类型定义

### 测试覆盖

- 为 `@lytjs/common-http` 添加了完整的测试用例
- 为 `@lytjs/common-query` 数组功能添加了完整的测试用例
- 测试覆盖率得到显著提升

### 文档完善

- 为 `@lytjs/common-http` 添加了详细的使用说明
- 为 `@lytjs/api` 添加了完整的文档
- 添加了完整的使用示例代码

## 📖 升级指南

### 版本发布说明

版本号将在正式发布时通过 changesets 自动更新。

### 升级指南

升级内容将在正式发布后提供。

### 新功能快速使用

#### 使用 @lytjs/common-query 数组参数

```typescript
import { parseQueryStringWithArrays, stringifyQueryString } from '@lytjs/common-query';

// 解析数组参数
const query = parseQueryStringWithArrays('?ids=1&ids=2&ids=3&tags=admin&tags=user');
// { ids: ['1', '2', '3'], tags: ['admin', 'user'] }

// 生成查询字符串
const url = stringifyQueryString({
  page: 1,
  limit: 10,
  filters: ['active', 'verified'],
  ids: [1, 2, 3],
});
```

#### 使用 @lytjs/common-http 便捷方法

```typescript
import { getJson, postJson } from '@lytjs/common-http';

// 直接获取数据
const users = await getJson('/api/users');

// 发送 POST 请求并获取响应
const newUser = await postJson('/api/users', { name: 'test' });
```

#### 使用数组查询参数的 HTTP 请求

```typescript
import { http } from '@lytjs/common-http';

const response = await http.get('/api/users', {
  params: {
    ids: [1, 2, 3],
    tags: ['admin', 'user'],
    active: true,
    page: 1,
  },
});
```

## 🎯 下一步计划

1. **性能基准测试** - 对比 v6.5.0 的性能改进
2. **社区准备** - 编写教程和示例项目
3. **新功能规划** - 收集社区反馈，规划下一个版本的功能
4. **E2E 测试完善** - 进行全面的端到端测试

## 👏 贡献者

感谢所有参与 v6.6 开发的贡献者！

## 📄 许可证

MIT
