/**
 * 行为级判据：`@lytjs/devtools-extension` 的**状态编辑器**（`src/panel/state-editor.ts`，457 行）
 *
 * ## 为什么要有这条
 *
 * 该文件此前**一条判据都没有**（实测 0% 覆盖、275 条语句）。它是 DevTools 扩展里
 * 「在面板上直接改组件状态」的实现：嵌套路径读写、值解析/格式化、编辑历史与撤销。
 * 这些是**纯逻辑**，出错时往往静默（值没改上、撤销恢复成 undefined），比崩溃更难发现。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setNestedValue,
  getNestedValue,
  parseValue,
  formatValue,
  extractComponentState,
  applyStateEdit,
  getEditHistory,
  clearEditHistory,
  undoLastEdit,
} from '../src/panel/state-editor';
import { registerComponent, clearComponentRegistry } from '../src/component-tree';
import { registerSignal, clearSignalRegistry, getSignalValue } from '../src/signals';

beforeEach(() => {
  clearComponentRegistry();
  clearSignalRegistry();
  clearEditHistory();
});

/** 注册一个组件 + 一个「按命名约定归属它」的信号（Counter_count） */
const setupComponentWithSignal = (): void => {
  registerComponent({ id: 'c1', name: 'Counter', props: { title: 'T' } } as never);
  registerSignal({
    id: 's1',
    name: 'Counter_count',
    value: 1,
    type: 'ref',
    dependencies: [],
    dependents: [],
  } as never);
};

// ==================== 嵌套读写 ====================

describe('setNestedValue / getNestedValue', () => {
  it('写入已存在的嵌套路径', () => {
    const obj = { a: { b: 1 } };

    expect(setNestedValue(obj, 'a.b', 2)).toBe(true);
    expect(obj.a.b).toBe(2);
  });

  it('路径不存在时自动建中间对象', () => {
    const obj: Record<string, unknown> = {};

    setNestedValue(obj, 'x.y.z', 9);

    expect(getNestedValue(obj, 'x.y.z')).toBe(9);
  });

  it('★ 中间层是 null 时不应崩溃', () => {
    // `typeof null === 'object'` ⇒ 原实现认为"已经是对象"、直接把 current 置成 null
    // ⇒ 下一层赋值 `null[last] = value` 抛 TypeError（面板里改一个 null 字段的子属性就崩）。
    const obj: Record<string, unknown> = { a: null };

    expect(() => setNestedValue(obj, 'a.b', 1)).not.toThrow();
    expect(getNestedValue(obj, 'a.b')).toBe(1);
  });

  it('中间层是原始值时应被替换成对象', () => {
    const obj: Record<string, unknown> = { a: 5 };

    setNestedValue(obj, 'a.b', 1);

    expect(getNestedValue(obj, 'a.b')).toBe(1);
  });

  it('getNestedValue：缺失路径返回 undefined（null 中间层也安全）', () => {
    expect(getNestedValue({ a: null }, 'a.b')).toBeUndefined();
    expect(getNestedValue({}, 'x.y')).toBeUndefined();
    expect(getNestedValue({ a: { b: 0 } }, 'a.b')).toBe(0);
  });
});

// ==================== 值解析 ====================

describe('parseValue', () => {
  it('对象 / 数组字面量按 JSON 解析', () => {
    expect(parseValue('{"a":1}', 'object')).toEqual({ a: 1 });
    expect(parseValue('[1,2]', 'object')).toEqual([1, 2]);
  });

  it('true / false / null / 数字按 JSON 解析', () => {
    expect(parseValue('true', 'string')).toBe(true);
    expect(parseValue('false', 'string')).toBe(false);
    expect(parseValue('null', 'string')).toBeNull();
    expect(parseValue('42', 'string')).toBe(42);
    expect(parseValue('-3.5', 'string')).toBe(-3.5);
  });

  it('number 目标：非数字输入退化为 0', () => {
    expect(parseValue('abc', 'number')).toBe(0);
    expect(parseValue('  7  ', 'number')).toBe(7);
  });

  it('boolean 目标：`true`/`false` 走 JSON 分支；`1` 会被当成**数字**（既有优先级）', () => {
    // ⚠️ 注意既有语义：JSON 分支**先于** targetType 判断 ⇒ `'1'` 被 JSON.parse 成数字 1，
    //    不会变成 true。这是"输入像 JSON 就按 JSON 解析"的设计，不是缺陷（已在日志记录）。
    expect(parseValue('true', 'boolean')).toBe(true);
    expect(parseValue('1', 'boolean')).toBe(1);
    expect(parseValue('yes', 'boolean')).toBe(false);
  });

  it('string 目标：保留原文（仅 trim）', () => {
    expect(parseValue('  hello  ', 'string')).toBe('hello');
  });
});

// ==================== 值格式化 ====================

describe('formatValue', () => {
  it('基本类型', () => {
    expect(formatValue(null)).toBe('null');
    expect(formatValue(undefined)).toBe('undefined');
    expect(formatValue('abc')).toBe('"abc"');
    expect(formatValue(3)).toBe('3');
  });

  it('函数 / 数组 / 对象', () => {
    expect(formatValue(() => {})).toBe('ƒ()');
    expect(formatValue([1, 2, 3])).toBe('Array(3)');
    expect(formatValue({ a: 1 })).toContain('"a": 1');
  });

  it('★ 循环引用不应抛错（退化为 {...}）', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;

    expect(() => formatValue(obj)).not.toThrow();
    expect(formatValue(obj)).toBe('{...}');
  });
});

// ==================== 组件状态提取 ====================

describe('extractComponentState', () => {
  it('未知组件返回 null', () => {
    expect(extractComponentState('nope')).toBeNull();
  });

  it('提取 props 与「按命名约定归属」的信号', () => {
    setupComponentWithSignal();

    const state = extractComponentState('c1')!;

    expect(state.componentName).toBe('Counter');
    expect(state.props.title).toMatchObject({ value: 'T', path: 'props.title', editable: true });
    expect(state.state.Counter_count).toMatchObject({ value: 1, path: 'Counter_count' });
  });

  it('computed 类型的信号不可编辑', () => {
    registerComponent({ id: 'c2', name: 'Comp', props: {} } as never);
    registerSignal({
      id: 's2',
      name: 'Comp_total',
      value: 10,
      type: 'computed',
      dependencies: [],
      dependents: [],
    } as never);

    expect(extractComponentState('c2')!.state.Comp_total!.editable).toBe(false);
  });
});

// ==================== 应用编辑 / 撤销 ====================

describe('applyStateEdit / undoLastEdit', () => {
  it('★ 未知路径 ⇒ 明确报错（Signal not found）', () => {
    setupComponentWithSignal();

    const r = applyStateEdit('c1', 'Counter_missing', 1);

    expect(r.success).toBe(false);
    expect(r.error).toContain('Signal not found');
  });

  it('改值成功：信号真的变了、历史记录里 oldValue 正确', () => {
    setupComponentWithSignal();

    const r = applyStateEdit('c1', 'Counter_count', 5);

    expect(r).toMatchObject({ success: true, oldValue: 1, newValue: 5 });
    expect(getSignalValue('s1')).toBe(5);
    expect(getEditHistory()).toHaveLength(1);
  });

  it('★ 撤销把值恢复成编辑前的值', () => {
    setupComponentWithSignal();
    applyStateEdit('c1', 'Counter_count', 5);

    const r = undoLastEdit();

    expect(r.success).toBe(true);
    expect(getSignalValue('s1')).toBe(1);
  });

  it('没有可撤销的编辑 ⇒ 明确报错', () => {
    const r = undoLastEdit();

    expect(r.success).toBe(false);
    expect(r.error).toContain('No edits');
  });

  it('getEditHistory 返回**副本**', () => {
    setupComponentWithSignal();
    applyStateEdit('c1', 'Counter_count', 2);

    const h = getEditHistory() as unknown as unknown[];
    h.push('injected');

    expect(getEditHistory()).toHaveLength(1);
  });

  it('clearEditHistory 清空', () => {
    setupComponentWithSignal();
    applyStateEdit('c1', 'Counter_count', 2);

    clearEditHistory();

    expect(getEditHistory()).toEqual([]);
  });
});
