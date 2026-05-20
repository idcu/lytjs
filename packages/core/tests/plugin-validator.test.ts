/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect, vi } from 'vitest';
import { PluginValidator } from '../src/plugin-validator';
import type { EnhancedPlugin, Plugin } from '../src/types';

describe('PluginValidator', () => {
  // ==================== 基础验证 ====================

  describe('基础验证', () => {
    it('有效的 EnhancedPlugin 应通过验证', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'my-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(true);
      expect(report.pluginName).toBe('my-plugin');
      expect(report.errorCount).toBe(0);
    });

    it('有效的基础 Plugin 应通过验证', () => {
      const validator = new PluginValidator();
      const plugin: Plugin = {
        install: vi.fn(),
      };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(true);
    });

    it('缺少 install 方法应验证失败', () => {
      const validator = new PluginValidator();
      const plugin = { name: 'bad-plugin' } as any;

      const report = validator.validate(plugin);

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-structure',
          }),
        ]),
      );
    });

    it('非对象应验证失败', () => {
      const validator = new PluginValidator();

      const report = validator.validate('not a plugin' as any);

      expect(report.valid).toBe(false);
      expect(report.issues[0]!.rule).toBe('validate-structure');
    });

    it('null 应验证失败', () => {
      const validator = new PluginValidator();

      const report = validator.validate(null as any);

      expect(report.valid).toBe(false);
    });
  });

  // ==================== 名称验证 ====================

  describe('名称验证', () => {
    it('缺少名称应产生警告', () => {
      const validator = new PluginValidator();
      const plugin: Plugin = { install: vi.fn() };

      const report = validator.validate(plugin);

      // 没有 name 是 warning，不是 error
      expect(report.valid).toBe(true);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            rule: 'validate-name',
          }),
        ]),
      );
    });

    it('空名称应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: '', install: vi.fn() };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-name',
            message: expect.stringContaining('must not be empty'),
          }),
        ]),
      );
    });

    it('非 kebab-case 名称应产生警告', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'MyPlugin', install: vi.fn() };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(true);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            rule: 'validate-name',
            message: expect.stringContaining('kebab-case'),
          }),
        ]),
      );
    });

    it('kebab-case 名称应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'my-awesome-plugin', install: vi.fn() };

      const report = validator.validate(plugin);

      const nameIssues = report.issues.filter((i) => i.rule === 'validate-name');
      expect(nameIssues).toHaveLength(0);
    });

    it('过长的名称应产生警告', () => {
      const validator = new PluginValidator();
      const longName = 'a'.repeat(101);
      const plugin: EnhancedPlugin = { name: longName, install: vi.fn() };

      const report = validator.validate(plugin);

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            rule: 'validate-name',
            message: expect.stringContaining('too long'),
          }),
        ]),
      );
    });
  });

  // ==================== 版本验证 ====================

  describe('版本验证', () => {
    it('有效的 semver 版本应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'test', version: '1.2.3', install: vi.fn() };

      const report = validator.validate(plugin);

      const versionIssues = report.issues.filter(
        (i) => i.rule === 'validate-version' && i.level === 'error',
      );
      expect(versionIssues).toHaveLength(0);
    });

    it('带 prerelease 的版本应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'test', version: '1.0.0-beta.1', install: vi.fn() };

      const report = validator.validate(plugin);

      const versionIssues = report.issues.filter(
        (i) => i.rule === 'validate-version' && i.level === 'error',
      );
      expect(versionIssues).toHaveLength(0);
    });

    it('无效的版本格式应产生警告', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'test', version: 'v1', install: vi.fn() };

      const report = validator.validate(plugin);

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            rule: 'validate-version',
          }),
        ]),
      );
    });

    it('非字符串版本应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'test', version: 123 as any, install: vi.fn() };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-version',
          }),
        ]),
      );
    });

    it('缺少版本应产生 info', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = { name: 'test', install: vi.fn() };

      const report = validator.validate(plugin);

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            rule: 'validate-version',
          }),
        ]),
      );
    });
  });

  // ==================== 依赖验证 ====================

  describe('依赖验证', () => {
    it('有效的依赖声明应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        dependencies: [{ name: 'dep-a', version: '^1.0.0' }],
      };

      const report = validator.validate(plugin);
      const depIssues = report.issues.filter(
        (i) => i.rule === 'validate-dependencies' && i.level === 'error',
      );
      expect(depIssues).toHaveLength(0);
    });

    it('依赖数组不是数组应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        dependencies: 'invalid' as any,
      };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-dependencies',
            message: expect.stringContaining('must be an array'),
          }),
        ]),
      );
    });

    it('依赖缺少名称应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        dependencies: [{ version: '^1.0.0' }] as any,
      };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-dependencies',
            message: expect.stringContaining('valid "name"'),
          }),
        ]),
      );
    });

    it('重复依赖应产生警告', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        dependencies: [{ name: 'dep-a' }, { name: 'dep-a' }],
      };

      const report = validator.validate(plugin);

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            rule: 'validate-dependencies',
            message: expect.stringContaining('Duplicate'),
          }),
        ]),
      );
    });

    it('自依赖应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        dependencies: [{ name: 'test' }],
      };

      const report = validator.validate(plugin);

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-dependencies',
            message: expect.stringContaining('cannot depend on itself'),
          }),
        ]),
      );
    });

    it('可选依赖验证', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        optionalDependencies: [{ name: 'opt-dep' }],
      };

      const report = validator.validate(plugin);
      const depErrors = report.issues.filter(
        (i) => i.rule === 'validate-dependencies' && i.level === 'error',
      );
      expect(depErrors).toHaveLength(0);
    });
  });

  // ==================== 冲突验证 ====================

  describe('冲突验证', () => {
    it('有效的冲突声明应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        conflicts: ['other-plugin'],
      };

      const report = validator.validate(plugin);
      const conflictErrors = report.issues.filter(
        (i) => i.rule === 'validate-conflicts' && i.level === 'error',
      );
      expect(conflictErrors).toHaveLength(0);
    });

    it('冲突数组不是数组应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        conflicts: 'invalid' as any,
      };

      const report = validator.validate(plugin);
      expect(report.valid).toBe(false);
    });

    it('与自身冲突应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        conflicts: ['test'],
      };

      const report = validator.validate(plugin);
      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-conflicts',
            message: expect.stringContaining('cannot conflict with itself'),
          }),
        ]),
      );
    });
  });

  // ==================== peerRequirements 验证 ====================

  describe('peerRequirements 验证', () => {
    it('有效的 peerRequirements 应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        peerRequirements: { lytjs: '^6.0.0', node: '>=18.0.0' },
      };

      const report = validator.validate(plugin);
      const peerErrors = report.issues.filter(
        (i) => i.rule === 'validate-peer-requirements' && i.level === 'error',
      );
      expect(peerErrors).toHaveLength(0);
    });

    it('非对象 peerRequirements 应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        peerRequirements: 'invalid' as any,
      };

      const report = validator.validate(plugin);
      expect(report.valid).toBe(false);
    });

    it('非字符串 lytjs 版本应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        peerRequirements: { lytjs: 123 as any },
      };

      const report = validator.validate(plugin);
      expect(report.valid).toBe(false);
    });
  });

  // ==================== 生命周期钩子验证 ====================

  describe('生命周期钩子验证', () => {
    it('有效的生命周期钩子应通过', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        beforeInstall: vi.fn(),
        afterInstall: vi.fn(),
        beforeMount: vi.fn(),
        afterMount: vi.fn(),
        cleanup: vi.fn(),
      };

      const report = validator.validate(plugin);
      const hookErrors = report.issues.filter(
        (i) => i.rule === 'validate-lifecycle-hooks' && i.level === 'error',
      );
      expect(hookErrors).toHaveLength(0);
    });

    it('非函数的钩子应产生错误', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'test',
        install: vi.fn(),
        beforeInstall: 'not a function' as any,
      };

      const report = validator.validate(plugin);
      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            rule: 'validate-lifecycle-hooks',
            message: expect.stringContaining('beforeInstall'),
          }),
        ]),
      );
    });
  });

  // ==================== 批量验证 ====================

  describe('批量验证', () => {
    it('validateAll() 应返回多个报告', () => {
      const validator = new PluginValidator();
      const plugins: EnhancedPlugin[] = [
        { name: 'plugin-a', install: vi.fn() },
        { name: 'plugin-b', install: vi.fn() },
        { name: 'plugin-c', install: vi.fn() },
      ];

      const reports = validator.validateAll(plugins);

      expect(reports).toHaveLength(3);
      expect(reports.every((r) => r.valid)).toBe(true);
    });
  });

  // ==================== 自定义规则 ====================

  describe('自定义规则', () => {
    it('addRule() 应添加自定义验证规则', () => {
      const validator = new PluginValidator();
      const customRule = vi
        .fn()
        .mockReturnValue([
          { level: 'warning' as const, rule: 'custom-rule', message: 'Custom warning' },
        ]);

      validator.addRule(customRule);
      validator.validate({ name: 'test', install: vi.fn() });

      expect(customRule).toHaveBeenCalled();
    });

    it('removeRule() 应移除验证规则', () => {
      const validator = new PluginValidator();
      const customRule = vi.fn().mockReturnValue([]);

      validator.addRule(customRule);
      validator.removeRule(customRule);
      validator.validate({ name: 'test', install: vi.fn() });

      expect(customRule).not.toHaveBeenCalled();
    });
  });

  // ==================== registerKnownPlugins ====================

  describe('registerKnownPlugins', () => {
    it('应注册已知插件名称', () => {
      const validator = new PluginValidator();
      validator.registerKnownPlugins(['plugin-a', 'plugin-b']);

      // 验证不会抛出错误
      const report = validator.validate({ name: 'test', install: vi.fn() });
      expect(report.valid).toBe(true);
    });
  });

  // ==================== 报告结构 ====================

  describe('报告结构', () => {
    it('应正确统计各级别问题数量', () => {
      const validator = new PluginValidator();
      const plugin: EnhancedPlugin = {
        name: 'MyPlugin',
        install: vi.fn(),
        version: 'invalid',
      };

      const report = validator.validate(plugin);

      expect(report.errorCount).toBe(report.issues.filter((i) => i.level === 'error').length);
      expect(report.warningCount).toBe(report.issues.filter((i) => i.level === 'warning').length);
      expect(report.infoCount).toBe(report.issues.filter((i) => i.level === 'info').length);
      expect(report.errorCount + report.warningCount + report.infoCount).toBe(report.issues.length);
    });
  });
});
