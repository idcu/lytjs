import { describe, it, expect, vi } from 'vitest';
import { createApp, defineComponent, h } from '../src/index';

describe('Plugin', () => {
  it('should call install on use', () => {
    const install = vi.fn();
    const plugin = { install };
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
    expect(install).toHaveBeenCalledWith(app);
  });

  it('should pass options to install', () => {
    const install = vi.fn();
    const plugin = { install };
    const app = createApp({ render: () => h('div') });
    app.use(plugin, 1, 'a', true);
    expect(install).toHaveBeenCalledWith(app, 1, 'a', true);
  });

  it('should support function plugin', () => {
    const plugin = vi.fn();
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
    expect(plugin).toHaveBeenCalledWith(app);
  });

  it('should not install same plugin twice', () => {
    const install = vi.fn();
    const plugin = { install };
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
    app.use(plugin);
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('should support async install', async () => {
    const plugin = {
      async install(app: any) {
        await Promise.resolve();
        app.config.globalProperties.$async = true;
      },
    };
    const app = createApp({ render: () => h('div') });
    await app.use(plugin);
    expect(app.config.globalProperties.$async).toBe(true);
  });

  it('should register component via plugin', () => {
    const MyComp = defineComponent({ render: () => h('span') });
    const plugin = {
      install(app: any) {
        app.component('my-comp', MyComp);
      },
    };
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
  });

  it('should register directive via plugin', () => {
    const plugin = {
      install(app: any) {
        app.directive('focus', {});
      },
    };
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
  });

  it('should provide via plugin', () => {
    const plugin = {
      install(app: any) {
        app.provide('plugin-data', 'from-plugin');
      },
    };
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
  });

  it('should support multiple plugins', () => {
    const p1 = { install: vi.fn() };
    const p2 = { install: vi.fn() };
    const app = createApp({ render: () => h('div') });
    app.use(p1).use(p2);
    expect(p1.install).toHaveBeenCalled();
    expect(p2.install).toHaveBeenCalled();
  });

  it('should handle plugin install error', () => {
    const plugin = {
      install: () => {
        throw new Error('plugin error');
      },
    };
    const app = createApp({ render: () => h('div') });
    app.config.errorHandler = vi.fn();
    expect(() => app.use(plugin)).toThrow('plugin error');
  });
});
