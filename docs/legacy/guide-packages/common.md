# L0 基础层 (@lytjs/common-\*)

L0 层是 LytJS 的**最小依赖集**，包含 30+ 个零外部依赖的工具包。所有 L0 包不依赖任何其他 LytJS 包，仅使用 JavaScript 原生 API。

---

## 设计原则

1. **零外部依赖** — 不引入任何 npm 包
2. **Tree-shaking 友好** — 每个函数独立导出
3. **类型安全** — 完整的 TypeScript 类型定义
4. **环境无关** — 可在浏览器、Node.js、Web Worker 中运行

---

## 分类索引

### 类型与判断

| 包                     | 说明                                   |
| ---------------------- | -------------------------------------- |
| `@lytjs/common-is`     | 类型判断（isString, isArray 等）       |
| `@lytjs/common-object` | 对象操作（deepClone, merge, get, set） |
| `@lytjs/common-array`  | 数组操作（unique, chunk, groupBy）     |

### 字符串处理

| 包                     | 说明                      |
| ---------------------- | ------------------------- |
| `@lytjs/common-string` | 驼峰转换、HTML 转义、截断 |
| `@lytjs/common-query`  | URL 查询字符串解析        |

### 函数式工具

| 包                        | 说明                           |
| ------------------------- | ------------------------------ |
| `@lytjs/common-function`  | 防抖、节流、记忆化、组合       |
| `@lytjs/common-algorithm` | 二分查找、排序、最长公共子序列 |

### 异步与调度

| 包                              | 说明                         |
| ------------------------------- | ---------------------------- |
| `@lytjs/common-scheduler`       | 任务调度、队列管理、nextTick |
| `@lytjs/common-async-scheduler` | 异步任务调度                 |
| `@lytjs/common-raf`             | requestAnimationFrame 封装   |

### 存储与网络

| 包                      | 说明                               |
| ----------------------- | ---------------------------------- |
| `@lytjs/common-storage` | localStorage / sessionStorage 封装 |
| `@lytjs/common-http`    | HTTP 客户端（fetch 封装）          |
| `@lytjs/common-cache`   | LRU 缓存实现                       |

### 错误与事件

| 包                     | 说明                            |
| ---------------------- | ------------------------------- |
| `@lytjs/common-error`  | warn, error, assert, 堆栈格式化 |
| `@lytjs/common-events` | EventEmitter / EventBus         |

### 平台与检测

| 包                       | 说明                             |
| ------------------------ | -------------------------------- |
| `@lytjs/common-env`      | 环境检测（isBrowser, isNode 等） |
| `@lytjs/common-keyboard` | 键盘事件、快捷键解析             |

### 样式与 DOM

| 包                                | 说明                          |
| --------------------------------- | ----------------------------- |
| `@lytjs/common-dom-helpers`       | addClass, setStyle, getOffset |
| `@lytjs/common-transition-engine` | 过渡动画引擎                  |
| `@lytjs/common-event-normalizer`  | 事件归一化处理                |

### 业务工具

| 包                          | 说明                           |
| --------------------------- | ------------------------------ |
| `@lytjs/common-validate`    | 数据验证（邮箱、手机、URL 等） |
| `@lytjs/common-security`    | HTML 转义、XSS 防护、CSP nonce |
| `@lytjs/common-performance` | 性能监控、渲染时间追踪         |

### 类型定义

| 包                        | 说明                         |
| ------------------------- | ---------------------------- |
| `@lytjs/common-constants` | 框架内部常量（MAX_DEPTH 等） |
| `@lytjs/common-vnode`     | VNode 类型别名               |
| `@lytjs/common-dom`       | DOM 类型定义                 |
| `@lytjs/common-timing`    | 时间工具（now, formatDate）  |
| `@lytjs/common-path`      | 路径操作（join, resolve）    |

### 渲染相关

| 包                           | 说明                              |
| ---------------------------- | --------------------------------- |
| `@lytjs/common-render-queue` | 渲染队列管理                      |
| `@lytjs/common-a11y`         | 无障碍工具（announce, trapFocus） |

### 聚合包

| 包              | 说明                          |
| --------------- | ----------------------------- |
| `@lytjs/common` | 聚合全部 common-\* 子包的导出 |

---

## 内部依赖关系

```
@lytjs/common-is (基础)
       ↑
       │
   ┌───┴───┬──────────────┬───────────────┐
   ↓       ↓              ↓               ↓
string   object        function        scheduler
   ↑       ↑              ↑               ↑
   ↑       ↑              ↑               ↓
  error   storage     events          raf
   ↑       ↑              ↑               ↓
   ↑       ↑              ↑           render-queue
   ↑       ↑              ↑
   ↑       ↑              ↓
   ↑       ↓          event-normalizer
   ↑       ↓               ↑
   ↓       ↓               ↑
common─┬───cache           ↓
        ↓            transition-engine
        ↓
        └──→ common (聚合包)
```

**规则：** common-is 是基础，其他所有 common-\* 包都依赖它。

---

## 使用方式

### 按需导入（推荐）

```ts
import { isString, isArray } from '@lytjs/common-is';
import { camelToKebab } from '@lytjs/common-string';
import { deepClone } from '@lytjs/common-object';
```

### 使用聚合包

```ts
import * as common from '@lytjs/common';
// common.isString, common.camelToKebab, ...
```

---

## 命名规范

所有 common-\* 包遵循统一的命名规范：

```
@lytjs/common-{category}
```

| category    | 含义     | 示例                         |
| ----------- | -------- | ---------------------------- |
| `is`        | 类型判断 | `isString`, `isArray`        |
| `string`    | 字符串   | `camelToKebab`, `escapeHtml` |
| `object`    | 对象操作 | `deepClone`, `merge`         |
| `array`     | 数组操作 | `unique`, `chunk`            |
| `function`  | 函数工具 | `debounce`, `throttle`       |
| `error`     | 错误处理 | `warn`, `error`              |
| `events`    | 事件系统 | `EventEmitter`               |
| `scheduler` | 调度器   | `queueJob`, `nextTick`       |
| `cache`     | 缓存     | `createCache`                |
| `storage`   | 存储     | `getStorage`                 |
| `http`      | 网络     | `createHttpClient`           |
| `validate`  | 验证     | `isEmail`, `isUrl`           |
| `security`  | 安全     | `escapeHtml`, `sanitizeHtml` |
| `env`       | 环境     | `isBrowser`, `isNode`        |
| `dom`       | DOM      | DOM 类型定义                 |
| `a11y`      | 无障碍   | `announce`, `trapFocus`      |

---

## 扩展 L0 包

### 创建新的 common-\* 子包

1. 在 `packages/common/packages/` 下创建目录
2. 添加 `package.json`、`tsconfig.json`、`vitest.config.ts`
3. 仅依赖 `common-is` 或其他 common-\* 包
4. 添加单元测试
5. 在 `packages/common/src/index.ts` 中导出

### 包结构模板

```
packages/common/packages/common-xxx/
├── src/
│   ├── index.ts          # 主入口，导出所有函数
│   └── xxx.ts            # 功能实现
├── tests/
│   └── index.test.ts     # 单元测试
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 扩展阅读

- [API 参考 - common-\*](../api/common) — 完整 API 文档
- [包总览](./index) — 所有包索引
