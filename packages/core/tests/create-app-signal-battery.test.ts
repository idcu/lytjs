// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/core` 的 **createApp** —— Signal 模式挂载 / 挂载守卫 / 插件清理
 * （`src/create-app.ts`，659 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **228/417 语句未覆盖（45.3%）**，未覆盖区间集中在：
 * `mountWithSignalMode`（560-656 **整条路径**）、`mount()` 的四个守卫（卸载后再挂载 / 已挂载 /
 * 容器找不到 / 无根组件）、`unmount()` 的插件 `cleanup` 与监听器清理、Signal 模式卸载。
 *
 * 这些恰恰是**最容易写错、且出错时最难察觉**的地方：守卫不生效会让用户看到
 * "静默什么都不发生"；Signal 模式的 `data()`/`setup()` 出错时若被吞掉，用户只会看到白屏。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../src/create-app';

let container: HTMLElement;
let logs: string[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    logs.push(a.join(' '));
  });
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    logs.push(a.join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    logs.push(a.join(' '));
  });
});

afterEach(() => {
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const signalApp = (component: Record<string, unknown>, options: Record<string, unknown> = {}) =>
  createApp(component as never, null, { rendererMode: 'signal', ...options } as never);

// ==================== Signal 模式：入口守卫 ====================

describe('Signal 模式：入口守卫', () => {
  it('★ 没有 template ⇒ 明确报错（不是静默白屏）', async () => {
    const app = signalApp({ name: 'NoTpl' });

    await expect(app.mount(container)).rejects.toThrow(/requires a template string/);
  });

  it('★ 根组件不是对象 ⇒ 明确报错', async () => {
    const app = signalApp('not-a-component' as never);

    await expect(app.mount(container)).rejects.toThrow(/requires rootComponent to be a valid/);
  });

  it('rendererMode: "vapor" 是 signal 的别名', async () => {
    const app = createApp({ template: '<div class="vapor">hi</div>' } as never, null, {
      rendererMode: 'vapor',
    } as never);

    await app.mount(container);

    expect(container.textContent).toContain('hi');
  });
});

// ==================== Signal 模式：ctx 构建 ====================

describe('Signal 模式：data / setup 构建上下文', () => {
  it('data() 的返回值进入上下文，且渲染出来', async () => {
    const app = signalApp({
      template: '<div>{{ msg }}</div>',
      data: () => ({ msg: 'from-data' }),
    });

    await app.mount(container);

    expect(container.textContent).toContain('from-data');
  });

  it('setup() 收到 (props, {})，返回值合并进上下文', async () => {
    const setupSpy = vi.fn((props: Record<string, unknown>) => ({ fromSetup: props.p ?? 'none' }));
    const app = createApp(
      { template: '<div>{{ fromSetup }}</div>', setup: setupSpy } as never,
      { p: 'P' },
      { rendererMode: 'signal' } as never,
    );

    await app.mount(container);

    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy.mock.calls[0]![0]).toEqual({ p: 'P' });
    expect(container.textContent).toContain('P');
  });

  it('rootProps 也进入上下文', async () => {
    const app = createApp({ template: '<div>{{ label }}</div>' } as never, { label: 'LBL' }, {
      rendererMode: 'signal',
    } as never);

    await app.mount(container);

    expect(container.textContent).toContain('LBL');
  });

  it('★ data() 抛错 ⇒ 包装后抛出（消息含原因），不静默吞掉', async () => {
    const app = signalApp({
      name: 'BoomComp',
      template: '<div/>',
      data: () => {
        throw new Error('data-boom');
      },
    });

    await expect(app.mount(container)).rejects.toThrow(/Failed to execute data\(\).*data-boom/);
  });

  it('★ data() 抛错的消息里带**组件名**，便于定位', async () => {
    const app = signalApp({
      name: 'BoomComp',
      template: '<div/>',
      data: () => {
        throw new Error('x');
      },
    });

    await expect(app.mount(container)).rejects.toThrow(/BoomComp/);
  });

  it('★ setup() 抛错 ⇒ 同样包装后抛出', async () => {
    const app = signalApp({
      name: 'SetupBoom',
      template: '<div/>',
      setup: () => {
        throw new Error('setup-boom');
      },
    });

    await expect(app.mount(container)).rejects.toThrow(/Failed to execute setup\(\).*setup-boom/);
  });
});

// ==================== Signal 模式：生命周期与公共实例 ====================

describe('Signal 模式：生命周期钩子', () => {
  it('beforeMount → mounted 顺序，且 this 指向上下文', async () => {
    const order: string[] = [];
    const app = signalApp({
      template: '<div>{{ v }}</div>',
      data: () => ({ v: 1 }),
      beforeMount(this: Record<string, unknown>) {
        order.push('beforeMount');
        (this as Record<string, unknown>).fromHook = 'hooked';
      },
      mounted(this: Record<string, unknown>) {
        order.push('mounted');
        expect((this as Record<string, unknown>).v).toBe(1);
      },
    });

    await app.mount(container);

    expect(order).toEqual(['beforeMount', 'mounted']);
  });

  it('公共实例是 ctx 的代理：$el / $options / 读写', async () => {
    const app = signalApp({ template: '<div>{{ n }}</div>', data: () => ({ n: 7 }) });
    const vm = (await app.mount(container)) as unknown as Record<string, unknown>;

    expect(vm.$el).toBe(container);
    expect((vm.$options as Record<string, unknown>).template).toBe('<div>{{ n }}</div>');
    expect(vm.n).toBe(7);

    vm.n = 9;
    expect(vm.n).toBe(9);
  });
});

// ==================== Signal 模式：卸载 ====================

describe('Signal 模式：卸载', () => {
  it('卸载会清空容器、调用 beforeUnmount / unmounted', async () => {
    const order: string[] = [];
    const app = signalApp({
      template: '<div>bye</div>',
      beforeUnmount() {
        order.push('beforeUnmount');
      },
      unmounted() {
        order.push('unmounted');
      },
    });

    await app.mount(container);
    expect(container.textContent).toContain('bye');

    app.unmount();

    expect(container.childNodes).toHaveLength(0);
    expect(order).toEqual(['beforeUnmount', 'unmounted']);
  });
});

// ==================== mount 守卫 ====================

describe('mount() 的四个守卫', () => {
  const okComp = { render: () => null };

  it('★ 容器选择器找不到 ⇒ 明确报错', async () => {
    const app = createApp(okComp as never);

    await expect(app.mount('#not-exist')).rejects.toThrow(/cannot find element matching selector/);
  });

  it('★ 重复挂载 ⇒ 明确报错（提示先 unmount）', async () => {
    const app = createApp(okComp as never);
    await app.mount(container);

    const other = document.createElement('div');
    document.body.appendChild(other);

    await expect(app.mount(other)).rejects.toThrow(/already mounted/);
    other.remove();
  });

  it('★ 卸载后再挂载 ⇒ 明确报错（要求新建 app）', async () => {
    const app = createApp(okComp as never);
    await app.mount(container);
    app.unmount();

    await expect(app.mount(container)).rejects.toThrow(
      /has been unmounted and cannot be remounted/,
    );
  });

  it('★ 无根组件 ⇒ 警告并返回 null（不抛）', async () => {
    const app = createApp(null as never);

    await expect(app.mount(container)).resolves.toBeNull();
    expect(logs.join('\n')).toContain('expects a root component');
  });

  it('★ 挂载**失败**不应把 app 留在"已挂载"状态（修好后能重试）', async () => {
    const comp: Record<string, unknown> = { name: 'Fixable' }; // 先没有 template ⇒ 必失败
    const app = signalApp(comp);

    await expect(app.mount(container)).rejects.toThrow(/requires a template string/);

    // 修好组件再挂一次：修复前这里会报 "App is already mounted"（明明什么都没挂上）
    comp.template = '<div>fixed</div>';
    await app.mount(container);

    expect(container.textContent).toContain('fixed');
  });
});

// ==================== 插件 cleanup ====================

describe('unmount 时的插件清理', () => {
  it('插件的 cleanup 会被调用', async () => {
    const cleanup = vi.fn();
    const app = createApp({ render: () => null } as never);
    app.use({ name: 'p', install: () => {}, cleanup } as never);

    await app.mount(container);
    app.unmount();

    expect(cleanup).toHaveBeenCalled();
  });

  it('★ 插件 cleanup 抛错不应中断卸载（但要报出插件名）', async () => {
    const app = createApp({ render: () => null } as never);
    app.use({
      name: 'badPlugin',
      install: () => {},
      cleanup: () => {
        throw new Error('cleanup-boom');
      },
    } as never);

    await app.mount(container);

    expect(() => app.unmount()).not.toThrow();
    expect(logs.join('\n')).toContain('badPlugin');
  });
});
