/**
 * @lytjs/compiler/signal-optimized
 *
 * opt-in 优化发射器入口（ADR 0033）。拆出主入口是为了把这段实验代码移出首屏
 * 静态闭包，而不是删除它：不 import 本模块时它完全不参与打包。
 *
 * 用法：
 * ```ts
 * import { registerSignalOptimizedGenerator } from '@lytjs/compiler/signal-optimized';
 * registerSignalOptimizedGenerator();
 * // 之后 compile(tpl, { rendererMode: 'signal', optimizeSignal: true }) 才可用
 * ```
 *
 * 未注册就传 `optimizeSignal: true` 会抛可操作错误，**不会**降级为基础实现。
 */
import { generateSignalOptimized } from './codegen-signal-optimized';
import { setSignalOptimizedGenerator } from './signal-optimized-registry';

export function registerSignalOptimizedGenerator(): void {
  setSignalOptimizedGenerator(generateSignalOptimized);
}

export { generateSignalOptimized };
export type { SignalOptimizedGenerator } from './signal-optimized-registry';
