# @lytjs/common

LytJS 框架的公共工具库 monorepo，包含 13 个子包 + 1 个聚合包。

## 子包列表

| 包名                      | 说明                                   |
| ------------------------- | -------------------------------------- |
| `@lytjs/common-env`       | 环境检测（浏览器/Node/SSR）            |
| `@lytjs/common-is`        | 类型检查工具函数                       |
| `@lytjs/common-string`    | 字符串处理工具                         |
| `@lytjs/common-path`      | 路径处理工具                           |
| `@lytjs/common-events`    | 事件发射器与订阅管理                   |
| `@lytjs/common-cache`     | 缓存策略（LRU/Memoize/Expiring）       |
| `@lytjs/common-timing`    | 定时工具（debounce/throttle/delay 等） |
| `@lytjs/common-algorithm` | 算法（最长递增子序列等）               |
| `@lytjs/common-vnode`     | VNode 类型定义与常量                   |
| `@lytjs/common-error`     | 错误处理与错误码                       |
| `@lytjs/common-object`    | 对象操作工具                           |
| `@lytjs/common-scheduler` | 任务调度器                             |
| `@lytjs/common`           | 聚合包（re-export 所有子包）           |

## 安装

```bash
# 安装聚合包（包含所有子包）
pnpm add @lytjs/common

# 或按需安装单个子包
pnpm add @lytjs/common-is
pnpm add @lytjs/common-string
```

## 开发

```bash
# 安装依赖
pnpm install

# 运行所有测试
pnpm test

# 运行所有 lint
pnpm lint

# 构建所有包
pnpm build

# 类型检查
pnpm type-check
```

## API 概览

### 环境检测

```typescript
import { isBrowser, isNode, isSSR, getEnvInfo } from '@lytjs/common-env';
```

### 类型检查

```typescript
import { isString, isNumber, isObject, isArray, isFunction } from '@lytjs/common-is';
```

### 字符串处理

```typescript
import { capitalize, kebabCase, camelCase, escapeHTML } from '@lytjs/common-string';
```

### 更多 API 请参考各子包的 README。
