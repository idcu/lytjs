/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/metadata 测试
 */
import { describe, it, expect } from 'vitest';
import { MetadataBuilder, createMetadataBuilder, renderMetadata } from '../src';

describe('@lytjs/metadata', () => {
  describe('MetadataBuilder', () => {
    it('应该创建 MetadataBuilder 实例', () => {
      const builder = createMetadataBuilder();
      expect(builder).toBeInstanceOf(MetadataBuilder);
    });

    it('应该通过链式 API 构建 metadata', () => {
      const metadata = createMetadataBuilder()
        .title('Test Title')
        .description('Test Description')
        .keywords(['test', 'metadata'])
        .build();

      expect(metadata.title).toBe('Test Title');
      expect(metadata.description).toBe('Test Description');
      expect(metadata.keywords).toEqual(['test', 'metadata']);
    });

    it('应该支持 OpenGraph metadata', () => {
      const metadata = createMetadataBuilder()
        .openGraph({
          title: 'OG Title',
          description: 'OG Description',
          image: 'https://example.com/image.jpg',
        })
        .build();

      expect(metadata.openGraph?.title).toBe('OG Title');
      expect(metadata.openGraph?.image).toBe('https://example.com/image.jpg');
    });

    it('应该支持 Twitter metadata', () => {
      const metadata = createMetadataBuilder()
        .twitter({
          card: 'summary_large_image',
          title: 'Twitter Title',
        })
        .build();

      expect(metadata.twitter?.card).toBe('summary_large_image');
    });
  });

  describe('renderMetadata', () => {
    it('应该渲染 meta 标签字符串', () => {
      const metadata = createMetadataBuilder().title('Test').description('Test').build();

      const rendered = renderMetadata(metadata);

      expect(typeof rendered).toBe('string');
      expect(rendered).toContain('<title>Test</title>');
    });
  });
});
