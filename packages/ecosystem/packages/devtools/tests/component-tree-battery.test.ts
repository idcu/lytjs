/**
 * 行为级判据：`@lytjs/devtools` 的**组件树查看器**（`src/componentTree.ts`，156 行、4 个导出）
 *
 * 该模块此前**一个符号都没被测试引用**。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getComponentTree,
  serializeComponentTree,
  registerRootComponent,
  unregisterRootComponent,
} from '../src/componentTree';

beforeEach(() => {
  unregisterRootComponent();
});

afterEach(() => {
  unregisterRootComponent();
});

describe('registerRootComponent / unregisterRootComponent', () => {
  it('注册后无参 getComponentTree 能从全局取到根组件', () => {
    registerRootComponent({ name: 'App', props: { a: 1 } });

    const tree = getComponentTree();
    expect(tree).toHaveLength(1);
    expect(tree[0]!.name).toBe('App');
  });

  it('未注册时无参调用返回空数组', () => {
    expect(getComponentTree()).toEqual([]);
  });

  it('注销后无参调用回到空数组', () => {
    registerRootComponent({ name: 'App' });
    unregisterRootComponent();

    expect(getComponentTree()).toEqual([]);
  });
});

describe('getComponentTree（显式根组件）', () => {
  it('单节点：id / name / props 正确，无 children 时该字段为 undefined', () => {
    const tree = getComponentTree({ name: 'Root', props: { x: 1 } });

    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toMatch(/^component-/);
    expect(tree[0]!.name).toBe('Root');
    expect(tree[0]!.props).toEqual({ x: 1 });
    expect(tree[0]!.children).toBeUndefined();
    expect(tree[0]!.parent).toBeUndefined();
  });

  it('name 回退链：name → displayName → Anonymous', () => {
    expect(getComponentTree({ displayName: 'Disp' })[0]!.name).toBe('Disp');
    expect(getComponentTree({})[0]!.name).toBe('Anonymous');
  });

  it('props 过滤掉函数值；全被过滤时 props 为 undefined', () => {
    const withFn = getComponentTree({ name: 'A', props: { keep: 1, cb: () => {} } });
    expect(withFn[0]!.props).toEqual({ keep: 1 });

    const onlyFn = getComponentTree({ name: 'B', props: { cb: () => {} } });
    expect(onlyFn[0]!.props).toBeUndefined();
  });

  it('嵌套子组件：children 递归构建，且带 parent 指回父 id', () => {
    const tree = getComponentTree({
      name: 'Root',
      children: [{ name: 'A' }, { name: 'B', children: [{ name: 'B1' }] }],
    });

    const root = tree[0]!;
    expect(root.children!.map((c) => c.name)).toEqual(['A', 'B']);
    expect(root.children![0]!.parent).toBe(root.id);
    expect(root.children![1]!.children![0]!.name).toBe('B1');
    expect(root.children![1]!.children![0]!.parent).toBe(root.children![1]!.id);
  });

  it('★ 非组件子项（字符串 / 数字 / null）不应被当成组件节点', () => {
    // 类型上 `children?: unknown[]`，但「组件树」里出现 `Anonymous` 幽灵节点会误导面板用户。
    const tree = getComponentTree({
      name: 'Root',
      children: ['纯文本', 42, null, undefined, { name: 'Real' }],
    });

    expect(tree[0]!.children!.map((c) => c.name)).toEqual(['Real']);
  });
});

describe('serializeComponentTree', () => {
  it('按层级缩进输出，props 以 JSON 呈现', () => {
    const tree = getComponentTree({
      name: 'Root',
      props: { n: 1 },
      children: [{ name: 'Child' }],
    });

    const text = serializeComponentTree(tree);
    expect(text).toContain('- Root (n=1)');
    expect(text).toContain('  - Child');
  });

  it('空数组输出空字符串', () => {
    expect(serializeComponentTree([])).toBe('');
  });

  it('★ props 含循环引用时不应抛（devtools 里的 props 常带回指）', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    const tree = getComponentTree({ name: 'Root', props: { cyclic } });

    expect(() => serializeComponentTree(tree)).not.toThrow();
  });
});
