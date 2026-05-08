/**
 * @lytjs/router unit tests
 */

import { describe, it, expect } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history';

describe('@lytjs/router', () => {
  describe('createRouter', () => {
    it('should create a router instance', () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/' }],
      });
      expect(router).toBeDefined();
      expect(router.currentRoute).toBeDefined();
    });

    it('should have correct initial route', () => {
      const router = createRouter({
        history: createMemoryHistory('/'),
        routes: [{ path: '/', name: 'home' }],
      });
      expect(router.currentRoute.value.path).toBe('/');
    });
  });

  describe('createMemoryHistory', () => {
    it('should create a memory history instance', () => {
      const history = createMemoryHistory();
      expect(history).toBeDefined();
      expect(history.base).toBe('');
    });

    it('should track navigation entries', () => {
      const history = createMemoryHistory('/');
      expect(history.location.path).toBe('/');
    });
  });

  describe('navigation guards', () => {
    it('should register and remove beforeEach guard', () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/' }],
      });
      const guard = () => {};
      const remove = router.beforeEach(guard);
      remove();
      // Guard should be removed
    });
  });
});
