# @lytjs/common-constants

全局共享常量定义，集中管理整个框架使用的魔法数字和配置常量，避免分散定义导致的维护困难与重复问题。

## 安装

```bash
pnpm add @lytjs/common-constants
```

## 使用示例

```typescript
import {
  NOOP,
  EMPTY_OBJ,
  EMPTY_ARR,
  MS_PER_SECOND,
  SCHEDULER_MAX_ITERATIONS,
} from '@lytjs/common-constants';

NOOP(); // 空函数占位
const list = EMPTY_ARR; // 冻结的空数组
EMPTY_OBJ; // 冻结的空对象
```

## API 说明

常量按用途分组，约定同一前缀 ${分组名}。以下列出各组作用与代表性常量：

| 分组          | 代表性常量（前缀）                                                                     | 说明                                   |
| ------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| 空值常量      | `NOOP` / `EMPTY_FN` / `EMPTY_OBJ` / `EMPTY_ARR` / `EMPTY_STRING`                       | 空对象与空数组均为冻结对象             |
| 布尔常量      | `TRUE` / `FALSE`                                                                       | `as const` 字面量布尔                  |
| 编译器常量    | `COMPILER_MAX_INPUT_LENGTH` / `COMPILER_MAX_ATTRIBUTES` 等                             | 编译输入长度、正则长度、属性数量等限制 |
| VDOM / 渲染器 | `VDOM_MAX_LIST_DIFF_SIZE` / `VDOM_MAX_RECURSION_DEPTH`                                 | 列表 diff 阈值、最大递归深度           |
| 响应式系统    | `REACTIVITY_MAX_TRIGGER_DEPTH` / `REACTIVITY_MAX_TRACK_DEPTH`                          | 防止无限响应式循环                     |
| 错误处理      | `ERROR_MAX_WARNED_MESSAGES`                                                            | 已警告消息集合的最大大小（FIFO 策略）  |
| 调度器        | `SCHEDULER_MAX_ITERATIONS` / `SCHEDULER_MAX_FLUSH_RETRIES`                             | 最大迭代、刷新重试次数                 |
| 缓存          | `CACHE_DEFAULT_LRU_SIZE` / `CACHE_MAX_ENTRIES`                                         | 默认 LRU 大小、最大条目数              |
| DOM 操作      | `DOM_DEBOUNCE_DELAY_MS` / `DOM_MAX_BATCH_SIZE`                                         | DOM 操作防抖与批处理限制               |
| 性能监控      | `PERF_MONITOR_SAMPLE_RATE` / `PERF_MAX_ENTRIES`                                        | 采样率、最大条目数                     |
| 时间          | `MS_PER_SECOND` / `MS_PER_MINUTE` / `MS_PER_HOUR` / `MS_PER_DAY` / `FRAME_INTERVAL_MS` | 毫秒时间常量                           |
| HTTP          | `HTTP_DEFAULT_TIMEOUT_MS` / `HTTP_MAX_RETRIES` / `HTTP_RETRY_DELAY_MS`                 | 请求超时、重试配置                     |
| 存储          | `STORAGE_VERSION_KEY_PREFIX` / `STORAGE_DEFAULT_EXPIRY_MS`                             | 本地存储版本与过期时间                 |
| 对象操作      | `CLONE_DEFAULT_MAX_DEPTH` / `PROTO_POLLUTION_KEYS`                                     | 深拷贝深度、防原型污染键列表           |
| 字符串        | `STRING_DEFAULT_TRUNCATION_OMISSION` / `STRING_DEFAULT_ID_PREFIX`                      | 截断后缀、ID 前缀                      |
| 数值          | `FLOAT_EPSILON` / `MAX_SAFE_INTEGER` / `MIN_SAFE_INTEGER`                              | 浮点精度、安全整数范围                 |

## 相关包

- [`@lytjs/common`](https://www.npmjs.com/package/@lytjs/common) 聚合包，统一导出各模块 API

## License

[MIT](../../../../LICENSE)
