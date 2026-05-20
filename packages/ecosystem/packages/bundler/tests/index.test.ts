 
import { describe, it, expect } from 'vitest';
import { createVitePlugin, createWebpackPlugin, getPreset, createViteConfig } from '../src';

describe('@lytjs/bundler', () => {
  describe('createVitePlugin', () => {
    it('should create Vite plugin instance', () => {
      const plugin = createVitePlugin();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('lytjs');
    });

    it('should accept options', () => {
      const plugin = createVitePlugin({ ssg: true, ssr: true });
      expect(plugin).toBeDefined();
    });
  });

  describe('createWebpackPlugin', () => {
    it('should create Webpack plugin instance', () => {
      const plugin = createWebpackPlugin();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('lytjs');
    });
  });

  describe('getPreset', () => {
    it('should get default preset', () => {
      const preset = getPreset();
      expect(preset).toBeDefined();
      expect(preset.name).toBe('default');
    });

    it('should get ssg preset', () => {
      const preset = getPreset('ssg');
      expect(preset).toBeDefined();
      expect(preset.name).toBe('ssg');
    });

    it('should get ssr preset', () => {
      const preset = getPreset('ssr');
      expect(preset).toBeDefined();
      expect(preset.name).toBe('ssr');
    });
  });

  describe('createViteConfig', () => {
    it('should create Vite config with default preset', () => {
      const config = createViteConfig();
      expect(config).toBeDefined();
    });

    it('should create Vite config with ssg preset', () => {
      const config = createViteConfig({ ssg: true });
      expect(config).toBeDefined();
    });
  });
});
