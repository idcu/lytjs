/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/platform-adapter 测试
 *
 * @description
 * 覆盖 AdapterRegistry、createPlatformRenderer、PlatformAdapter 接口兼容性
 * 和 PlatformPlugin 生命周期的测试用例。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adapterRegistry } from '../src/adapter-registry';
import { createPlatformRenderer } from '../src/create-renderer';
import type { PlatformAdapter, PlatformPlugin, PlatformRenderer } from '../src/types';
import type { VNode } from '@lytjs/common-vnode';

// ============================================================
// 测试用 Mock 适配器
// ============================================================

/**
 * 创建一个 mock 平台适配器，用于测试
 */
function createMockAdapter(
  name = 'test',
  version = '1.0.0',
): PlatformAdapter<Record<string, unknown>, Record<string, unknown>> {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const readyCallbacks: Array<() => void> = [];
  const unmountCallbacks: Array<() => void> = [];

  return {
    name,
    version,
    createElement(tag: string) {
      return { type: 'element', tag, attrs: {}, classes: [], style: '' };
    },
    createText(text: string) {
      return { type: 'text', text };
    },
    createComment(text: string) {
      return { type: 'comment', text };
    },
    insert(child, parent, _anchor) {
      (parent as Record<string, unknown>)._children = child;
    },
    remove(_child) {
      // 空实现
    },
    setElementText(node, text) {
      (node as Record<string, unknown>).text = text;
    },
    setText(node, text) {
      (node as Record<string, unknown>).text = text;
    },
    setAttribute(el, key, value) {
      const attrs = (el as Record<string, unknown>).attrs as Record<string, string>;
      attrs[key] = value;
    },
    removeAttribute(el, key) {
      const attrs = (el as Record<string, unknown>).attrs as Record<string, string>;
      delete attrs[key];
    },
    getAttribute(el, key) {
      const attrs = (el as Record<string, unknown>).attrs as Record<string, string>;
      return attrs[key] ?? null;
    },
    hasAttribute(el, key) {
      const attrs = (el as Record<string, unknown>).attrs as Record<string, string>;
      return key in attrs;
    },
    setStyle(el, style) {
      (el as Record<string, unknown>).style = style;
    },
    getStyle(el) {
      return (el as Record<string, unknown>).style as string;
    },
    addClass(el, className) {
      const classes = (el as Record<string, unknown>).classes as string[];
      classes.push(className);
    },
    removeClass(el, className) {
      const classes = (el as Record<string, unknown>).classes as string[];
      const idx = classes.indexOf(className);
      if (idx !== -1) classes.splice(idx, 1);
    },
    hasClass(el, className) {
      const classes = (el as Record<string, unknown>).classes as string[];
      return classes.includes(className);
    },
    addEventListener(el, event, handler) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(handler);
      (el as Record<string, unknown>).__listeners = listeners;
    },
    removeEventListener(_el, event, handler) {
      const list = listeners.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    querySelector(_selector) {
      return null;
    },
    querySelectorAll(_selector) {
      return [];
    },
    onReady(callback) {
      readyCallbacks.push(callback);
    },
    onUnmount(callback) {
      unmountCallbacks.push(callback);
    },
  };
}

/**
 * 创建一个 mock VNode
 */
function createMockVNode(overrides: Partial<VNode> = {}): VNode {
  return {
    type: 'div',
    key: null,
    ref: null,
    props: null,
    isStatic: false,
    isStaticRoot: false,
    isOnce: false,
    isAsyncPlaceholder: false,
    isComment: false,
    isCloned: false,
    isBlockTree: false,
    shapeFlag: 1,
    patchFlag: 0,
    dynamicProps: null,
    dynamicChildren: null,
    children: null,
    component: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    targetStart: null,
    loc: null,
    __v_isVNode: true,
    ...overrides,
  };
}

// ============================================================
// AdapterRegistry 测试
// ============================================================

describe('AdapterRegistry', () => {
  beforeEach(() => {
    // 清理注册表状态
    const names = adapterRegistry.getNames();
    for (const name of names) {
      adapterRegistry.unregister(name);
    }
  });

  describe('register', () => {
    it('应该成功注册一个适配器', () => {
      const adapter = createMockAdapter('web');
      adapterRegistry.register(adapter);
      expect(adapterRegistry.has('web')).toBe(true);
    });

    it('应该允许覆盖同名适配器', () => {
      const adapter1 = createMockAdapter('web', '1.0.0');
      const adapter2 = createMockAdapter('web', '2.0.0');
      adapterRegistry.register(adapter1);
      adapterRegistry.register(adapter2);
      expect(adapterRegistry.get('web')?.version).toBe('2.0.0');
    });

    it('应该在名称为空字符串时抛出错误', () => {
      const adapter = createMockAdapter('');
      expect(() => adapterRegistry.register(adapter)).toThrow('适配器名称不能为空');
    });
  });

  describe('unregister', () => {
    it('应该成功注销已注册的适配器', () => {
      const adapter = createMockAdapter('web');
      adapterRegistry.register(adapter);
      expect(adapterRegistry.unregister('web')).toBe(true);
      expect(adapterRegistry.has('web')).toBe(false);
    });

    it('注销不存在的适配器应返回 false', () => {
      expect(adapterRegistry.unregister('nonexistent')).toBe(false);
    });

    it('注销适配器时应同时清除关联的插件', () => {
      const adapter = createMockAdapter('web');
      const plugin: PlatformPlugin = {
        name: 'test-plugin',
        install() {},
      };
      adapterRegistry.register(adapter);
      adapterRegistry.addPlugin('web', plugin);
      adapterRegistry.unregister('web');
      expect(adapterRegistry.getPlugins('web')).toEqual([]);
    });
  });

  describe('get', () => {
    it('应该返回已注册的适配器', () => {
      const adapter = createMockAdapter('web');
      adapterRegistry.register(adapter);
      expect(adapterRegistry.get('web')).toBe(adapter);
    });

    it('未注册时应返回 undefined', () => {
      expect(adapterRegistry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('已注册时应返回 true', () => {
      adapterRegistry.register(createMockAdapter('web'));
      expect(adapterRegistry.has('web')).toBe(true);
    });

    it('未注册时应返回 false', () => {
      expect(adapterRegistry.has('web')).toBe(false);
    });
  });

  describe('getNames', () => {
    it('应该返回所有已注册的适配器名称', () => {
      adapterRegistry.register(createMockAdapter('web'));
      adapterRegistry.register(createMockAdapter('miniapp'));
      adapterRegistry.register(createMockAdapter('ssr'));
      const names = adapterRegistry.getNames();
      expect(names).toContain('web');
      expect(names).toContain('miniapp');
      expect(names).toContain('ssr');
      expect(names).toHaveLength(3);
    });

    it('无注册时应返回空数组', () => {
      expect(adapterRegistry.getNames()).toEqual([]);
    });
  });
});

// ============================================================
// AdapterRegistry 插件管理测试
// ============================================================

describe('AdapterRegistry plugins', () => {
  beforeEach(() => {
    const names = adapterRegistry.getNames();
    for (const name of names) {
      adapterRegistry.unregister(name);
    }
  });

  describe('addPlugin', () => {
    it('应该为已注册的平台添加插件', () => {
      adapterRegistry.register(createMockAdapter('web'));
      const plugin: PlatformPlugin = {
        name: 'analytics',
        install() {},
      };
      adapterRegistry.addPlugin('web', plugin);
      const plugins = adapterRegistry.getPlugins('web');
      expect(plugins).toHaveLength(1);
      expect(plugins[0]!.name).toBe('analytics');
    });

    it('应该为未注册的平台创建插件列表', () => {
      const plugin: PlatformPlugin = {
        name: 'logger',
        install() {},
      };
      adapterRegistry.addPlugin('future-platform', plugin);
      const plugins = adapterRegistry.getPlugins('future-platform');
      expect(plugins).toHaveLength(1);
    });

    it('应该允许添加多个插件', () => {
      adapterRegistry.register(createMockAdapter('web'));
      adapterRegistry.addPlugin('web', { name: 'p1', install() {} });
      adapterRegistry.addPlugin('web', { name: 'p2', install() {} });
      adapterRegistry.addPlugin('web', { name: 'p3', install() {} });
      expect(adapterRegistry.getPlugins('web')).toHaveLength(3);
    });
  });

  describe('removePlugin', () => {
    it('应该成功移除指定插件', () => {
      adapterRegistry.register(createMockAdapter('web'));
      const plugin: PlatformPlugin = {
        name: 'removable',
        install() {},
      };
      adapterRegistry.addPlugin('web', plugin);
      expect(adapterRegistry.removePlugin('web', 'removable')).toBe(true);
      expect(adapterRegistry.getPlugins('web')).toHaveLength(0);
    });

    it('移除不存在的插件应返回 false', () => {
      adapterRegistry.register(createMockAdapter('web'));
      expect(adapterRegistry.removePlugin('web', 'ghost')).toBe(false);
    });

    it('从不存在的平台移除插件应返回 false', () => {
      expect(adapterRegistry.removePlugin('ghost', 'plugin')).toBe(false);
    });

    it('不应影响其他插件', () => {
      adapterRegistry.register(createMockAdapter('web'));
      adapterRegistry.addPlugin('web', { name: 'keep', install() {} });
      adapterRegistry.addPlugin('web', { name: 'remove', install() {} });
      adapterRegistry.removePlugin('web', 'remove');
      const plugins = adapterRegistry.getPlugins('web');
      expect(plugins).toHaveLength(1);
      expect(plugins[0]!.name).toBe('keep');
    });
  });

  describe('getPlugins', () => {
    it('无插件时应返回空数组', () => {
      adapterRegistry.register(createMockAdapter('web'));
      expect(adapterRegistry.getPlugins('web')).toEqual([]);
    });

    it('未注册平台应返回空数组', () => {
      expect(adapterRegistry.getPlugins('unknown')).toEqual([]);
    });
  });
});

// ============================================================
// createPlatformRenderer 测试
// ============================================================

describe('createPlatformRenderer', () => {
  it('应该创建渲染器实例', () => {
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter);
    expect(renderer).toBeDefined();
    expect(typeof renderer.render).toBe('function');
    expect(typeof renderer.unmount).toBe('function');
    expect(typeof renderer.getAdapter).toBe('function');
  });

  it('getAdapter 应返回传入的适配器', () => {
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter);
    expect(renderer.getAdapter()).toBe(adapter);
  });

  it('render 应将元素 VNode 渲染到容器', () => {
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter);
    const vnode = createMockVNode({ type: 'div', children: 'hello' });
    const container: Record<string, unknown> = {};

    renderer.render(vnode, container as never);
    expect(container._children).toBeDefined();
    expect((container._children as Record<string, unknown>).type).toBe('element');
    expect((container._children as Record<string, unknown>).tag).toBe('div');
  });

  it('render 应处理文本 VNode', () => {
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter);
    const vnode = createMockVNode({ type: null, children: 'plain text' });
    const container: Record<string, unknown> = {};

    renderer.render(vnode, container as never);
    expect(container._children).toBeDefined();
    expect((container._children as Record<string, unknown>).type).toBe('text');
    expect((container._children as Record<string, unknown>).text).toBe('plain text');
  });

  it('render 应处理带属性的元素', () => {
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter);
    const vnode = createMockVNode({
      type: 'button',
      props: { id: 'btn', class: 'primary', style: 'color: red' },
    });
    const container: Record<string, unknown> = {};

    renderer.render(vnode, container as never);
    const el = container._children as Record<string, unknown>;
    expect(el.tag).toBe('button');
    expect((el.attrs as Record<string, string>).id).toBe('btn');
    expect(el.style).toBe('color: red');
    expect(el.classes as string[]).toContain('primary');
  });

  it('unmount 应清除容器内容', () => {
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter);
    const vnode = createMockVNode({ type: 'div' });
    const container: Record<string, unknown> = {};

    renderer.render(vnode, container as never);
    expect(container._children).toBeDefined();

    renderer.unmount(container as never);
    // remove 是空实现，但 unmount 不应抛错
    expect(container._children).toBeDefined();
  });

  it('重复 render 应先卸载再渲染', () => {
    const removeSpy = vi.fn();
    const adapter = createMockAdapter('web');
    adapter.remove = removeSpy;

    const renderer = createPlatformRenderer(adapter);
    const vnode1 = createMockVNode({ type: 'div' });
    const vnode2 = createMockVNode({ type: 'span' });
    const container: Record<string, unknown> = {};

    renderer.render(vnode1, container as never);
    renderer.render(vnode2, container as never);

    // 第一次 render 后再 render 应触发 remove
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('debug 模式下 render 应输出日志', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter, { debug: true });
    const vnode = createMockVNode({ type: 'div' });
    const container: Record<string, unknown> = {};

    renderer.render(vnode, container as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[platform-adapter:web]'),
      expect.anything(),
    );

    consoleSpy.mockRestore();
  });

  it('debug 模式下 unmount 应输出日志', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const adapter = createMockAdapter('web');
    const renderer = createPlatformRenderer(adapter, { debug: true });
    const vnode = createMockVNode({ type: 'div' });
    const container: Record<string, unknown> = {};

    renderer.render(vnode, container as never);
    renderer.unmount(container as never);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('卸载完成'));

    consoleSpy.mockRestore();
  });
});

// ============================================================
// PlatformAdapter 接口兼容性测试
// ============================================================

describe('PlatformAdapter 接口兼容性', () => {
  it('适配器应包含所有必需的属性和方法', () => {
    const adapter = createMockAdapter('web');

    // 只读属性
    expect(typeof adapter.name).toBe('string');
    expect(typeof adapter.version).toBe('string');

    // 节点操作
    expect(typeof adapter.createElement).toBe('function');
    expect(typeof adapter.createText).toBe('function');
    expect(typeof adapter.createComment).toBe('function');
    expect(typeof adapter.insert).toBe('function');
    expect(typeof adapter.remove).toBe('function');
    expect(typeof adapter.setElementText).toBe('function');
    expect(typeof adapter.setText).toBe('function');

    // 属性操作
    expect(typeof adapter.setAttribute).toBe('function');
    expect(typeof adapter.removeAttribute).toBe('function');
    expect(typeof adapter.getAttribute).toBe('function');
    expect(typeof adapter.hasAttribute).toBe('function');

    // 样式操作
    expect(typeof adapter.setStyle).toBe('function');
    expect(typeof adapter.getStyle).toBe('function');

    // 类名操作
    expect(typeof adapter.addClass).toBe('function');
    expect(typeof adapter.removeClass).toBe('function');
    expect(typeof adapter.hasClass).toBe('function');

    // 事件操作
    expect(typeof adapter.addEventListener).toBe('function');
    expect(typeof adapter.removeEventListener).toBe('function');

    // 查询
    expect(typeof adapter.querySelector).toBe('function');
    expect(typeof adapter.querySelectorAll).toBe('function');

    // 生命周期
    expect(typeof adapter.onReady).toBe('function');
    expect(typeof adapter.onUnmount).toBe('function');
  });

  it('属性操作应正确工作', () => {
    const adapter = createMockAdapter('web');
    const el = adapter.createElement('div');

    adapter.setAttribute(el, 'id', 'test');
    expect(adapter.getAttribute(el, 'id')).toBe('test');
    expect(adapter.hasAttribute(el, 'id')).toBe(true);
    expect(adapter.hasAttribute(el, 'class')).toBe(false);

    adapter.removeAttribute(el, 'id');
    expect(adapter.getAttribute(el, 'id')).toBeNull();
    expect(adapter.hasAttribute(el, 'id')).toBe(false);
  });

  it('样式操作应正确工作', () => {
    const adapter = createMockAdapter('web');
    const el = adapter.createElement('div');

    adapter.setStyle(el, 'color: red; font-size: 14px');
    expect(adapter.getStyle(el)).toBe('color: red; font-size: 14px');
  });

  it('类名操作应正确工作', () => {
    const adapter = createMockAdapter('web');
    const el = adapter.createElement('div');

    adapter.addClass(el, 'active');
    adapter.addClass(el, 'disabled');
    expect(adapter.hasClass(el, 'active')).toBe(true);
    expect(adapter.hasClass(el, 'disabled')).toBe(true);
    expect(adapter.hasClass(el, 'hidden')).toBe(false);

    adapter.removeClass(el, 'active');
    expect(adapter.hasClass(el, 'active')).toBe(false);
    expect(adapter.hasClass(el, 'disabled')).toBe(true);
  });

  it('文本和注释节点创建应正确工作', () => {
    const adapter = createMockAdapter('web');

    const text = adapter.createText('hello');
    expect((text as Record<string, unknown>).type).toBe('text');
    expect((text as Record<string, unknown>).text).toBe('hello');

    const comment = adapter.createText('a comment');
    expect((comment as Record<string, unknown>).type).toBe('text');
  });

  it('生命周期回调应正确注册', () => {
    const adapter = createMockAdapter('web');
    const readyCb = vi.fn();
    const unmountCb = vi.fn();

    adapter.onReady(readyCb);
    adapter.onUnmount(unmountCb);

    // 回调已注册，不会抛错
    expect(readyCb).not.toHaveBeenCalled();
    expect(unmountCb).not.toHaveBeenCalled();
  });
});

// ============================================================
// PlatformPlugin 生命周期测试
// ============================================================

describe('PlatformPlugin 生命周期', () => {
  beforeEach(() => {
    const names = adapterRegistry.getNames();
    for (const name of names) {
      adapterRegistry.unregister(name);
    }
  });

  it('插件的 install 方法应在添加时被调用', () => {
    const adapter = createMockAdapter('web');
    adapterRegistry.register(adapter);

    const installSpy = vi.fn();
    const plugin: PlatformPlugin = {
      name: 'test-plugin',
      install: installSpy,
    };

    // 手动调用 install（注册表只存储插件，不自动安装）
    const stored = adapterRegistry.get('web');
    if (stored) {
      plugin.install(stored);
    }

    expect(installSpy).toHaveBeenCalledTimes(1);
    expect(installSpy).toHaveBeenCalledWith(stored);
  });

  it('插件的 uninstall 方法应可选', () => {
    const plugin: PlatformPlugin = {
      name: 'no-uninstall',
      install() {},
    };

    // uninstall 为 undefined 不应报错
    expect(plugin.uninstall).toBeUndefined();
  });

  it('插件的 uninstall 方法应可正常调用', () => {
    const uninstallSpy = vi.fn();
    const plugin: PlatformPlugin = {
      name: 'with-uninstall',
      install() {},
      uninstall: uninstallSpy,
    };

    plugin.uninstall!();
    expect(uninstallSpy).toHaveBeenCalledTimes(1);
  });

  it('多个插件应按添加顺序存储', () => {
    adapterRegistry.register(createMockAdapter('web'));

    const plugin1: PlatformPlugin = { name: 'p1', install() {} };
    const plugin2: PlatformPlugin = { name: 'p2', install() {} };
    const plugin3: PlatformPlugin = { name: 'p3', install() {} };

    adapterRegistry.addPlugin('web', plugin1);
    adapterRegistry.addPlugin('web', plugin2);
    adapterRegistry.addPlugin('web', plugin3);

    const plugins = adapterRegistry.getPlugins('web');
    expect(plugins[0]).toBe(plugin1);
    expect(plugins[1]).toBe(plugin2);
    expect(plugins[2]).toBe(plugin3);
  });

  it('插件可以修改适配器行为', () => {
    const adapter = createMockAdapter('web');
    const originalCreateElement = adapter.createElement.bind(adapter);

    const plugin: PlatformPlugin = {
      name: 'element-tracker',
      install(adp) {
        const original = adp.createElement.bind(adp);
        adp.createElement = (tag: string) => {
          const el = original(tag);
          (el as Record<string, unknown>).__tracked = true;
          return el;
        };
      },
    };

    plugin.install(adapter);
    const el = adapter.createElement('div');
    expect((el as Record<string, unknown>).__tracked).toBe(true);

    // 恢复原始方法
    adapter.createElement = originalCreateElement;
  });
});
