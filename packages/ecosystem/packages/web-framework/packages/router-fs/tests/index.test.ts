import { describe, it, expect } from 'vitest';
import { createFileSystemRouter } from '../src';

describe('@lytjs/router-fs', () => {
  describe('createFileSystemRouter', () => {
    it('should create file system router instance', () => {
      const router = createFileSystemRouter({
        pagesDir: 'test',
      });
      expect(router).toBeDefined();
      expect(router.getRoutes).toBeDefined();
      expect(router.match).toBeDefined();
    });

    it('should handle route matching', async () => {
      const router = createFileSystemRouter({
        pagesDir: 'test',
      });
      router.addRoute({
        path: '/about',
        componentPath: 'test/about.ts',
        isDynamic: false,
        isNested: false,
      });
      router.addRoute({
        path: '/user/:id',
        componentPath: 'test/user/[id].ts',
        isDynamic: true,
        params: ['id'],
        isNested: true,
      });

      const aboutMatch = router.match('/about');
      expect(aboutMatch).toBeDefined();
      expect(aboutMatch!.path).toBe('/about');
      expect(aboutMatch!.params).toEqual({});

      const userMatch = router.match('/user/123');
      expect(userMatch).toBeDefined();
      expect(userMatch!.path).toBe('/user/123');
      expect(userMatch!.params).toEqual({ id: '123' });
    });
  });
});
