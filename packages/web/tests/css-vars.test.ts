import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeVarName,
  stripVarPrefix,
  setCSSVar,
  getCSSVar,
  setCSSVars,
  getCSSVars,
  removeCSSVar,
  removeCSSVars,
  hasCSSVar,
  toggleCSSVar,
  CSSVarObserver,
  ThemeManager,
} from '../src/css-vars';

describe('CSS Variables', () => {
  describe('normalizeVarName', () => {
    it('should add -- prefix if missing', () => {
      expect(normalizeVarName('primary-color')).toBe('--primary-color');
      expect(normalizeVarName('--primary-color')).toBe('--primary-color');
    });
  });

  describe('stripVarPrefix', () => {
    it('should remove -- prefix if present', () => {
      expect(stripVarPrefix('--primary-color')).toBe('primary-color');
      expect(stripVarPrefix('primary-color')).toBe('primary-color');
    });
  });

  describe('setCSSVar / getCSSVar', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('should set and get CSS variable', () => {
      setCSSVar(element, '--test-var', 'test-value');
      expect(getCSSVar(element, '--test-var')).toBe('test-value');
    });

    it('should handle values without -- prefix', () => {
      setCSSVar(element, 'test-var', 'test-value');
      expect(getCSSVar(element, 'test-var')).toBe('test-value');
    });

    it('should return null for non-existent variable', () => {
      expect(getCSSVar(element, '--non-existent')).toBeNull();
    });

    it('should return fallback for non-existent variable', () => {
      expect(getCSSVar(element, '--non-existent', 'fallback')).toBe('fallback');
    });

    it('should remove variable when set to null', () => {
      setCSSVar(element, '--test-var', 'value');
      setCSSVar(element, '--test-var', null);
      expect(getCSSVar(element, '--test-var')).toBeNull();
    });
  });

  describe('setCSSVars / getCSSVars', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('should set multiple CSS variables', () => {
      setCSSVars(element, {
        '--var1': 'value1',
        '--var2': 'value2',
      });
      expect(getCSSVar(element, '--var1')).toBe('value1');
      expect(getCSSVar(element, '--var2')).toBe('value2');
    });

    it('should get multiple CSS variables', () => {
      setCSSVar(element, '--var1', 'value1');
      setCSSVar(element, '--var2', 'value2');
      const values = getCSSVars(element, ['--var1', '--var2']);
      expect(values['--var1']).toBe('value1');
      expect(values['--var2']).toBe('value2');
    });
  });

  describe('removeCSSVar / removeCSSVars', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('should remove single CSS variable', () => {
      setCSSVar(element, '--test-var', 'value');
      removeCSSVar(element, '--test-var');
      expect(getCSSVar(element, '--test-var')).toBeNull();
    });

    it('should remove multiple CSS variables', () => {
      setCSSVar(element, '--var1', 'value1');
      setCSSVar(element, '--var2', 'value2');
      removeCSSVars(element, ['--var1', '--var2']);
      expect(getCSSVar(element, '--var1')).toBeNull();
      expect(getCSSVar(element, '--var2')).toBeNull();
    });
  });

  describe('hasCSSVar', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('should return true for existing variable', () => {
      setCSSVar(element, '--test-var', 'value');
      expect(hasCSSVar(element, '--test-var')).toBe(true);
    });

    it('should return false for non-existent variable', () => {
      expect(hasCSSVar(element, '--non-existent')).toBe(false);
    });
  });

  describe('toggleCSSVar', () => {
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('should toggle between two values', () => {
      setCSSVar(element, '--theme', 'light');
      const result1 = toggleCSSVar(element, '--theme', 'light', 'dark');
      expect(result1).toBe('dark');
      const result2 = toggleCSSVar(element, '--theme', 'light', 'dark');
      expect(result2).toBe('light');
    });
  });

  describe('ThemeManager', () => {
    let manager: ThemeManager;
    let element: HTMLElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
      manager = new ThemeManager(element);
    });

    afterEach(() => {
      element.remove();
    });

    it('should register and apply theme', () => {
      manager.register('dark', {
        '--bg': '#000',
        '--fg': '#fff',
      });
      expect(manager.apply('dark')).toBe(true);
      expect(getCSSVar(element, '--bg')).toBe('#000');
      expect(getCSSVar(element, '--fg')).toBe('#fff');
    });

    it('should return false for non-existent theme', () => {
      expect(manager.apply('non-existent')).toBe(false);
    });

    it('should track current theme', () => {
      manager.register('light', { '--bg': '#fff' });
      manager.register('dark', { '--bg': '#000' });
      manager.apply('light');
      expect(manager.getCurrentTheme()).toBe('light');
      manager.apply('dark');
      expect(manager.getCurrentTheme()).toBe('dark');
    });

    it('should list registered themes', () => {
      manager.register('light', {});
      manager.register('dark', {});
      expect(manager.getRegisteredThemes()).toContain('light');
      expect(manager.getRegisteredThemes()).toContain('dark');
    });
  });
});
