// tests/sfc/parse.test.ts
// Tests for SFC parser

import { describe, it, expect } from 'vitest';
import { parseSFC } from '../../src/sfc/parse';

// ============================================================
// Helper: create a full SFC source string
// ============================================================

const BASIC_SFC = `<template>
  <div>{{ message }}</div>
</template>

<script>
export default {
  data() { return { message: 'hello' } }
}
</script>

<style scoped>
.container { color: red; }
</style>

<i18n>
{ "en": { "hello": "Hello" } }
</i18n>`;

// ============================================================
// Tests
// ============================================================

describe('parseSFC', () => {
  // ----------------------------------------------------------
  // Basic parsing
  // ----------------------------------------------------------

  it('should parse a basic SFC with all block types', () => {
    const descriptor = parseSFC(BASIC_SFC, { filename: 'App.lyt' });

    expect(descriptor.filename).toBe('App.lyt');
    expect(descriptor.template).not.toBeNull();
    expect(descriptor.script).not.toBeNull();
    expect(descriptor.styles).toHaveLength(1);
    expect(descriptor.customBlocks).toHaveLength(1);
  });

  it('should parse template block content correctly', () => {
    const descriptor = parseSFC(BASIC_SFC);

    expect(descriptor.template).not.toBeNull();
    expect(descriptor.template!.content.trim()).toBe('<div>{{ message }}</div>');
    expect(descriptor.template!.type).toBe('template');
    expect(descriptor.template!.ast).toBeNull();
  });

  it('should parse script block content correctly', () => {
    const descriptor = parseSFC(BASIC_SFC);

    expect(descriptor.script).not.toBeNull();
    expect(descriptor.script!.type).toBe('script');
    expect(descriptor.script!.content).toContain("data() { return { message: 'hello' } }");
    expect(descriptor.script!.setup).toBe(false);
  });

  it('should parse style block with scoped attribute', () => {
    const descriptor = parseSFC(BASIC_SFC);

    expect(descriptor.styles).toHaveLength(1);
    const style = descriptor.styles[0]!;
    expect(style.type).toBe('style');
    expect(style.content.trim()).toBe('.container { color: red; }');
    expect(style.scoped).toBe(true);
    expect(style.attrs['scoped']).toBe('');
  });

  it('should parse custom blocks (i18n)', () => {
    const descriptor = parseSFC(BASIC_SFC);

    expect(descriptor.customBlocks).toHaveLength(1);
    const i18n = descriptor.customBlocks[0]!;
    expect(i18n.type).toBe('i18n');
    expect(i18n.content).toContain('"hello": "Hello"');
  });

  // ----------------------------------------------------------
  // Start / End positions
  // ----------------------------------------------------------

  it('should compute correct start and end positions for blocks', () => {
    const source = `<template>
  <div>hello</div>
</template>`;
    const descriptor = parseSFC(source);

    expect(descriptor.template).not.toBeNull();
    expect(descriptor.template!.start).toBe(0);
    expect(descriptor.template!.end).toBe(source.length);
  });

  // ----------------------------------------------------------
  // Multiple style blocks
  // ----------------------------------------------------------

  it('should support multiple style blocks', () => {
    const source = `<template><div>test</div></template>
<style scoped>
.a { color: red; }
</style>
<style lang="scss">
.b { color: blue; }
</style>`;
    const descriptor = parseSFC(source);

    expect(descriptor.styles).toHaveLength(2);
    expect(descriptor.styles[0]!.scoped).toBe(true);
    expect(descriptor.styles[0]!.lang).toBeUndefined();
    expect(descriptor.styles[1]!.scoped).toBe(false);
    expect(descriptor.styles[1]!.lang).toBe('scss');
  });

  // ----------------------------------------------------------
  // Script setup
  // ----------------------------------------------------------

  it('should distinguish <script setup> from <script>', () => {
    const source = `<template><div>test</div></template>
<script setup>
const msg = 'hello'
</script>
<script>
export default { data() { return {} } }
</script>`;
    const descriptor = parseSFC(source);

    expect(descriptor.scriptSetup).not.toBeNull();
    expect(descriptor.scriptSetup!.setup).toBe(true);
    expect(descriptor.scriptSetup!.content).toContain("const msg = 'hello'");

    expect(descriptor.script).not.toBeNull();
    expect(descriptor.script!.setup).toBe(false);
    expect(descriptor.script!.content).toContain('export default');
  });

  // ----------------------------------------------------------
  // Attribute parsing
  // ----------------------------------------------------------

  it('should parse block attributes correctly', () => {
    const source = `<template lang="pug">
  div
</template>
<style scoped lang="less">
.test { color: red; }
</style>`;
    const descriptor = parseSFC(source);

    expect(descriptor.template!.attrs['lang']).toBe('pug');
    expect(descriptor.styles[0]!.attrs['lang']).toBe('less');
    expect(descriptor.styles[0]!.attrs['scoped']).toBe('');
  });

  // ----------------------------------------------------------
  // Empty / minimal SFCs
  // ----------------------------------------------------------

  it('should handle an SFC with only a template', () => {
    const source = `<template><div>only template</div></template>`;
    const descriptor = parseSFC(source);

    expect(descriptor.template).not.toBeNull();
    expect(descriptor.script).toBeNull();
    expect(descriptor.scriptSetup).toBeNull();
    expect(descriptor.styles).toHaveLength(0);
    expect(descriptor.customBlocks).toHaveLength(0);
  });

  it('should handle an empty source', () => {
    const descriptor = parseSFC('');

    expect(descriptor.template).toBeNull();
    expect(descriptor.script).toBeNull();
    expect(descriptor.styles).toHaveLength(0);
    expect(descriptor.customBlocks).toHaveLength(0);
  });

  it('should use default filename when not provided', () => {
    const descriptor = parseSFC('<template><div></div></template>');
    expect(descriptor.filename).toBe('anonymous.lyt');
  });

  // ----------------------------------------------------------
  // Custom blocks
  // ----------------------------------------------------------

  it('should recognize multiple custom block types', () => {
    const source = `<template><div></div></template>
<route>
{ "path": "/" }
</route>
<graphql>
query { users { id } }
</graphql>
<md>
# Hello World
</md>`;
    const descriptor = parseSFC(source);

    expect(descriptor.customBlocks).toHaveLength(3);
    expect(descriptor.customBlocks.map((b) => b.type)).toEqual(['route', 'graphql', 'md']);
  });

  // ----------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------

  it('should handle content with angle brackets inside blocks', () => {
    const source = `<script>
const fn = (a) => a > 0 ? a : -a;
const obj = { x: 1 < 2 };
</script>`;
    const descriptor = parseSFC(source);

    expect(descriptor.script).not.toBeNull();
    expect(descriptor.script!.content).toContain('a > 0 ? a : -a');
    expect(descriptor.script!.content).toContain('1 < 2');
  });

  it('should handle whitespace between blocks', () => {
    const source = `   <template>
  <div></div>
</template>


   <script>
export default {}
</script>   `;
    const descriptor = parseSFC(source);

    expect(descriptor.template).not.toBeNull();
    expect(descriptor.script).not.toBeNull();
  });
});
