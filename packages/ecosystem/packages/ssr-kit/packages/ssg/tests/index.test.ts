/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/ssg 测试
 */
import { describe, it, expect } from 'vitest';
import { SSGGenerator } from '../src';

describe('@lytjs/ssg', () => {
  describe('SSGGenerator', () => {
    it('应该创建 SSG 生成器', () => {
      const generator = new SSGGenerator({ routes: [] });
      expect(generator).toBeInstanceOf(SSGGenerator);
    });

    it('应该能够生成静态页面', async () => {
      const generator = new SSGGenerator({ routes: ['/home', '/about'] });
      const results = await generator.generate();
      expect(results).toBeInstanceOf(Array);
    });
  });
});
