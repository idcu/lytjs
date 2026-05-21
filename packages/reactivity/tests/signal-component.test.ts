import { describe, it, expect, vi } from 'vitest';
import { signal, computedSignal } from '../src/signal';
import { extractSignals, createSignalBinding, signalToProps } from '../src/signal-component';
import type { SignalComponentOptions } from '../src/signal-component';

describe('extractSignals', () => {
  it('从选项中提取 signal 属性', () => {
    const count = signal(0);
    const options: SignalComponentOptions = {
      signals: { count },
    };
    const result = extractSignals(options);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(count);
  });

  it('同时提取 signal 和 computed', () => {
    const count = signal(1);
    const doubled = computedSignal(() => count() * 2);
    const options: SignalComponentOptions = {
      signals: { count },
      computed: { doubled },
    };
    const result = extractSignals(options);
    expect(result).toHaveLength(2);
    expect(result).toContain(count);
    expect(result).toContain(doubled);
  });

  it('空选项返回空数组', () => {
    const result = extractSignals({});
    expect(result).toHaveLength(0);
  });

  it('多个 signal 属性提取', () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    const options: SignalComponentOptions = {
      signals: { a, b, c },
    };
    const result = extractSignals(options);
    expect(result).toHaveLength(3);
  });

  it('仅有 computed 选项时也能提取', () => {
    const base = signal(10);
    const derived = computedSignal(() => base() + 1);
    const options: SignalComponentOptions = {
      computed: { derived },
    };
    const result = extractSignals(options);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(derived);
  });
});

describe('createSignalBinding', () => {
  it('get 读取 signal 值', () => {
    const count = signal(42);
    const binding = createSignalBinding(count);
    expect(binding.get()).toBe(42);
  });

  it('set 更新 signal 值', () => {
    const count = signal(0);
    const binding = createSignalBinding(count);
    binding.set(10);
    expect(count()).toBe(10);
  });

  it('set 时触发 onChange 回调', () => {
    const count = signal(0);
    const onChange = vi.fn();
    const binding = createSignalBinding(count, onChange);
    binding.set(5);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('无 onChange 时不报错', () => {
    const count = signal(0);
    const binding = createSignalBinding(count);
    expect(() => binding.set(1)).not.toThrow();
  });

  it('多次 set 每次都触发 onChange', () => {
    const count = signal(0);
    const onChange = vi.fn();
    const binding = createSignalBinding(count, onChange);
    binding.set(1);
    binding.set(2);
    binding.set(3);
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('get 始终返回最新值', () => {
    const count = signal(0);
    const binding = createSignalBinding(count);
    expect(binding.get()).toBe(0);
    binding.set(99);
    expect(binding.get()).toBe(99);
  });
});

describe('signalToProps', () => {
  it('将 signal 转换为 props 格式', () => {
    const count = signal(1);
    const name = signal('hello');
    const props = signalToProps({ count, name });
    expect(props.count).toBe(1);
    expect(props.name).toBe('hello');
  });

  it('返回的 props 是响应式的', () => {
    const count = signal(1);
    const props = signalToProps({ count });
    expect(props.count).toBe(1);
    count.set(100);
    expect(props.count).toBe(100);
  });

  it('空对象返回空 props', () => {
    const props = signalToProps({});
    expect(Object.keys(props)).toHaveLength(0);
  });

  it('属性可枚举', () => {
    const count = signal(1);
    const name = signal('test');
    const props = signalToProps({ count, name });
    expect(Object.keys(props)).toEqual(['count', 'name']);
  });
});
