# 零第三方依赖开发规范

> 本文档包含 LytJS 项目的零依赖开发规范

## 零依赖原则

- **运行时零依赖**：所有 L0-L6 层的运行时代码不引入任何第三方库
- **开发时例外**：构建工具、测试工具等仅在开发时使用的依赖可以接受
- **优先自研**：需要的功能优先考虑自研实现，而非引入第三方库

## 零依赖开发检查清单

开发新功能前必须检查：

```
✅ 是否引入了不必要的第三方依赖？
✅ 现有 @lytjs/common-* 工具包是否已有相关功能？
✅ 是否可以用原生 API 实现？
✅ 运行时（非 devDependencies）是否会引入第三方依赖？
✅ 已运行 pnpm run check-zero-deps 验证通过？
```

## 原生 API 使用指南

### 常用原生 API 替代方案

| 功能需求 | 原生 API 方案                      |
| -------- | ---------------------------------- |
| 日期处理 | `Date` 对象、`Intl.DateTimeFormat` |
| 深拷贝   | `structuredClone()`                |
| 数组操作 | 原生 `Array` 方法                  |
| 对象操作 | `Object.assign()`、展开运算符      |
| URL 处理 | `URL`、`URLSearchParams`           |
| DOM 操作 | 原生 DOM API                       |

```typescript
// ✅ 推荐：使用原生日期处理
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

// ❌ 避免：引入第三方日期库
// import dayjs from 'dayjs';
```

## 依赖检查流程

1. **添加新依赖前**：先检查是否真的需要
2. **区分依赖类型**：
   - `devDependencies`：构建、测试工具 ✅ 允许
   - `dependencies`：运行时依赖 ⚠️ 严格禁止
3. **定期审查**：使用 `pnpm run check-deps` 检查依赖使用情况
4. **零依赖验证**：使用 `pnpm run check-zero-deps` 验证所有包是否遵守零依赖规范

## 自研工具优先

优先使用项目已有的 common 工具包：

```typescript
// ✅ 推荐：使用 common-is
import { isArray, isString } from '@lytjs/common-is';

// ✅ 推荐：使用 common-constants
import { EMPTY_OBJ, NOOP } from '@lytjs/common-constants';

// ✅ 推荐：使用 common-string
import { camelize, toPascalCase } from '@lytjs/common-string';

// ❌ 避免：重复造轮子
// const isArray = Array.isArray;
// const isString = (val) => typeof val === 'string';
```

## 零依赖组件开发标准流程

```
1. 基于组件基础层开发
2. 适配主题插件
3. 支持 Vapor 渲染模式
4. 编写单元测试（覆盖率 > 80%）
5. 验证无第三方运行时依赖
6. 编写文档与示例
7. 提交 PR 审查
```

---

**文档版本**: v1.0  
**最后更新**: 2026-05-16  
**维护者**: LytJS Team
