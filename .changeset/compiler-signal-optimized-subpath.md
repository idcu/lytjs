---
'@lytjs/compiler': major
---

`optimizeSignal: true` 改为显式注册（ADR 0033）：优化发射器拆到
`@lytjs/compiler/signal-optimized` 子入口。

- 主入口 `@lytjs/compiler` 不再导出 `generateSignalOptimized`。
- 使用 `compile(tpl, { rendererMode: 'signal', optimizeSignal: true })` 前必须先执行：

  ```ts
  import { registerSignalOptimizedGenerator } from '@lytjs/compiler/signal-optimized';
  registerSignalOptimizedGenerator();
  ```

- 未注册时**抛可操作错误**（消息含子路径与注册函数名），不会静默降级为基础实现。
- 不传 `optimizeSignal`（默认基础实现）的调用方无需任何改动。
