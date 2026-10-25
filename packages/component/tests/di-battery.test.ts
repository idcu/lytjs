/**
 * 行为级判据：`@lytjs/component` 的 **DI 适配层**（`src/di/index.ts`，218 行、覆盖率 50%）
 *
 * ## 为什么要有这条
 *
 * 这层把「组件实例的 provides」接到 `@lytjs/di` 的 Provider 树上。两条路径（实例级 / Provider 节点级）
 * 与三种生命周期（singleton / scoped / transient）一旦接错，表现是**依赖解析到错的对象**——
 * 不报错、类型也对，只是拿到旧值或共享了本该隔离的状态。
 *
 * ## 手法
 *
 * `provide` / `inject` 只依赖 `getCurrentInstance()`：用 `setCurrentInstance` 造实例即可，
 * 实例之间用 `provides` 的原型链 / `parent` 链表达父子关系。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  provide,
  inject,
  provideAll,
  provideSingleton,
  provideScoped,
  provideTransient,
  InjectionToken,
} from '../src/di';
import { setCurrentInstance } from '../src/lifecycle';

function makeInstance(parent: Record<string, unknown> | null = null) {
  const inst: Record<string, unknown> = {
    provides: parent
      ? Object.create(parent.provides as object)
      : (Object.create(null) as Record<string | symbol, unknown>),
    parent,
  };
  return inst;
}

const inInstance = <T>(inst: Record<string, unknown> | null, fn: () => T): T => {
  setCurrentInstance(inst as never);
  try {
    return fn();
  } finally {
    setCurrentInstance(null);
  }
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  setCurrentInstance(null);
});

// ==================== 实例级 provide / inject ====================

describe('实例级 provide / inject', () => {
  it('同实例内取回同一个值', () => {
    const inst = makeInstance();

    inInstance(inst, () => provide('color', 'red'));
    expect(inInstance(inst, () => inject('color'))).toBe('red');
  });

  it('子实例沿 provides 原型链取到父级的值', () => {
    const parent = makeInstance();
    const child = makeInstance(parent);

    inInstance(parent, () => provide('theme', 'dark'));

    expect(inInstance(child, () => inject('theme'))).toBe('dark');
  });

  it('子实例自己 provide 同名 key ⇒ 遮蔽父级，不污染父级', () => {
    const parent = makeInstance();
    const child = makeInstance(parent);

    inInstance(parent, () => provide('theme', 'dark'));
    inInstance(child, () => provide('theme', 'light'));

    expect(inInstance(child, () => inject('theme'))).toBe('light');
    expect(inInstance(parent, () => inject('theme'))).toBe('dark');
  });

  it('未提供 ⇒ undefined', () => {
    const inst = makeInstance();
    expect(inInstance(inst, () => inject('missing'))).toBeUndefined();
  });

  it('InjectionToken 作为 key 可用', () => {
    const inst = makeInstance();
    const token = new InjectionToken<string>('API_URL');

    inInstance(inst, () => provide(token, 'https://example.test'));

    expect(inInstance(inst, () => inject(token))).toBe('https://example.test');
  });
});

// ==================== 查找范围选项 ====================

describe('查找范围：local / skipSelf / from', () => {
  it('local: true 只看自己，不向父级找', () => {
    const parent = makeInstance();
    const child = makeInstance(parent);
    inInstance(parent, () => provide('k', 'from-parent'));

    expect(inInstance(child, () => inject('k', { local: true }))).toBeUndefined();
  });

  it('local: true 命中自己时正常返回', () => {
    const inst = makeInstance();
    inInstance(inst, () => provide('k', 'own'));

    expect(inInstance(inst, () => inject('k', { local: true }))).toBe('own');
  });

  it('skipSelf: true 跳过自己的 provides，取父级的', () => {
    const parent = makeInstance();
    const child = makeInstance(parent);
    inInstance(parent, () => provide('k', 'parent'));
    inInstance(child, () => provide('k', 'child'));

    expect(inInstance(child, () => inject('k'))).toBe('child');
    expect(inInstance(child, () => inject('k', { skipSelf: true }))).toBe('parent');
  });

  it('from 改写查找用的 key', () => {
    const inst = makeInstance();
    inInstance(inst, () => provide('realKey', 42));

    expect(inInstance(inst, () => inject('alias', { from: 'realKey' }))).toBe(42);
  });
});

// ==================== 批量与生命周期 ====================

describe('provideAll', () => {
  it('useValue 与 useFactory 都能注册', () => {
    const inst = makeInstance();

    inInstance(inst, () =>
      provideAll([
        { provide: 'a', useValue: 1 },
        { provide: 'b', useFactory: () => 2 },
      ]),
    );

    expect(inInstance(inst, () => inject('a'))).toBe(1);
    expect(inInstance(inst, () => inject('b'))).toBe(2);
  });
});

describe('生命周期', () => {
  it('provideSingleton：工厂只求值一次，多次注入拿到同一引用', () => {
    const inst = makeInstance();
    const factory = vi.fn(() => ({ n: Math.random() }));

    inInstance(inst, () => provideSingleton('svc', factory));

    const a = inInstance(inst, () => inject<{ n: number }>('svc'));
    const b = inInstance(inst, () => inject<{ n: number }>('svc'));

    expect(factory).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('provideScoped：同一作用域内复用', () => {
    const inst = makeInstance();
    const factory = vi.fn(() => ({ tag: 'scoped' }));

    inInstance(inst, () => provideScoped('svc', factory));

    expect(inInstance(inst, () => inject('svc'))).toBe(inInstance(inst, () => inject('svc')));
  });

  // ⚠️ `it.fails`：**当前实现不满足 transient 语义**，本用例显式钉住这个已知缺口。
  //    原因：适配层把 `record.value`（已在 provide 时求值）直接写进 `instance.provides`，
  //    生命周期信息随之丢失；而那张表同时被 `component-inject.ts` 的普通 inject 读取，
  //    改成「存 record、注入时解析」会动到共享契约 ⇒ 单独一轮做，不在这里顺手改。
  it.fails('★ provideTransient：每次注入都应拿到新实例（已知缺口：当前等同单例）', () => {
    const inst = makeInstance();
    const factory = vi.fn(() => ({ tag: 'transient' }));

    inInstance(inst, () => provideTransient('svc', factory));

    const a = inInstance(inst, () => inject('svc'));
    const b = inInstance(inst, () => inject('svc'));

    expect(a).not.toBe(b);
  });
});
