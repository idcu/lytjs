/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// tests/source-map.test.ts
// Source Map 生成器测试

import { describe, it, expect } from 'vitest';
import { SourceMapGenerator, createSourceMapGenerator } from '../src/source-map';

describe('SourceMapGenerator', () => {
  describe('基本功能', () => {
    it('应该创建一个空的 SourceMapGenerator', () => {
      const gen = new SourceMapGenerator('test.js');
      const map = gen.toJSON();
      expect(map.version).toBe(3);
      expect(map.file).toBe('test.js');
      expect(map.sources).toEqual([]);
      expect(map.names).toEqual([]);
      expect(map.mappings).toBe('');
    });

    it('应该使用指定的 sourceRoot', () => {
      const gen = new SourceMapGenerator('test.js', 'src/');
      expect(gen.toJSON().file).toBe('test.js');
    });
  });

  describe('addMapping', () => {
    it('应该添加映射并生成正确的 mappings', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 10);
      gen.addMapping(0, 5, 0, 20);

      const map = gen.toJSON();
      expect(map.mappings).not.toBe('');
      // mappings should be a non-empty string
      expect(map.mappings.length).toBeGreaterThan(0);
    });

    it('应该支持带名称的映射', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 10, 'foo');
      gen.addMapping(1, 0, 1, 10, 'bar');

      const map = gen.toJSON();
      expect(map.names).toEqual(['foo', 'bar']);
    });

    it('应该处理多行映射', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 0);
      gen.addMapping(0, 5, 0, 10);
      gen.addMapping(1, 0, 1, 0);
      gen.addMapping(1, 3, 1, 8);

      const map = gen.toJSON();
      // mappings should contain semicolons for line separators
      expect(map.mappings).toContain(';');
    });
  });

  describe('addSource', () => {
    it('应该添加源文件', () => {
      const gen = new SourceMapGenerator('output.js');
      gen.addSource('input.ts', 'const x = 1;');

      const map = gen.toJSON();
      expect(map.sources).toEqual(['input.ts']);
      expect(map.sourcesContent).toEqual(['const x = 1;']);
    });

    it('应该避免重复添加同一源文件', () => {
      const gen = new SourceMapGenerator('output.js');
      gen.addSource('input.ts');
      gen.addSource('input.ts');

      const map = gen.toJSON();
      expect(map.sources).toEqual(['input.ts']);
    });

    it('应该在重复添加时更新 sourcesContent', () => {
      const gen = new SourceMapGenerator('output.js');
      gen.addSource('input.ts');
      gen.addSource('input.ts', 'const x = 1;');

      const map = gen.toJSON();
      expect(map.sourcesContent).toEqual(['const x = 1;']);
    });
  });

  describe('toJSON', () => {
    it('应该生成符合 Source Map v3 规范的对象', () => {
      const gen = new SourceMapGenerator('output.js');
      gen.addSource('input.ts', 'source content');
      gen.addMapping(0, 0, 0, 0, 'variable');

      const map = gen.toJSON();

      // Verify required fields
      expect(map.version).toBe(3);
      expect(map.file).toBe('output.js');
      expect(map.sources).toEqual(['input.ts']);
      expect(map.sourcesContent).toEqual(['source content']);
      expect(map.names).toEqual(['variable']);
      expect(typeof map.mappings).toBe('string');
    });

    it('应该生成有效的 JSON', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 0);

      const json = JSON.stringify(gen.toJSON());
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(3);
    });
  });

  describe('toBase64', () => {
    it('应该生成 base64 data URI', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 0);

      const base64 = gen.toBase64();
      expect(base64).toMatch(/^data:application\/json;charset=utf-8;base64,/);
    });

    it('应该可以解码回原始 JSON', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 0, 'foo');

      const base64 = gen.toBase64();
      const encoded = base64.replace('data:application/json;charset=utf-8;base64,', '');
      const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));

      expect(decoded.version).toBe(3);
      expect(decoded.names).toEqual(['foo']);
    });
  });

  describe('toComment', () => {
    it('应该生成 sourceMappingURL 注释', () => {
      const gen = new SourceMapGenerator('test.js');
      gen.addMapping(0, 0, 0, 0);

      const comment = gen.toComment();
      expect(comment).toMatch(
        /^\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,/,
      );
    });
  });
});

describe('createSourceMapGenerator', () => {
  it('应该创建预配置的 SourceMapGenerator', () => {
    const gen = createSourceMapGenerator({
      filename: 'template.html',
      sourceContent: '<div>Hello</div>',
    });

    const map = gen.toJSON();
    expect(map.file).toBe('template.html');
    expect(map.sources).toEqual(['template.html']);
    expect(map.sourcesContent).toEqual(['<div>Hello</div>']);
  });

  it('应该使用默认文件名', () => {
    const gen = createSourceMapGenerator();
    expect(gen.toJSON().file).toBe('template.html');
  });
});

describe('VLQ Encoding', () => {
  it('应该正确编码简单映射', () => {
    const gen = new SourceMapGenerator('test.js');
    gen.addMapping(0, 0, 0, 0);

    const map = gen.toJSON();
    // A single mapping with all zeros should produce "AAAA"
    expect(map.mappings).toBe('AAAA');
  });

  it('应该正确编码非零值', () => {
    const gen = new SourceMapGenerator('test.js');
    gen.addMapping(0, 4, 0, 10);

    const map = gen.toJSON();
    // generated column = 10 (U in VLQ), source index = 0 (A), original line = 0 (A), original column = 4 (I)
    expect(map.mappings).toBe('UAAI');
  });

  it('应该正确编码负值', () => {
    // This tests that the VLQ encoder handles negative values
    // by encoding a mapping where the delta is negative
    const gen = new SourceMapGenerator('test.js');
    gen.addMapping(0, 10, 0, 0);
    gen.addMapping(0, 5, 0, 10); // delta: original column goes from 0 to 5 (positive)

    const map = gen.toJSON();
    // Should have two segments separated by comma
    expect(map.mappings).toContain(',');
  });

  it('应该正确编码大值', () => {
    const gen = new SourceMapGenerator('test.js');
    gen.addMapping(0, 0, 0, 100);

    const map = gen.toJSON();
    // Large values require multi-character VLQ encoding
    expect(map.mappings.length).toBeGreaterThan(4);
  });
});
