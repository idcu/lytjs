/**
 * `formatDebuggerEvent` 的行为测试（shared-types/src/debug.ts）。
 *
 * ⚠️ 事实说明（不在测试里造假）：该函数**没有**从 `src/index.ts` 再导出，仓内也没有调用方，
 * 因此对 `@lytjs/shared-types` 的消费者不可达。这里按内部模块测试它，是为了让 debug.ts
 * 的运行时代码进入统计，而不是为了凑行数跳过分支：下面每个分支都能在模块边界被真实触发。
 * 「是否应把它导出（公开 API 变更）或删除」由 owner 决定，本测试不预设结论。
 */
import { describe, it, expect } from 'vitest';
import { formatDebuggerEvent } from '../src/debug';
import type { DebuggerEvent } from '../src/debug';

const effect = { id: 7, active: true };

const ev = (patch: Partial<DebuggerEvent>): DebuggerEvent => ({
  effect,
  target: { a: 1 },
  type: 'track',
  key: 'a',
  ...patch,
});

describe('formatDebuggerEvent', () => {
  it('track 事件：不输出值字段', () => {
    expect(formatDebuggerEvent(ev({}))).toBe(
      '[DebuggerEvent] type=track key=a target=Object effect=#7',
    );
  });

  it('key 为 symbol / undefined', () => {
    expect(formatDebuggerEvent(ev({ key: Symbol('k') }))).toContain('key=Symbol(k)');
    expect(formatDebuggerEvent(ev({ key: undefined }))).toContain('key=undefined');
  });

  it('trigger 事件：同时输出 oldValue 与 newValue', () => {
    const out = formatDebuggerEvent(ev({ type: 'trigger', oldValue: 1, newValue: 2 }));
    expect(out).toContain('oldValue=1 newValue=2');
  });

  it('trigger 事件：只输出单个值字段', () => {
    expect(formatDebuggerEvent(ev({ type: 'trigger', oldValue: 0 }))).toContain(' oldValue=0');
    expect(formatDebuggerEvent(ev({ type: 'trigger', newValue: 0 }))).toContain(' newValue=0');
  });

  it('trigger 但两个值都未定义：不追加多余空格', () => {
    expect(formatDebuggerEvent(ev({ type: 'trigger' }))).toBe(
      '[DebuggerEvent] type=trigger key=a target=Object effect=#7',
    );
  });

  it('target 构造函数名：使用 constructor.name', () => {
    class Widget {}
    expect(formatDebuggerEvent(ev({ target: new Widget() }))).toContain('target=Widget');
  });

  it('target 为 null 原型对象：constructor 缺失时回退 Object', () => {
    const bare = Object.create(null) as object;
    expect(formatDebuggerEvent(ev({ target: bare }))).toContain('target=Object');
  });

  it('target 为 null（JS 调用方可传）：标题为 null', () => {
    expect(formatDebuggerEvent(ev({ target: null as unknown as object }))).toContain('target=null');
  });
});
