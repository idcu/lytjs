// @vitest-environment jsdom
/**
 * `renderer/src/vapor/vapor-hmr.ts` 行为电池。
 *
 * 该文件此前 **132/175 语句未覆盖（25%）**，且没有任何判据 ——
 * 而它负责「热更新时保住组件状态」，写错的表现是「改一行代码状态就没了」，
 * 很难在人工点测里发现。
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { VaporComponentDefinition } from '../src/vapor/vapor-app';
import {
  DEFAULT_STATE_PRESERVATION,
  generateComponentId,
  registerComponent,
  unregisterComponent,
  getComponentInstance,
  getRegisteredComponentIds,
  captureStateSnapshot,
  restoreStateSnapshot,
  onHMRUpdate,
  handleComponentUpdate,
  createVaporHMRHandler,
  generateHMRCode,
  isHMRAvailable,
  forceRerender,
  clearHMRState,
} from '../src/vapor/vapor-hmr';

let seq = 0;
const uid = (): string => `hmr-${++seq}`;

function makeComp(template = '<div>v1</div>', setup?: () => void): VaporComponentDefinition {
  return { template, setup } as unknown as VaporComponentDefinition;
}

function newContainer(): Element {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  clearHMRState();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearHMRState();
  document.body.innerHTML = '';
});

describe('组件注册表', () => {
  it('generateComponentId 递增且带 vapor-c- 前缀', () => {
    const a = generateComponentId();
    const b = generateComponentId();

    expect(a).toMatch(/^vapor-c-\d+$/);
    expect(a).not.toBe(b);
  });

  it('注册后可按 id 取回，注销后取不到', () => {
    const id = uid();
    const comp = makeComp();

    registerComponent(id, comp, newContainer());

    expect(getComponentInstance(id)!.component).toBe(comp);
    expect(getRegisteredComponentIds()).toContain(id);

    unregisterComponent(id);

    expect(getComponentInstance(id)).toBeUndefined();
    expect(getRegisteredComponentIds()).not.toContain(id);
  });

  it('注销不存在的 id 不抛错', () => {
    expect(() => unregisterComponent('nope')).not.toThrow();
  });

  it('clearHMRState 清空注册表并重置 id 计数器', () => {
    registerComponent(uid(), makeComp(), newContainer());
    clearHMRState();

    expect(getRegisteredComponentIds()).toEqual([]);
    // 计数器归零后重新从 1 开始
    expect(generateComponentId()).toBe('vapor-c-1');
  });
});

describe('状态快照', () => {
  it('未知 id ⇒ null', () => {
    expect(captureStateSnapshot('nope')).toBeNull();
  });

  it('★ 快照是**副本**（改副本不影响组件内部状态）', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    getComponentInstance(id)!.state.set('count', 1);

    const snap = captureStateSnapshot(id)!;
    snap.set('count', 99);

    expect(getComponentInstance(id)!.state.get('count')).toBe(1);
  });

  it('恢复是**合并**语义：快照里的键覆盖、组件独有的键保留', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    const inst = getComponentInstance(id)!;
    inst.state.set('keep', 'a');
    inst.state.set('overwrite', 1);

    const ok = restoreStateSnapshot(id, new Map([['overwrite', 2]]));

    expect(ok).toBe(true);
    expect(inst.state.get('overwrite')).toBe(2);
    expect(inst.state.get('keep')).toBe('a');
  });

  it('恢复未知 id ⇒ false', () => {
    expect(restoreStateSnapshot('nope', new Map())).toBe(false);
  });
});

describe('HMR 监听器', () => {
  it('订阅后能收到事件，注销后不再收到', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    const seen: unknown[] = [];
    const off = onHMRUpdate((u) => seen.push(u));

    handleComponentUpdate(id, makeComp('<div>v2</div>'), 'template');
    expect(seen).toHaveLength(1);

    off();
    handleComponentUpdate(id, makeComp('<div>v3</div>'), 'template');

    expect(seen).toHaveLength(1);
  });

  it('★ 单个监听器抛错不影响其它监听器（错误隔离）', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    onHMRUpdate(() => {
      throw new Error('listener-boom');
    });
    onHMRUpdate(second);

    expect(() => handleComponentUpdate(id, makeComp('<div>v2</div>'), 'template')).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('handleComponentUpdate', () => {
  it('未知组件 ⇒ false 且给出警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(handleComponentUpdate('ghost', makeComp(), 'template')).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('template 更新：换掉组件定义、发出事件、状态保留', () => {
    const id = uid();
    const oldComp = makeComp('<div>old</div>');
    registerComponent(id, oldComp, newContainer());
    getComponentInstance(id)!.state.set('n', 7);

    const seen: { type: string; oldComponent: unknown; newComponent: unknown }[] = [];
    onHMRUpdate((u) => seen.push(u as never));

    const newComp = makeComp('<div>new</div>');
    expect(handleComponentUpdate(id, newComp, 'template')).toBe(true);

    expect(getComponentInstance(id)!.component).toBe(newComp);
    expect(getComponentInstance(id)!.state.get('n')).toBe(7);
    expect(seen[0]!.type).toBe('template');
    expect(seen[0]!.oldComponent).toBe(oldComp);
    expect(seen[0]!.newComponent).toBe(newComp);
  });

  it('style 更新：不刷新页面，只发事件', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const listener = vi.fn();
    onHMRUpdate(listener);

    expect(handleComponentUpdate(id, makeComp(), 'style')).toBe(true);

    expect(reload).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('script 更新：发事件并刷新页面（既有约定）', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const listener = vi.fn();
    onHMRUpdate(listener);

    expect(handleComponentUpdate(id, makeComp(), 'script')).toBe(true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('full 更新：发 full 事件并刷新页面', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const seen: { type: string }[] = [];
    onHMRUpdate((u) => seen.push(u as never));

    expect(handleComponentUpdate(id, makeComp(), 'full')).toBe(true);

    expect(seen[0]!.type).toBe('full');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('无 window 环境（SSR）下 script/full 更新不抛错', () => {
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    vi.stubGlobal('window', undefined);

    expect(() => handleComponentUpdate(id, makeComp(), 'full')).not.toThrow();
  });

  it('状态保留策略是**装饰性参数**（当前实现未读取）', () => {
    // 记录现状：无论传什么策略，template 更新都会保留 state。
    const id = uid();
    registerComponent(id, makeComp(), newContainer());
    getComponentInstance(id)!.state.set('n', 1);

    handleComponentUpdate(id, makeComp('<div>x</div>'), 'template', {
      ...DEFAULT_STATE_PRESERVATION,
      refs: false,
      reactive: false,
    });

    expect(getComponentInstance(id)!.state.get('n')).toBe(1);
  });
});

describe('createVaporHMRHandler', () => {
  it('newModule 为 null ⇒ 警告且不抛错', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => createVaporHMRHandler('x')(null)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('模块没有 default 导出 ⇒ 警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createVaporHMRHandler('x')({} as never);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No default export'));
  });

  it('组件未注册 ⇒ 警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createVaporHMRHandler('unregistered')({ default: makeComp() });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('instance not found'));
  });

  it('只有模板变化 ⇒ template 更新（不刷新页面）', () => {
    const id = uid();
    const setup = (): void => {};
    registerComponent(id, makeComp('<div>a</div>', setup), newContainer());
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const seen: { type: string }[] = [];
    onHMRUpdate((u) => seen.push(u as never));

    createVaporHMRHandler(id)({ default: makeComp('<div>b</div>', setup) });

    expect(seen[0]!.type).toBe('template');
    expect(reload).not.toHaveBeenCalled();
  });

  it('setup 变化 ⇒ script 更新（刷新页面）', () => {
    const id = uid();
    registerComponent(
      id,
      makeComp('<div>a</div>', () => {}),
      newContainer(),
    );
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const seen: { type: string }[] = [];
    onHMRUpdate((u) => seen.push(u as never));

    createVaporHMRHandler(id)({ default: makeComp('<div>a</div>', () => undefined) });

    expect(seen[0]!.type).toBe('script');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('模板与 setup 都没变 ⇒ style 更新', () => {
    const id = uid();
    const setup = (): void => {};
    registerComponent(id, makeComp('<div>a</div>', setup), newContainer());
    const seen: { type: string }[] = [];
    onHMRUpdate((u) => seen.push(u as never));

    createVaporHMRHandler(id)({ default: makeComp('<div>a</div>', setup) });

    expect(seen[0]!.type).toBe('style');
  });
});

describe('generateHMRCode', () => {
  it('生成 import.meta.hot.accept 片段', () => {
    const code = generateHMRCode('comp-1');

    expect(code).toContain('import.meta.hot');
    expect(code).toContain('accept');
    expect(code).toContain('comp-1');
  });

  it('★ 生成的代码必须是**合法 JS**（普通 id）', () => {
    const code = generateHMRCode('comp-1');
    // `import.meta` 在脚本里非法，替换成等价对象后再解析
    const js = code.replace(/import\.meta/g, '({ hot: null })');

    expect(() => new Function(js)).not.toThrow();
  });

  it('★ id 里含单引号时，生成的代码仍必须合法（不转义会把字符串截断）', () => {
    const code = generateHMRCode("it's-broken");
    const js = code.replace(/import\.meta/g, '({ hot: null })');

    expect(() => new Function(js)).not.toThrow();
  });

  it('★ id 里含反斜杠 / 换行时同样必须合法', () => {
    const code = generateHMRCode('a\\b\nc');
    const js = code.replace(/import\.meta/g, '({ hot: null })');

    expect(() => new Function(js)).not.toThrow();
  });

  it('★ 生成的回调必须真的调用热更新入口（不能是空注释）', () => {
    const code = generateHMRCode('comp-1');

    // 此前生成的是 `instance.component = newModule.default` + 一句空注释，
    // 不触发任何重渲染 ⇒ HMR「接受」了但界面不变。
    expect(code).toContain('__LYTJS_HMR_UPDATE__');
  });
});

describe('工具函数', () => {
  it('isHMRAvailable 反映当前 import.meta.hot 是否存在', () => {
    // ⚠️ 不能硬断言 false：vitest 由 Vite 驱动，`import.meta.hot` 往往**存在**。
    //    断言「与真实值一致」才与环境无关。
    const hot = (import.meta as unknown as { hot?: unknown }).hot;

    expect(isHMRAvailable()).toBe(!!hot);
  });

  it('forceRerender：未知 id ⇒ false', () => {
    expect(forceRerender('nope')).toBe(false);
  });

  it('forceRerender：已知 id ⇒ 发出 template 事件（old 与 new 是同一个）', () => {
    const id = uid();
    const comp = makeComp();
    registerComponent(id, comp, newContainer());
    const seen: { type: string; oldComponent: unknown; newComponent: unknown }[] = [];
    onHMRUpdate((u) => seen.push(u as never));

    expect(forceRerender(id)).toBe(true);
    expect(seen[0]!.type).toBe('template');
    expect(seen[0]!.oldComponent).toBe(comp);
    expect(seen[0]!.newComponent).toBe(comp);
  });

  it('模块加载时把注册表挂到 window（供生成的代码访问）', () => {
    const w = window as unknown as { __LYTJS_HMR_REGISTRY__?: Map<string, unknown> };

    expect(w.__LYTJS_HMR_REGISTRY__).toBeInstanceOf(Map);
  });
});
