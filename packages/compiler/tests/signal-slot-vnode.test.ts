/**
 * 插槽 vnode 序列化的「严格模式」边界测试
 *
 * 这些防御分支在**正常模板下不可达** —— transform 产物的结构由编译器保证。
 * 但它们是「宁缺勿错渲」的最后一道闸门：一旦结构异常必须**整体返回 null**（调用方跳过），
 * 而不是下发"只渲染一半"的半成品。故这里直接单测，把它们钉住。
 */

import { describe, it, expect } from 'vitest';
import {
  serializeConditionalVNode,
  serializeVNodeCall,
  serializeVNodeCallChildren,
  serializeVNodeCallChild,
} from '../src/codegen-signal';
import {
  serializeConditionalVNodeOptimized,
  serializeVNodeCallOptimized,
  serializeVNodeCallChildrenOptimized,
  serializeVNodeCallChildOptimized,
} from '../src/codegen-signal-optimized';
import { NodeTypes } from '../src/constants';
import type { SignalCodegenOptions } from '../src/codegen-signal';

const OPTS: SignalCodegenOptions = { mode: 'signal' };

describe('插槽 vnode 序列化 - 严格模式边界（非优化版）', () => {
  it('serializeVNodeCall：非 VNODE_CALL / tag 非法 → null', () => {
    expect(serializeVNodeCall(null, '_ctx.')).toBeNull();
    expect(serializeVNodeCall({ type: NodeTypes.ELEMENT }, '_ctx.')).toBeNull();
    expect(serializeVNodeCall({ type: NodeTypes.VNODE_CALL }, '_ctx.')).toBeNull();
    expect(serializeVNodeCall({ type: NodeTypes.VNODE_CALL, tag: '' }, '_ctx.')).toBeNull();
  });

  it('serializeVNodeCall：props 结构异常 → null', () => {
    expect(
      serializeVNodeCall(
        { type: NodeTypes.VNODE_CALL, tag: '"span"', props: { type: 7 } },
        '_ctx.',
      ),
    ).toBeNull();

    expect(
      serializeVNodeCall(
        {
          type: NodeTypes.VNODE_CALL,
          tag: '"span"',
          props: { type: NodeTypes.JS_OBJECT_EXPRESSION, properties: [{ type: 7 }] },
        },
        '_ctx.',
      ),
    ).toBeNull();

    expect(
      serializeVNodeCall(
        {
          type: NodeTypes.VNODE_CALL,
          tag: '"span"',
          props: {
            type: NodeTypes.JS_OBJECT_EXPRESSION,
            properties: [
              { type: NodeTypes.JS_PROPERTY, key: { content: 1 }, value: { content: 'x' } },
            ],
          },
        },
        '_ctx.',
      ),
    ).toBeNull();
  });

  it('serializeVNodeCall：children 无法识别 → null', () => {
    expect(
      serializeVNodeCall(
        { type: NodeTypes.VNODE_CALL, tag: '"span"', children: { type: 999 } },
        '_ctx.',
      ),
    ).toBeNull();
  });

  it('serializeVNodeCallChildren：空值 → "null"，数组含不可识别项 → null', () => {
    expect(serializeVNodeCallChildren(undefined, '_ctx.')).toBe('null');
    expect(serializeVNodeCallChildren(null, '_ctx.')).toBe('null');
    expect(serializeVNodeCallChildren([{ type: 999 }], '_ctx.')).toBeNull();
  });

  it('serializeVNodeCallChild：非对象 / callee 不符 / 未知类型 → null', () => {
    expect(serializeVNodeCallChild(123, '_ctx.')).toBeNull();
    expect(
      serializeVNodeCallChild(
        { type: NodeTypes.JS_CALL_EXPRESSION, callee: 'renderList', arguments: [] },
        '_ctx.',
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallChild(
        { type: NodeTypes.JS_CALL_EXPRESSION, callee: 'TO_DISPLAY_STRING', arguments: [] },
        '_ctx.',
      ),
    ).toBeNull();
    expect(serializeVNodeCallChild({ type: 999 }, '_ctx.')).toBeNull();
  });

  it('serializeConditionalVNode：test 缺失 / consequent 非法 → null', () => {
    expect(serializeConditionalVNode({ consequent: {} }, '_ctx.')).toBeNull();
    expect(
      serializeConditionalVNode(
        {
          test: { type: NodeTypes.SIMPLE_EXPRESSION, content: 'ok' },
          consequent: { type: NodeTypes.ELEMENT },
        },
        '_ctx.',
      ),
    ).toBeNull();
  });
});

describe('插槽 vnode 序列化 - 严格模式边界（优化版）', () => {
  it('同样的非法输入一律返回 null（短别名路径的同等守卫）', () => {
    const used = new Set<string>();

    expect(serializeVNodeCallOptimized(null, used, OPTS)).toBeNull();
    expect(serializeVNodeCallOptimized({ type: NodeTypes.VNODE_CALL }, used, OPTS)).toBeNull();
    expect(
      serializeVNodeCallOptimized({ type: NodeTypes.VNODE_CALL, tag: '', props: null }, used, OPTS),
    ).toBeNull();
    expect(
      serializeVNodeCallOptimized(
        { type: NodeTypes.VNODE_CALL, tag: '"span"', props: { type: 7 } },
        used,
        OPTS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallOptimized(
        {
          type: NodeTypes.VNODE_CALL,
          tag: '"span"',
          props: { type: NodeTypes.JS_OBJECT_EXPRESSION, properties: [{ type: 7 }] },
        },
        used,
        OPTS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallOptimized(
        { type: NodeTypes.VNODE_CALL, tag: '"span"', children: { type: 999 } },
        used,
        OPTS,
      ),
    ).toBeNull();

    expect(serializeVNodeCallChildrenOptimized(undefined, used, OPTS)).toBe('null');
    expect(serializeVNodeCallChildrenOptimized([{ type: 999 }], used, OPTS)).toBeNull();

    expect(serializeVNodeCallChildOptimized(123, used, OPTS)).toBeNull();
    expect(
      serializeVNodeCallChildOptimized(
        { type: NodeTypes.JS_CALL_EXPRESSION, callee: 'renderList', arguments: [] },
        used,
        OPTS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallChildOptimized(
        { type: NodeTypes.JS_CALL_EXPRESSION, callee: 'TO_DISPLAY_STRING', arguments: [] },
        used,
        OPTS,
      ),
    ).toBeNull();
    expect(serializeVNodeCallChildOptimized({ type: 999 }, used, OPTS)).toBeNull();

    expect(serializeConditionalVNodeOptimized({ consequent: {} }, used, OPTS)).toBeNull();
    expect(
      serializeConditionalVNodeOptimized(
        {
          test: { type: NodeTypes.SIMPLE_EXPRESSION, content: 'ok' },
          consequent: { type: NodeTypes.ELEMENT },
        },
        used,
        OPTS,
      ),
    ).toBeNull();
  });
});
