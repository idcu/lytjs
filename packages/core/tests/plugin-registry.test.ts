import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '../src/plugin-registry';
import type { EnhancedPlugin, Plugin, PluginLifecycleEvent } from '../src/types';

describe('PluginRegistry', () => {
  // ==================== 基础注册/注销 ====================

  describe('基础注册和注销', () => {
    it('应该成功注册 EnhancedPlugin', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      const result = registry.register(plugin);

      expect(result.success).toBe(true);
      expect(result.name).toBe('test-plugin');
      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('应该拒绝重复注册', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      registry.register(plugin);
      const result = registry.register(plugin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('应该拒绝没有 name 的插件', () => {
      const registry = new PluginRegistry();
      const plugin: Plugin = {
        install: vi.fn(),
      };

      const result = registry.register(plugin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have a name');
    });

    it('应该成功注销插件', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      registry.register(plugin);
      const result = registry.unregister('test-plugin');

      expect(result).toBe(true);
      expect(registry.has('test-plugin')).toBe(false);
    });

    it('注销不存在的插件应返回 false', () => {
      const registry = new PluginRegistry();
      expect(registry.unregister('non-existent')).toBe(false);
    });

    it('注销时应调用 cleanup', () => {
      const registry = new PluginRegistry();
      const cleanup = vi.fn();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
        cleanup,
      };

      registry.register(plugin);
      registry.markInstalled('test-plugin');
      registry.unregister('test-plugin');

      expect(cleanup).toHaveBeenCalled();
    });

    it('注销时 cleanup 异步应不阻塞', async () => {
      const registry = new PluginRegistry();
      const cleanup = vi.fn().mockResolvedValue(undefined);
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
        cleanup,
      };

      registry.register(plugin);
      registry.markInstalled('test-plugin');
      registry.unregister('test-plugin');

      // cleanup 是异步的，但 unregister 应该同步返回
      expect(registry.has('test-plugin')).toBe(false);
      // 等待异步 cleanup 完成
      await vi.waitFor(() => expect(cleanup).toHaveBeenCalled());
    });
  });

  // ==================== 查询功能 ====================

  describe('查询功能', () => {
    it('get() 应返回已注册插件信息', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      registry.register(plugin);
      const registered = registry.get('test-plugin');

      expect(registered).toBeDefined();
      expect(registered!.plugin).toBe(plugin);
      expect(registered!.installed).toBe(false);
      expect(registered!.registeredAt).toBeGreaterThan(0);
    });

    it('getPlugin() 应返回插件实例', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      registry.register(plugin);
      expect(registry.getPlugin('test-plugin')).toBe(plugin);
    });

    it('getNames() 应返回所有插件名称', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'a', install: vi.fn() });
      registry.register({ name: 'b', install: vi.fn() });
      registry.register({ name: 'c', install: vi.fn() });

      expect(registry.getNames()).toEqual(['a', 'b', 'c']);
    });

    it('getAll() 应返回所有注册信息', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'a', install: vi.fn() });
      registry.register({ name: 'b', install: vi.fn() });

      expect(registry.getAll()).toHaveLength(2);
    });

    it('getInstalled() 应只返回已安装的插件', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'a', install: vi.fn() });
      registry.register({ name: 'b', install: vi.fn() });

      registry.markInstalled('a');

      expect(registry.getInstalled()).toHaveLength(1);
      expect(registry.getInstalled()[0]!.plugin.name).toBe('a');
    });
  });

  // ==================== 安装状态管理 ====================

  describe('安装状态管理', () => {
    it('markInstalled() 应标记插件为已安装', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      registry.register(plugin);
      expect(registry.get('test-plugin')!.installed).toBe(false);

      registry.markInstalled('test-plugin');
      expect(registry.get('test-plugin')!.installed).toBe(true);
      expect(registry.get('test-plugin')!.installedAt).toBeGreaterThan(0);
    });

    it('markUninstalled() 应标记插件为未安装', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      registry.register(plugin);
      registry.markInstalled('test-plugin');
      registry.markUninstalled('test-plugin');

      expect(registry.get('test-plugin')!.installed).toBe(false);
      expect(registry.get('test-plugin')!.installedAt).toBeUndefined();
    });
  });

  // ==================== 依赖管理 ====================

  describe('依赖管理', () => {
    it('checkDependencies() 应检测缺少的必需依赖', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        install: vi.fn(),
        dependencies: [{ name: 'dep-a' }, { name: 'dep-b', version: '^1.0.0' }],
      };

      const result = registry.checkDependencies(plugin);

      expect(result.satisfied).toBe(false);
      expect(result.missing).toHaveLength(2);
      expect(result.missing[0]!.name).toBe('dep-a');
      expect(result.missing[1]!.name).toBe('dep-b');
    });

    it('checkDependencies() 应检测缺少的可选依赖', () => {
      const registry = new PluginRegistry();
      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        install: vi.fn(),
        optionalDependencies: [{ name: 'opt-dep' }],
      };

      const result = registry.checkDependencies(plugin);

      // 可选依赖缺失不影响 satisfied
      expect(result.satisfied).toBe(true);
      expect(result.missingOptional).toHaveLength(1);
    });

    it('checkDependencies() 应检测版本不匹配', () => {
      const registry = new PluginRegistry();
      registry.register({
        name: 'dep-a',
        version: '1.0.0',
        install: vi.fn(),
      });

      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        install: vi.fn(),
        dependencies: [{ name: 'dep-a', version: '^2.0.0' }],
      };

      const result = registry.checkDependencies(plugin);

      expect(result.satisfied).toBe(false);
      expect(result.versionMismatch).toHaveLength(1);
      expect(result.versionMismatch[0]!.name).toBe('dep-a');
    });

    it('checkDependencies() 满足依赖时应返回 satisfied', () => {
      const registry = new PluginRegistry();
      registry.register({
        name: 'dep-a',
        version: '1.2.3',
        install: vi.fn(),
      });

      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        install: vi.fn(),
        dependencies: [{ name: 'dep-a', version: '^1.0.0' }],
      };

      const result = registry.checkDependencies(plugin);
      expect(result.satisfied).toBe(true);
    });

    it('版本比较应支持各种 semver 前缀', () => {
      const registry = new PluginRegistry();
      registry.register({
        name: 'dep',
        version: '1.5.0',
        install: vi.fn(),
      });

      // ^1.0.0 → >=1.0.0 <2.0.0
      let result = registry.checkDependencies({
        name: 'p1',
        install: vi.fn(),
        dependencies: [{ name: 'dep', version: '^1.0.0' }],
      });
      expect(result.satisfied).toBe(true);

      // ~1.5.0 → >=1.5.0 <1.6.0
      result = registry.checkDependencies({
        name: 'p2',
        install: vi.fn(),
        dependencies: [{ name: 'dep', version: '~1.5.0' }],
      });
      expect(result.satisfied).toBe(true);

      // >=1.5.0
      result = registry.checkDependencies({
        name: 'p3',
        install: vi.fn(),
        dependencies: [{ name: 'dep', version: '>=1.5.0' }],
      });
      expect(result.satisfied).toBe(true);

      // >1.5.0
      result = registry.checkDependencies({
        name: 'p4',
        install: vi.fn(),
        dependencies: [{ name: 'dep', version: '>1.5.0' }],
      });
      expect(result.satisfied).toBe(false);

      // <2.0.0
      result = registry.checkDependencies({
        name: 'p5',
        install: vi.fn(),
        dependencies: [{ name: 'dep', version: '<2.0.0' }],
      });
      expect(result.satisfied).toBe(true);
    });
  });

  // ==================== 冲突检测 ====================

  describe('冲突检测', () => {
    it('应检测到插件冲突', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'conflicting-plugin', install: vi.fn() });

      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        install: vi.fn(),
        conflicts: ['conflicting-plugin'],
      };

      const result = registry.register(plugin);
      expect(result.success).toBe(false);
      expect(result.error).toContain('conflicts');
    });

    it('无冲突时应成功注册', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'other-plugin', install: vi.fn() });

      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        install: vi.fn(),
        conflicts: ['non-existent'],
      };

      const result = registry.register(plugin);
      expect(result.success).toBe(true);
    });
  });

  // ==================== 拓扑排序 ====================

  describe('resolveLoadOrder', () => {
    it('应根据依赖关系排序', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'a', install: vi.fn() });
      registry.register({
        name: 'b',
        install: vi.fn(),
        dependencies: [{ name: 'a' }],
      });
      registry.register({
        name: 'c',
        install: vi.fn(),
        dependencies: [{ name: 'b' }],
      });

      const order = registry.resolveLoadOrder();
      const names = order.map((p) => p.name);

      // a 必须在 b 之前，b 必须在 c 之前
      expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
      expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
    });

    it('应检测循环依赖', () => {
      const registry = new PluginRegistry();
      registry.register({
        name: 'a',
        install: vi.fn(),
        dependencies: [{ name: 'b' }],
      });
      registry.register({
        name: 'b',
        install: vi.fn(),
        dependencies: [{ name: 'a' }],
      });

      expect(() => registry.resolveLoadOrder()).toThrow('Circular dependency');
    });
  });

  // ==================== 事件系统 ====================

  describe('事件系统', () => {
    it('on() 应注册事件监听器', () => {
      const registry = new PluginRegistry();
      const handler = vi.fn();

      registry.on('after:register', handler);
      registry.register({ name: 'test', install: vi.fn() });

      expect(handler).toHaveBeenCalledWith(
        'after:register',
        expect.objectContaining({ name: 'test' }),
      );
    });

    it('off() 应移除事件监听器', () => {
      const registry = new PluginRegistry();
      const handler = vi.fn();

      registry.on('after:register', handler);
      registry.off('after:register', handler);
      registry.register({ name: 'test', install: vi.fn() });

      expect(handler).not.toHaveBeenCalled();
    });

    it('on() 返回的函数应取消监听', () => {
      const registry = new PluginRegistry();
      const handler = vi.fn();

      const unsubscribe = registry.on('after:register', handler);
      unsubscribe();
      registry.register({ name: 'test', install: vi.fn() });

      expect(handler).not.toHaveBeenCalled();
    });

    it('应支持多个事件监听器', () => {
      const registry = new PluginRegistry();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registry.on('after:register', handler1);
      registry.on('after:register', handler2);
      registry.register({ name: 'test', install: vi.fn() });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('应触发所有生命周期事件', () => {
      const registry = new PluginRegistry();
      const events: PluginLifecycleEvent[] = [];
      const handler = vi.fn((event: PluginLifecycleEvent) => events.push(event));

      registry.on('before:register' as PluginLifecycleEvent, handler);
      registry.on('after:register' as PluginLifecycleEvent, handler);
      registry.on('before:unregister' as PluginLifecycleEvent, handler);
      registry.on('after:unregister' as PluginLifecycleEvent, handler);

      registry.register({ name: 'test', install: vi.fn() });
      registry.unregister('test');

      expect(events).toContain('before:register');
      expect(events).toContain('after:register');
      expect(events).toContain('before:unregister');
      expect(events).toContain('after:unregister');
    });
  });

  // ==================== clear ====================

  describe('clear', () => {
    it('应清空所有已注册插件', () => {
      const registry = new PluginRegistry();
      registry.register({ name: 'a', install: vi.fn() });
      registry.register({ name: 'b', install: vi.fn() });

      registry.clear();

      expect(registry.size).toBe(0);
    });

    it('clear 时应调用已安装插件的 cleanup', () => {
      const registry = new PluginRegistry();
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      registry.register({ name: 'a', install: vi.fn(), cleanup: cleanup1 });
      registry.register({ name: 'b', install: vi.fn(), cleanup: cleanup2 });
      registry.markInstalled('a');
      registry.markInstalled('b');

      registry.clear();

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });
  });

  // ==================== 构造函数 ====================

  describe('构造函数', () => {
    it('应正确创建 PluginRegistry 实例', () => {
      const registry = new PluginRegistry();
      expect(registry.size).toBe(0);
    });
  });
});
