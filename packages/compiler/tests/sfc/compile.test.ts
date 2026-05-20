 
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
