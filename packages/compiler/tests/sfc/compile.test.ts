// tests/sfc/compile.test.ts
// Tests for SFC compiler

import { describe, it, expect } from 'vitest';
import { parseSFC } from '../../src/sfc/parse';
import { compileSFC } from '../../src/sfc/compile';
import {
  registerCustomBlockProcessor,
  unregisterCustomBlockProcessor,
} from '../../src/sfc/custom-blocks';

// ============================================================
// Test SFC sources
// ============================================================

const SIMPLE_SFC = `<template>
  <div class="container">{{ message }}</div>
</template>

<script>
export default {
  data() { return { message: 'hello' } }
}
</script>`;

const SFC_WITH_SCOPED_STYLE = `<template>
  <div class="app">Hello</div>
</template>

<script>
export default {
  name: 'MyApp'
}
</script>

<style scoped>
.app { color: red; }
.button { background: blue; }
</style>`;

const SFC_WITH_MULTIPLE_STYLES = `<template>
  <div>test</div>
</template>

<style scoped>
.a { color: red; }
</style>

<style>
.b { color: blue; }
</style>`;

const SFC_WITH_CUSTOM_BLOCK = `<template>
  <div>{{ $t('hello') }}</div>
</template>

<script>
export default {}
</script>

<i18n>
{ "en": { "hello": "Hello" } }
</i18n>`;

const SFC_WITH_SCRIPT_SETUP = `<template>
  <div>{{ msg }}</div>
</template>

<script setup>
const msg = 'hello from setup'
</script>`;

// ============================================================
// Tests
// ============================================================

describe('compileSFC', () => {
  // ----------------------------------------------------------
  // Basic compilation
  // ----------------------------------------------------------

  it('should compile a simple SFC into JS code', () => {
    const descriptor = parseSFC(SIMPLE_SFC, { filename: 'Simple.lyt' });
    const result = compileSFC(descriptor);

    expect(result.code).toContain('Generated from Simple.lyt');
    expect(result.code).toContain('data()');
    expect(result.code).toContain('Template render function');
  });

  it('should include the script content in the output', () => {
    const descriptor = parseSFC(SIMPLE_SFC);
    const result = compileSFC(descriptor);

    expect(result.code).toContain('message');
    expect(result.code).toContain('hello');
  });

  // ----------------------------------------------------------
  // Scoped CSS
  // ----------------------------------------------------------

  it('should extract scoped CSS and add scopeId', () => {
    const descriptor = parseSFC(SFC_WITH_SCOPED_STYLE, {
      filename: 'ScopedApp.lyt',
    });
    const result = compileSFC(descriptor, { scoped: true });

    expect(result.css).toBeDefined();
    expect(result.css).toContain('[data-v-');
    expect(result.scopedId).toBeDefined();
    expect(result.code).toContain('__scopeId');
  });

  it('should scope CSS selectors with data-v attribute', () => {
    const descriptor = parseSFC(SFC_WITH_SCOPED_STYLE, {
      filename: 'ScopedApp.lyt',
    });
    const result = compileSFC(descriptor, { scoped: true });

    // The scoped CSS should have the data-v attribute appended to selectors
    expect(result.css).toContain('.app[data-v-');
    expect(result.css).toContain('.button[data-v-');
  });

  it('should not scope CSS when scoped option is false', () => {
    const descriptor = parseSFC(SFC_WITH_SCOPED_STYLE);
    const result = compileSFC(descriptor, { scoped: false });

    // CSS should still be extracted but not scoped
    expect(result.css).toBeDefined();
    expect(result.css).toContain('.app');
    expect(result.css).not.toContain('[data-v-');
    expect(result.scopedId).toBeUndefined();
  });

  // ----------------------------------------------------------
  // Multiple style blocks
  // ----------------------------------------------------------

  it('should combine multiple style blocks into one CSS output', () => {
    const descriptor = parseSFC(SFC_WITH_MULTIPLE_STYLES);
    const result = compileSFC(descriptor, { scoped: true });

    expect(result.css).toBeDefined();
    expect(result.css).toContain('.a[data-v-');
    expect(result.css).toContain('.b[data-v-');
  });

  // ----------------------------------------------------------
  // Script setup
  // ----------------------------------------------------------

  it('should include script setup content in the output', () => {
    const descriptor = parseSFC(SFC_WITH_SCRIPT_SETUP);
    const result = compileSFC(descriptor);

    expect(result.code).toContain('script setup');
    expect(result.code).toContain("const msg = 'hello from setup'");
  });

  // ----------------------------------------------------------
  // Custom block processing
  // ----------------------------------------------------------

  it('should process custom blocks with registered processors', () => {
    registerCustomBlockProcessor({
      name: 'i18n',
      transform: (source, _attrs) => ({
        code: `// i18n block processed\nconst messages = ${source};`,
      }),
    });

    try {
      const descriptor = parseSFC(SFC_WITH_CUSTOM_BLOCK);
      const result = compileSFC(descriptor);

      expect(result.code).toContain('i18n block processed');
      expect(result.code).toContain('const messages');
    } finally {
      unregisterCustomBlockProcessor('i18n');
    }
  });

  // ----------------------------------------------------------
  // Compile options
  // ----------------------------------------------------------

  it('should use provided id as scopeId', () => {
    const descriptor = parseSFC(SFC_WITH_SCOPED_STYLE);
    const result = compileSFC(descriptor, {
      id: 'custom123',
      scoped: true,
    });

    expect(result.scopedId).toBe('custom123');
    expect(result.css).toContain('[data-v-custom123]');
  });

  it('should generate deterministic scopeId from filename', () => {
    const descriptor = parseSFC(SFC_WITH_SCOPED_STYLE, {
      filename: 'deterministic.lyt',
    });
    const result1 = compileSFC(descriptor, { scoped: true });
    const result2 = compileSFC(descriptor, { scoped: true });

    expect(result1.scopedId).toBe(result2.scopedId);
  });

  // ----------------------------------------------------------
  // Empty / minimal SFCs
  // ----------------------------------------------------------

  it('should compile an SFC with only a template', () => {
    const source = `<template><div>only template</div></template>`;
    const descriptor = parseSFC(source);
    const result = compileSFC(descriptor);

    expect(result.code).toContain('Template render function');
    expect(result.css).toBeUndefined();
  });

  it('should compile an SFC with no template', () => {
    const source = `<script>
export default { name: 'NoTemplate' }
</script>`;
    const descriptor = parseSFC(source);
    const result = compileSFC(descriptor);

    expect(result.code).toContain('NoTemplate');
    expect(result.code).not.toContain('Template render function');
  });
});

// ============================================================
// P1-8 回归：`<style scoped>` 的默认路径 与 ssr 开关
// ============================================================
//
// 背景（2026-10-10 实测）：这两条都是「能力存在但静默失效」，且此前的
// 测试只覆盖了**显式传 `scoped: true`** 的那一支，恰好绕开了缺陷。
describe('compileSFC — P1-8 回归（scoped 默认路径 / ssr 开关）', () => {
  const SCOPED = `<template>
  <div class="app">Hello</div>
</template>

<style scoped>
.app { color: red; }
</style>`;

  it('未显式传 scoped 时，<style scoped> 必须得到真实 scopeId（不得是 data-v-undefined）', () => {
    const descriptor = parseSFC(SCOPED, { filename: 'DefaultScoped.lyt' });
    // ⚠️ 注意：这里**故意不传** scoped 选项 —— 正是此前未被覆盖的默认路径
    const result = compileSFC(descriptor, { filename: 'DefaultScoped.lyt' });

    expect(result.scopedId).toBeDefined();
    expect(result.scopedId).toMatch(/^[0-9a-f]{8}$/);
    expect(result.css).toBeDefined();
    expect(result.css).not.toContain('data-v-undefined');
    expect(result.css).toContain(`[data-v-${result.scopedId}]`);
    // template 必须带上同一个 scope 属性，否则 CSS 选择器匹配不到任何元素
    expect(result.code).toContain(`data-v-${result.scopedId}`);
    expect(result.code).toContain(`const __scopeId = ${JSON.stringify(result.scopedId)};`);
  });

  it('不同文件的默认 scopeId 必须互不相同（隔离不塌陷为同一个属性）', () => {
    const a = compileSFC(parseSFC(SCOPED, { filename: 'A.lyt' }), { filename: 'A.lyt' });
    const b = compileSFC(parseSFC(SCOPED, { filename: 'B.lyt' }), { filename: 'B.lyt' });

    expect(a.scopedId).toBeDefined();
    expect(b.scopedId).toBeDefined();
    expect(a.scopedId).not.toBe(b.scopedId);
  });

  it('未带 scoped 属性的 <style> 不得被作用域化（默认路径不应过度作用域）', () => {
    const source = `<template><div class="app">x</div></template>
<style>
.app { color: red; }
</style>`;
    const result = compileSFC(parseSFC(source, { filename: 'Plain.lyt' }), {
      filename: 'Plain.lyt',
    });

    expect(result.css).toBeDefined();
    expect(result.css).not.toContain('[data-v-');
    expect(result.scopedId).toBeUndefined();
  });

  it('ssr: true 必须真正走 SSR 代码生成（与 ssr: false 产物不同）', () => {
    const descriptor = parseSFC(SCOPED, { filename: 'Ssr.lyt' });

    const csr = compileSFC(descriptor, { filename: 'Ssr.lyt' });
    const ssr = compileSFC(descriptor, { filename: 'Ssr.lyt', ssr: true });

    expect(ssr.code).not.toBe(csr.code);
    // SSR 通路产出字符串拼接 + HTML 转义；CSR 通路不得出现它们
    expect(ssr.code).toContain('renderToString');
    expect(ssr.code).toContain('escapeHtml');
    expect(csr.code).not.toContain('renderToString');
    expect(csr.code).not.toContain('escapeHtml');
  });

  it('ssr: true 时动态插值必须被 HTML 转义（而非直接拼进字符串）', () => {
    const source = `<template><div>{{ msg }}</div></template>`;
    const ssr = compileSFC(parseSFC(source, { filename: 'Dyn.lyt' }), {
      filename: 'Dyn.lyt',
      ssr: true,
    });

    expect(ssr.code).toContain('escapeHtml(_ctx.msg');
  });
});
