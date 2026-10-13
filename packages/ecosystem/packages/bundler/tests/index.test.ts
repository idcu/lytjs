import { describe, it, expect } from 'vitest';
import {
  createVitePlugin,
  getPreset,
  createViteConfig,
  transformSFC,
  isLytModule,
  LYT_EXTENSIONS,
} from '../src';

const SFC = `<template>
  <div class="app">{{ msg }}</div>
</template>

<script setup>
const msg = 'hi';
</script>

<style scoped>
.app { color: red; }
</style>`;

const PLAIN_TS = `export const x = 1;`;

// ============================================================
// 基础 API 形态
// ============================================================

describe('@lytjs/bundler', () => {
  describe('createVitePlugin', () => {
    it('应返回名为 lytjs 的 Vite 插件', () => {
      const plugin = createVitePlugin();
      expect(plugin.name).toBe('lytjs');
      expect(typeof plugin.transform).toBe('function');
    });
  });

  describe('isLytModule', () => {
    it('应识别 .lyt / .vue（含查询串）', () => {
      expect(isLytModule('/a/App.lyt')).toBe(true);
      expect(isLytModule('/a/App.vue')).toBe(true);
      expect(isLytModule('/a/App.vue?t=123')).toBe(true);
      expect(isLytModule('/a/App.ts')).toBe(false);
      expect(isLytModule('/a/App.lyt.js')).toBe(false);
    });

    it('默认扩展名应为 [.lyt, .vue]', () => {
      expect([...LYT_EXTENSIONS]).toEqual(['.lyt', '.vue']);
    });
  });

  // ============================================================
  // P1-8：transform 必须是真实现（此前恒返回 null）
  // ============================================================

  describe('P1-8：transformSFC 真实转换', () => {
    it('必须真的把 SFC 编译出 render 函数（而非返回 null / 原样返回）', () => {
      const result = transformSFC(SFC, '/a/App.lyt');
      expect(result).not.toBeNull();
      expect(result!.code).not.toBe(SFC);
      expect(result!.code).toContain('function render');
      // 编译产物必须是可执行 JS，而不是原样保留 <template> 标签
      expect(result!.code).not.toContain('<template>');
      expect(result!.code).not.toContain('<style');
      // script setup 的内容必须被带出
      expect(result!.code).toContain("const msg = 'hi'");
    });

    it('非 .lyt/.vue 模块必须返回 null（交由其它插件处理）', () => {
      expect(transformSFC(PLAIN_TS, '/a/util.ts')).toBeNull();
      expect(transformSFC(PLAIN_TS, '/a/util.ts?raw')).toBeNull();
    });

    it('自定义 extensions 必须生效', () => {
      expect(transformSFC(SFC, '/a/App.lyt', { extensions: ['.tsx'] })).toBeNull();
      expect(transformSFC(SFC, '/a/App.tsx', { extensions: ['.tsx'] })).not.toBeNull();
    });

    it('CSS 必须被抽取到 css 字段，且 scoped 必须得到真实 scopeId', () => {
      const result = transformSFC(SFC, '/a/App.lyt');
      expect(result!.css).toBeDefined();
      expect(result!.scopedId).toMatch(/^[0-9a-f]{8}$/);
      expect(result!.css).toContain(`[data-v-${result!.scopedId}]`);
      expect(result!.css).not.toContain('data-v-undefined');
    });

    it('默认必须注入运行时 style（含幂等的 getElementById 复用）', () => {
      const result = transformSFC(SFC, '/a/App.lyt');
      expect(result!.code).toContain("document.createElement('style')");
      expect(result!.code).toContain('document.getElementById');
      expect(result!.code).toContain('typeof document !==');
      // 同一个模块 id 必须得到稳定的 style 元素 id（避免重复注入）
      const again = transformSFC(SFC, '/a/App.lyt');
      const idOf = (s: string) => /__lyt_style_id = "([^"]+)"/.exec(s)?.[1];
      expect(idOf(result!.code)).toBeDefined();
      expect(idOf(again.code)).toBe(idOf(result!.code));
    });

    it('injectCss: false 时必须不注入 style 代码，但 css 字段仍保留', () => {
      const result = transformSFC(SFC, '/a/App.lyt', { injectCss: false });
      expect(result!.code).not.toContain('document.createElement');
      expect(result!.css).toBeDefined();
    });

    it('ssr: true 必须真的切换编译目标（产物与 CSR 不同）', () => {
      const csr = transformSFC(SFC, '/a/App.lyt');
      const ssr = transformSFC(SFC, '/a/App.lyt', { ssr: true });
      expect(ssr!.code).not.toBe(csr!.code);
      expect(ssr!.code).toContain('renderToString');
      expect(csr!.code).not.toContain('renderToString');
    });

    it('无 style 块时 css / scopedId 必须为 undefined', () => {
      const result = transformSFC('<template><div>x</div></template>', '/a/Plain.lyt');
      expect(result!.css).toBeUndefined();
      expect(result!.scopedId).toBeUndefined();
    });
  });

  // ============================================================
  // P1-8：Vite 插件钩子必须真的调用 transformSFC
  // ============================================================

  describe('P1-8：Vite transform 钩子', () => {
    it('钩子对 .lyt 必须返回编译结果（而非 null）', () => {
      const plugin = createVitePlugin();
      const transform = plugin.transform as (code: string, id: string) => unknown;
      const out = transform(SFC, '/a/App.lyt') as { code: string } | null;
      expect(out).not.toBeNull();
      expect(out!.code).toContain('function render');
    });

    it('钩子对非 SFC 必须返回 null', () => {
      const plugin = createVitePlugin();
      const transform = plugin.transform as (code: string, id: string) => unknown;
      expect(transform(PLAIN_TS, '/a/util.ts')).toBeNull();
    });

    it('插件选项必须真的生效（ssr）', () => {
      const plugin = createVitePlugin({ ssr: true });
      const transform = plugin.transform as (code: string, id: string) => unknown;
      const out = transform(SFC, '/a/App.lyt') as { code: string };
      expect(out.code).toContain('renderToString');
    });
  });

  // ============================================================
  // 预设与配置
  // ============================================================

  describe('getPreset', () => {
    it('应返回 default / ssg / ssr 三种预设', () => {
      expect(getPreset().name).toBe('default');
      expect(getPreset('ssg').name).toBe('ssg');
      expect(getPreset('ssr').name).toBe('ssr');
    });

    it('未知预设名应回退到 default', () => {
      expect(getPreset('nope').name).toBe('default');
    });

    it('ssg / ssr 预设必须携带 ssr 编译的插件', () => {
      for (const name of ['ssg', 'ssr']) {
        const plugins = getPreset(name).vite!.plugins as Array<Record<string, unknown>>;
        const transform = plugins[0]!.transform as (code: string, id: string) => { code: string };
        expect(transform(SFC, '/a/App.lyt').code).toContain('renderToString');
      }
    });
  });

  describe('createViteConfig', () => {
    it('必须用调用方选项重建插件（此前会静默丢弃）', () => {
      const config = createViteConfig({ rendererMode: 'signal' });
      const plugins = config.plugins as Array<Record<string, unknown>>;
      const transform = plugins[0]!.transform as (code: string, id: string) => { code: string };
      const out = transform(SFC, '/a/App.lyt').code;
      // signal 模式产物不含 createBlock，含 signal 运行时调用
      expect(out).not.toContain('createBlock');
    });

    it('ssg 预设必须按 SSR 目标编译（SSG = SSR 预渲染）', () => {
      const config = createViteConfig({ ssg: true });
      const plugins = config.plugins as Array<Record<string, unknown>>;
      const transform = plugins[0]!.transform as (code: string, id: string) => { code: string };
      expect(transform(SFC, '/a/App.lyt').code).toContain('renderToString');
    });

    it('ssg 预设下显式 ssr:false 应被尊重', () => {
      const config = createViteConfig({ ssg: true, ssr: false });
      const plugins = config.plugins as Array<Record<string, unknown>>;
      const transform = plugins[0]!.transform as (code: string, id: string) => { code: string };
      expect(transform(SFC, '/a/App.lyt').code).not.toContain('renderToString');
    });
  });
});
