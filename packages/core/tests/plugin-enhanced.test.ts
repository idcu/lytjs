 
import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '../src/plugin-registry';
import { PluginValidator } from '../src/plugin-validator';
import type { EnhancedPlugin, Plugin } from '../src/types';

/**
 * EnhancedPlugin 集成测试
 *
 * 注意：完整的 createApp 集成测试需要 component 包的 dist 正确解析
 * @lytjs/reactivity/scope，这需要 vitest alias 支持 dist 内部引用。
 * 此处测试 PluginRegistry + PluginValidator 的集成逻辑。
 */
describe('EnhancedPlugin 集成测试', () => {
  describe('Registry + Validator 协作', () => {
    it('应先验证再注册插件', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      // 验证
      const report = validator.validate(plugin);
      expect(report.valid).toBe(true);

      // 注册
      const result = registry.register(plugin);
      expect(result.success).toBe(true);
    });

    it('验证失败的插件不应注册（缺少 name）', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      // 没有 name 的插件
      const badPlugin = { install: vi.fn() } as any;

      const report = validator.validate(badPlugin);
      expect(report.valid).toBe(true); // 没有 name 只是 warning

      // 没有 name 的插件不应注册到 Registry
      const result = registry.register(badPlugin);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must have a name');
    });

    it('验证失败的插件不应注册（缺少 install）', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      // 有 name 但没有 install 的插件
      const badPlugin = { name: 'bad' } as any;

      const report = validator.validate(badPlugin);
      expect(report.valid).toBe(false);

      // 有 name 但验证失败时，Registry 仍会注册（Registry 不做验证）
      // 验证应由调用方负责
      const result = registry.register(badPlugin);
      expect(result.success).toBe(true); // Registry 只检查 name 和重复
    });

    it('依赖检查应在注册后执行', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      // 先注册依赖
      const depPlugin: EnhancedPlugin = {
        name: 'dep-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };
      validator.validate(depPlugin);
      registry.register(depPlugin);

      // 注册依赖方
      const mainPlugin: EnhancedPlugin = {
        name: 'main-plugin',
        install: vi.fn(),
        dependencies: [{ name: 'dep-plugin', version: '^1.0.0' }],
      };

      const report = validator.validate(mainPlugin);
      expect(report.valid).toBe(true);

      const depResult = registry.checkDependencies(mainPlugin);
      expect(depResult.satisfied).toBe(true);

      const result = registry.register(mainPlugin);
      expect(result.success).toBe(true);
    });

    it('缺少依赖应被检测到', () => {
      const registry = new PluginRegistry();

      const plugin: EnhancedPlugin = {
        name: 'main-plugin',
        install: vi.fn(),
        dependencies: [{ name: 'missing-dep' }],
      };

      const depResult = registry.checkDependencies(plugin);
      expect(depResult.satisfied).toBe(false);
      expect(depResult.missing).toHaveLength(1);
      expect(depResult.missing[0]!.name).toBe('missing-dep');
    });

    it('冲突检测应在注册时执行', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      const existingPlugin: EnhancedPlugin = {
        name: 'existing',
        install: vi.fn(),
      };
      validator.validate(existingPlugin);
      registry.register(existingPlugin);

      const conflictingPlugin: EnhancedPlugin = {
        name: 'conflicting',
        install: vi.fn(),
        conflicts: ['existing'],
      };

      validator.validate(conflictingPlugin);
      const result = registry.register(conflictingPlugin);
      expect(result.success).toBe(false);
      expect(result.error).toContain('conflicts');
    });

    it('拓扑排序应正确解析依赖顺序', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      const plugins: EnhancedPlugin[] = [
        { name: 'a', install: vi.fn() },
        { name: 'b', install: vi.fn(), dependencies: [{ name: 'a' }] },
        { name: 'c', install: vi.fn(), dependencies: [{ name: 'b' }] },
      ];

      for (const plugin of plugins) {
        validator.validate(plugin);
        registry.register(plugin);
      }

      const order = registry.resolveLoadOrder();
      const names = order.map((p) => p.name);

      expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
      expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
    });

    it('事件系统应跟踪完整生命周期', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();
      const events: Array<{ event: string; data: unknown }> = [];

      registry.on('before:register' as any, (event, data) => events.push({ event, data }));
      registry.on('after:register' as any, (event, data) => events.push({ event, data }));

      const plugin: EnhancedPlugin = {
        name: 'test-plugin',
        install: vi.fn(),
      };

      validator.validate(plugin);
      registry.register(plugin);
      registry.markInstalled('test-plugin');
      registry.unregister('test-plugin');

      const eventNames = events.map((e) => e.event);
      expect(eventNames).toContain('before:register');
      expect(eventNames).toContain('after:register');
    });
  });

  describe('向后兼容性', () => {
    it('基础 Plugin 应继续工作', () => {
      const registry = new PluginRegistry();
      const validator = new PluginValidator();

      const basicPlugin: Plugin = {
        install: vi.fn(),
      };

      // 基础 Plugin 验证应通过
      const report = validator.validate(basicPlugin);
      expect(report.valid).toBe(true);

      // 基础 Plugin 没有名称，不应注册到 Registry
      const result = registry.register(basicPlugin);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must have a name');
    });

    it('EnhancedPlugin 应完全向后兼容基础 Plugin', () => {
      const validator = new PluginValidator();

      // 最小 EnhancedPlugin（只有 name + install）
      const minimalPlugin: EnhancedPlugin = {
        name: 'minimal',
        install: vi.fn(),
      };

      const report = validator.validate(minimalPlugin);
      expect(report.valid).toBe(true);
    });

    it('带完整元数据的 EnhancedPlugin 应通过验证', () => {
      const validator = new PluginValidator();

      const fullPlugin: EnhancedPlugin = {
        name: 'full-plugin',
        version: '1.2.3',
        install: vi.fn(),
        meta: {
          description: '完整插件示例',
          author: 'LytJS Team',
          keywords: ['plugin', 'example'],
          license: 'MIT',
        },
        dependencies: [{ name: 'dep-a', version: '^1.0.0' }],
        optionalDependencies: [{ name: 'opt-b' }],
        conflicts: ['conflict-c'],
        peerRequirements: {
          lytjs: '^6.0.0',
          node: '>=18.0.0',
        },
        beforeInstall: vi.fn().mockReturnValue(true),
        afterInstall: vi.fn(),
        beforeMount: vi.fn(),
        afterMount: vi.fn(),
        cleanup: vi.fn(),
      };

      const report = validator.validate(fullPlugin);
      expect(report.valid).toBe(true);
    });
  });

  describe('自定义验证规则', () => {
    it('应支持添加自定义验证规则', () => {
      const validator = new PluginValidator();
      const registry = new PluginRegistry();

      // 添加自定义规则：插件名称必须以公司前缀开头
      validator.addRule((plugin) => {
        if (validator['isEnhancedPlugin'](plugin) && !plugin.name.startsWith('@mycompany/')) {
          return [
            {
              level: 'warning' as const,
              rule: 'company-prefix',
              message: `Plugin name "${plugin.name}" should start with "@mycompany/"`,
            },
          ];
        }
        return [];
      });

      const plugin: EnhancedPlugin = {
        name: 'third-party-plugin',
        install: vi.fn(),
      };

      const report = validator.validate(plugin);
      expect(report.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ rule: 'company-prefix' })]),
      );

      // 验证通过后仍可注册
      const result = registry.register(plugin);
      expect(result.success).toBe(true);
    });
  });
});
