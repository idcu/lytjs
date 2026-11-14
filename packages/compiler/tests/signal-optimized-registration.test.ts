/**
 * ADR 0033：优化发射器拆到 `@lytjs/compiler/signal-optimized` 后，
 * `compile({ optimizeSignal: true })` 在未注册时必须**报错**，不允许静默降级。
 *
 * 用 `vi.resetModules()` 拿干净的注册表状态：本包其他测试文件在模块顶层注册，
 * 直接复用会掩盖「未注册」分支。
 */
import { describe, it, expect, vi } from 'vitest';

const TEMPLATE = '<div>{{ msg }}</div>';

describe('signal-optimized 显式注册（ADR 0033）', () => {
  it('未注册时抛可操作错误：含子路径与注册函数名，且不回落基础实现', async () => {
    vi.resetModules();
    const { compile } = await import('../src/index');

    let err: unknown;
    try {
      compile(TEMPLATE, { rendererMode: 'signal', optimizeSignal: true });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    const message = (err as Error).message;
    expect(message).toContain('@lytjs/compiler/signal-optimized');
    expect(message).toContain('registerSignalOptimizedGenerator');
    // 「不降级」的可观察判据：错误必须抛出，而不是返回一份 base 产物。
    expect(message).toContain('不会降级为基础实现');
  });

  it('注册后可编译，且产物就是优化版（短别名 `_c.`）', async () => {
    vi.resetModules();
    const { compile } = await import('../src/index');
    const { registerSignalOptimizedGenerator } = await import('../src/signal-optimized');
    registerSignalOptimizedGenerator();

    const { code } = compile(TEMPLATE, { rendererMode: 'signal', optimizeSignal: true });
    expect(code).toContain('_c.msg');
  });

  it('不传 optimizeSignal 时走基础实现，无需注册', async () => {
    vi.resetModules();
    const { compile } = await import('../src/index');
    const { code } = compile(TEMPLATE, { rendererMode: 'signal' });
    expect(code).toContain('_ctx.msg');
  });
});
