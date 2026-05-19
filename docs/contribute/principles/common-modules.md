# LytJS 公共模块使用规范

本文档详细说明了 LytJS 项目中公共模块的使用规范，确保代码一致性和可维护性。

## 目录

- [核心原则](#核心原则)
- [@lytjs/common-* 包速查](#lytjscommon-包速查)
- [常量使用规范](#常量使用规范)
- [工具函数使用规范](#工具函数使用规范)
- [类型使用规范](#类型使用规范)
- [包依赖规则](#包依赖规则)

---

## 核心原则

1. **优先使用公共模块**：所有核心包和生态系统包应优先从 `@lytjs/common-*` 系列包中导入常量和工具函数
2. **避免本地重复定义**：不要在业务包中重新定义已存在的公共常量或工具函数
3. **保持向后兼容**：公共模块的变更应保持向后兼容
4. **零依赖原则**：`@lytjs/common-*` 包运行时不依赖第三方库

---

## @lytjs/common-* 包速查

### 常量与类型

| 包名 | 主要功能 | 常用导出 |
|------|---------|---------|
| `@lytjs/common-constants` | 通用常量 | `NOOP`, `EMPTY_FN`, `EMPTY_OBJ`, `EMPTY_ARR`, `EMPTY_STRING`, `TRUE`, `FALSE`, `PROTO_POLLUTION_KEYS` |
| `@lytjs/shared-types` | 共享类型定义 | `DebuggerEvent`, `VNode`, `Component`, 类型工具函数 |

### 工具函数

| 包名 | 主要功能 | 常用导出 |
|------|---------|---------|
| `@lytjs/common-is` | 类型检查 | `isString`, `isNumber`, `isBoolean`, `isObject`, `isArray`, `isFunction`, `isPlainObject`, `isNullish`, `hasOwn` |
| `@lytjs/common-object` | 对象与数组工具 | `merge`, `deepMerge`, `deepClone`, `shallowEqual`, `deepEqual`, `pick`, `omit`, `unique`, `chunk`, `flatten`, `groupBy` |
| `@lytjs/common-timing` | 定时与 Promise 工具 | `debounce`, `throttle`, `delay`, `retry`, `timeout`, `poll`, `TaskQueue` |
| `@lytjs/common-string` | 字符串工具 | `camelize`, `capitalize`, `kebabCase` |
| `@lytjs/common-path` | 路径工具 | 路径操作函数 |
| `@lytjs/common-warn` | 警告与日志 | 警告和日志工具 |
| `@lytjs/common-error` | 错误处理 | 错误处理工具 |
| `@lytjs/common-assertions` | 类型断言 | `unsafeCast`, 类型安全的断言函数 |

### 其他工具

| 包名 | 主要功能 |
|------|---------|
| `@lytjs/common-dom` | DOM 操作工具 |
| `@lytjs/common-dom-helpers` | DOM 辅助工具 |
| `@lytjs/common-vnode` | VNode 工具 |
| `@lytjs/common-scheduler` | 调度器 |
| `@lytjs/common-async-scheduler` | 异步调度器 |
| `@lytjs/common-render-queue` | 渲染队列 |
| `@lytjs/common-event-normalizer` | 事件标准化 |
| `@lytjs/common-node-cache` | 节点缓存 |
| `@lytjs/common-performance` | 性能工具 |
| `@lytjs/common-transition-engine` | 过渡引擎 |
| `@lytjs/common-algorithm` | 算法工具 |
| `@lytjs/common-http` | HTTP 工具 |
| `@lytjs/common-raf` | requestAnimationFrame 包装 |
| `@lytjs/common-storage` | 存储工具 |
| `@lytjs/common-validate` | 验证工具 |
| `@lytjs/common-keyboard` | 键盘事件工具 |
| `@lytjs/common-query` | 查询字符串工具 |
| `@lytjs/common-a11y` | 无障碍工具 |
| `@lytjs/common-cache` | 缓存工具 |
| `@lytjs/common-events` | 事件工具 |
| `@lytjs/common-security` | 安全工具 |

---

## 常量使用规范

### ✅ 正确用法

```typescript
import { NOOP, EMPTY_OBJ, EMPTY_ARR } from '@lytjs/common-constants';

// 使用 NOOP 作为默认回调
function setup(callback: () => void = NOOP) {
  callback();
}

// 使用 EMPTY_OBJ 作为默认对象
function processData(data: Record<string, unknown> = EMPTY_OBJ) {
  // ...
}
```

### ❌ 错误用法

```typescript
// 不要本地重新定义
const NOOP = () => {};
const EMPTY_OBJ = {};
```

---

## 工具函数使用规范

### ✅ 正确用法

```typescript
import { isString, isArray } from '@lytjs/common-is';
import { unique, chunk } from '@lytjs/common-object';
import { delay, retry } from '@lytjs/common-timing';

// 类型检查
if (isString(value)) {
  // ...
}

// 数组工具
const uniqueItems = unique(items);
const chunks = chunk(items, 10);

// Promise 工具
await delay(1000);
await retry(fetchData, 3, 1000);
```

### ❌ 错误用法

```typescript
// 不要本地重新实现已有的工具函数
function unique(arr) {
  return [...new Set(arr)];
}
```

---

## 类型使用规范

### ✅ 正确用法

```typescript
import type { DebuggerEvent, VNode } from '@lytjs/shared-types';
import type { Prettify, PartialExcept } from '@lytjs/shared-types';
```

### 使用 type-only 导入

对于类型，应使用 `import type`：

```typescript
import type { SomeType } from '@lytjs/shared-types';
```

---

## 包依赖规则

### @lytjs/common-* 包之间的依赖

- `@lytjs/common-*` 包之间可以相互依赖
- 应避免循环依赖

### 业务包对 @lytjs/common-* 的依赖

- 所有业务包都可以依赖任意 `@lytjs/common-*` 包
- 业务包之间不应直接相互依赖（除了明确的架构依赖）

---

## 新增公共模块指南

如果需要新增公共模块，请遵循以下步骤：

1. **评估必要性**：确认该功能在多个包中会被使用
2. **选择合适的包**：确定功能应放入哪个现有 `@lytjs/common-*` 包，还是需要新建
3. **编写测试**：为新功能编写完整的测试用例
4. **更新文档**：更新本文档和相关 API 文档
5. **代码审查**：提交 PR 进行代码审查

---

## 检查清单

在提交代码前，请确认：

- [ ] 没有重新定义已存在的公共常量
- [ ] 没有重新实现已存在的公共工具函数
- [ ] 所有导入都是从正确的 `@lytjs/common-*` 包中导入
- [ ] 类型导入使用了 `import type`
- [ ] 通过了 `pnpm lint:check` 和 `pnpm type-check`

---

## 参考

- [项目架构文档](./ARCHITECTURE.md)
- [开发规范](./DEVELOPMENT_GUIDELINES.md)
- [代码分析报告](./CODE_ANALYSIS_REPORT.md)
