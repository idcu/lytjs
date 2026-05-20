/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @lytjs/plugin-theme 单元测试
 */

import { describe, it, expect } from 'vitest';

// 直接导入构建后的文件进行测试
const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-theme', () => {
  describe('模块导出', () => {
    it('应该导出默认插件', () => {
      expect(pluginModule.default).toBeDefined();
      expect(typeof pluginModule.default).toBe('object');
    });

    it('应该导出 createThemeManager 函数', () => {
      expect(pluginModule.createThemeManager).toBeDefined();
      expect(typeof pluginModule.createThemeManager).toBe('function');
    });
  });

  describe('createThemeManager', () => {
    it('应该创建主题管理器实例', () => {
      const manager = pluginModule.createThemeManager();
      expect(manager).toBeDefined();
      expect(typeof manager).toBe('object');
    });

    it('应该提供默认主题', () => {
      const manager = pluginModule.createThemeManager();
      expect(manager.currentTheme).toBeDefined();
      expect(Array.isArray(manager.availableThemes)).toBe(true);
      expect(manager.availableThemes).toContain('light');
      expect(manager.availableThemes).toContain('dark');
    });

    it('应该支持设置主题', () => {
      const manager = pluginModule.createThemeManager();
      expect(typeof manager.setTheme).toBe('function');
      expect(typeof manager.toggleTheme).toBe('function');
    });

    it('应该支持注册新主题', () => {
      const manager = pluginModule.createThemeManager();
      expect(typeof manager.registerTheme).toBe('function');

      const customTheme = {
        name: 'custom-test',
        isDark: false,
        variables: {
          '--lyt-bg-primary': '#ff0000',
        },
      };

      manager.registerTheme(customTheme);
      expect(manager.availableThemes).toContain('custom-test');
    });

    it('应该获取主题变量', () => {
      const manager = pluginModule.createThemeManager();
      expect(typeof manager.getThemeVariables).toBe('function');

      const vars = manager.getThemeVariables('light');
      expect(vars).toBeDefined();
      expect(typeof vars).toBe('object');
    });

    it('应该包含浅色主题变量', () => {
      const manager = pluginModule.createThemeManager();
      const vars = manager.getThemeVariables('light');
      expect(vars['--lyt-bg-primary']).toBeDefined();
    });

    it('应该包含深色主题变量', () => {
      const manager = pluginModule.createThemeManager();
      const vars = manager.getThemeVariables('dark');
      expect(vars['--lyt-bg-primary']).toBeDefined();
    });

    it('应该支持关闭系统主题检测', () => {
      const manager = pluginModule.createThemeManager({
        enableSystemTheme: false,
      });
      expect(manager).toBeDefined();
    });
  });
});
