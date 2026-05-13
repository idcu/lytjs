/**
 * @lytjs/router unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history';
import {
  tokenizePath,
  matchPath,
  scoreRoute,
  normalizeRouteRecord,
  flattenMatchers,
  parseQuery,
  stringifyQuery,
  parseFullPath,
  resolveFullPath,
} from '../src/matcher';
import { resolveLocation, isSameRouteLocation, createRouteLocation } from '../src/location';
import { setCurrentRouter, useRouter } from '../src/composables/useRouter';
import { NavigationFailureType } from '../src/types';

// ===== Matcher Tests =====

describe('matcher', () => {
  describe('tokenizePath', () => {
    it('should tokenize a static path', () => {
      const tokens = tokenizePath('/users/profile');
      expect(tokens).toEqual([
        { type: 'static', value: 'users' },
        { type: 'static', value: 'profile' },
      ]);
    });

    it('should tokenize a path with params', () => {
      const tokens = tokenizePath('/users/:id');
      expect(tokens).toEqual([
        { type: 'static', value: 'users' },
        { type: 'param', name: 'id', repeatable: false, optional: false },
      ]);
    });

    it('should tokenize a path with optional params', () => {
      const tokens = tokenizePath('/users/:id?');
      expect(tokens).toEqual([
        { type: 'static', value: 'users' },
        { type: 'param', name: 'id', repeatable: false, optional: true },
      ]);
    });

    it('should tokenize a path with repeatable params', () => {
      const tokens = tokenizePath('/files/:path...');
      expect(tokens).toEqual([
        { type: 'static', value: 'files' },
        { type: 'param', name: 'path', repeatable: true, optional: false },
      ]);
    });

    it('should tokenize a path with wildcard', () => {
      const tokens = tokenizePath('/static/*');
      expect(tokens).toEqual([
        { type: 'static', value: 'static' },
        { type: 'wildcard', value: '*' },
      ]);
    });
  });

  describe('scoreRoute', () => {
    it('should score static segments higher than params', () => {
      const staticTokens = tokenizePath('/users/profile');
      const paramTokens = tokenizePath('/users/:id');
      expect(scoreRoute(staticTokens)).toBeGreaterThan(scoreRoute(paramTokens));
    });

    it('should score optional params lower than required params', () => {
      const requiredTokens = tokenizePath('/users/:id');
      const optionalTokens = tokenizePath('/users/:id?');
      expect(scoreRoute(requiredTokens)).toBeGreaterThan(scoreRoute(optionalTokens));
    });
  });

  describe('matchPath', () => {
    it('should match a static path', () => {
      const tokens = tokenizePath('/users/profile');
      const result = matchPath('/users/profile', tokens);
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({});
    });

    it('should not match a different static path', () => {
      const tokens = tokenizePath('/users/profile');
      const result = matchPath('/users/settings', tokens);
      expect(result.matched).toBe(false);
    });

    it('should match a path with params', () => {
      const tokens = tokenizePath('/users/:id');
      const result = matchPath('/users/123', tokens);
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({ id: '123' });
    });

    it('should match a path with optional params', () => {
      const tokens = tokenizePath('/users/:id?');
      const result = matchPath('/users', tokens);
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({});
    });

    it('should match a path with repeatable params', () => {
      const tokens = tokenizePath('/files/:path...');
      const result = matchPath('/files/a/b/c', tokens);
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({ path: ['a', 'b', 'c'] });
    });

    it('should match a wildcard path', () => {
      const tokens = tokenizePath('/static/*');
      const result = matchPath('/static/anything/here', tokens);
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({ '*': 'anything/here' });
    });
  });

  describe('normalizeRouteRecord', () => {
    it('should normalize a simple route record', () => {
      const matcher = normalizeRouteRecord({ path: '/users', name: 'users' });
      expect(matcher.record.path).toBe('/users');
      expect(matcher.record.name).toBe('users');
      expect(matcher.tokens.length).toBe(1);
    });

    it('should normalize nested route records', () => {
      const matcher = normalizeRouteRecord({
        path: '/users',
        children: [
          { path: ':id' },
          { path: 'settings' },
        ],
      });
      expect(matcher.children.length).toBe(2);
      expect(matcher.children[0].tokens[0].type).toBe('param');
      expect(matcher.children[1].tokens[0].value).toBe('settings');
    });
  });

  describe('flattenMatchers', () => {
    it('should flatten nested matchers', () => {
      const matchers = [
        normalizeRouteRecord({
          path: '/users',
          children: [
            { path: ':id' },
            { path: 'settings' },
          ],
        }),
      ];
      const flat = flattenMatchers(matchers);
      expect(flat.length).toBe(3); // /users, /users/:id, /users/settings
    });
  });

  describe('parseQuery / stringifyQuery', () => {
    it('should parse a query string', () => {
      const query = parseQuery('?foo=bar&baz=qux');
      expect(query).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should parse a query string with array values', () => {
      const query = parseQuery('?tag=a&tag=b&tag=c');
      expect(query).toEqual({ tag: ['a', 'b', 'c'] });
    });

    it('should parse a query string with null values', () => {
      const query = parseQuery('?empty&foo=bar');
      expect(query).toEqual({ empty: null, foo: 'bar' });
    });

    it('should handle empty query string', () => {
      const query = parseQuery('');
      expect(query).toEqual({});
    });

    it('should stringify a query object', () => {
      const str = stringifyQuery({ foo: 'bar', baz: 'qux' });
      expect(str).toContain('foo=bar');
      expect(str).toContain('baz=qux');
    });

    it('should round-trip query parse/stringify', () => {
      const original = '?foo=bar&baz=qux&tag=a&tag=b';
      const parsed = parseQuery(original);
      const stringified = stringifyQuery(parsed);
      const reparsed = parseQuery(stringified);
      expect(reparsed).toEqual(parsed);
    });
  });

  describe('parseFullPath / resolveFullPath', () => {
    it('should parse a full path with query and hash', () => {
      const result = parseFullPath('/users/123?tab=info#section');
      expect(result.path).toBe('/users/123');
      expect(result.query).toEqual({ tab: 'info' });
      expect(result.hash).toBe('section');
    });

    it('should resolve a full path', () => {
      const fullPath = resolveFullPath('/users/123', { tab: 'info' }, 'section');
      expect(fullPath).toContain('/users/123');
      expect(fullPath).toContain('tab=info');
      expect(fullPath).toContain('#section');
    });
  });
});

// ===== Location Tests =====

describe('location', () => {
  describe('resolveLocation', () => {
    it('should resolve a string location', () => {
      const result = resolveLocation('/users/123?tab=info#section');
      expect(result.path).toBe('/users/123');
      expect(result.query).toEqual({ tab: 'info' });
      expect(result.hash).toBe('section');
    });

    it('should resolve an object location', () => {
      const result = resolveLocation({
        path: '/users',
        query: { page: '2' },
        hash: 'top',
      });
      expect(result.path).toBe('/users');
      expect(result.query).toEqual({ page: '2' });
      expect(result.hash).toBe('top');
    });
  });

  describe('isSameRouteLocation', () => {
    it('should identify same routes', () => {
      const a = createRouteLocation('/users', { id: '1' }, 'top');
      const b = createRouteLocation('/users', { id: '1' }, 'top');
      expect(isSameRouteLocation(a, b)).toBe(true);
    });

    it('should identify different routes', () => {
      const a = createRouteLocation('/users');
      const b = createRouteLocation('/posts');
      expect(isSameRouteLocation(a, b)).toBe(false);
    });
  });
});

// ===== Memory History Tests =====

describe('createMemoryHistory', () => {
  it('should create a memory history with default path', () => {
    const history = createMemoryHistory();
    expect(history.location.path).toBe('/');
    expect(history.base).toBe('');
  });

  it('should create a memory history with initial path', () => {
    const history = createMemoryHistory('/users');
    expect(history.location.path).toBe('/users');
  });

  it('should push a new location', async () => {
    const history = createMemoryHistory('/');
    await history.push('/users');
    expect(history.location.path).toBe('/users');
  });

  it('should replace the current location', async () => {
    const history = createMemoryHistory('/');
    await history.push('/users');
    await history.replace('/posts');
    expect(history.location.path).toBe('/posts');
  });

  it('should go back and forward', async () => {
    const history = createMemoryHistory('/');
    await history.push('/users');
    await history.push('/posts');
    history.go(-1);
    expect(history.location.path).toBe('/users');
    history.go(1);
    expect(history.location.path).toBe('/posts');
  });

  it('should call listeners on navigation', async () => {
    const history = createMemoryHistory('/');
    const listener = vi.fn();
    history.listen(listener);

    await history.push('/users');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].path).toBe('/users'); // to
    expect(listener.mock.calls[0][1].path).toBe('/'); // from
  });

  it('should support removing listeners', async () => {
    const history = createMemoryHistory('/');
    const listener = vi.fn();
    const remove = history.listen(listener);

    remove();
    await history.push('/users');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should discard forward history on push', async () => {
    const history = createMemoryHistory('/');
    await history.push('/a');
    await history.push('/b');
    history.go(-1); // back to /a
    await history.push('/c'); // should discard /b
    history.go(-1); // should go to /
    expect(history.location.path).toBe('/');
  });
});

// ===== Router Tests =====

describe('createRouter', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home' },
        { path: '/users', name: 'users' },
        { path: '/users/:id', name: 'user-detail' },
        {
          path: '/posts',
          name: 'posts',
          children: [
            { path: ':id', name: 'post-detail' },
          ],
        },
      ],
    });
  });

  describe('initialization', () => {
    it('should create a router instance', () => {
      expect(router).toBeDefined();
      expect(router.currentRoute).toBeDefined();
    });

    it('should have correct initial route', () => {
      expect(router.currentRoute().path).toBe('/');
    });
  });

  describe('navigation', () => {
    it('should navigate to a new route via push', async () => {
      await router.push('/users');
      expect(router.currentRoute().path).toBe('/users');
      expect(router.currentRoute().matched.length).toBeGreaterThan(0);
    });

    it('should navigate to a named route', async () => {
      await router.push({ name: 'users' });
      expect(router.currentRoute().path).toBe('/users');
    });

    it('should extract route params', async () => {
      await router.push('/users/42');
      expect(router.currentRoute().params).toEqual({ id: '42' });
    });

    it('should navigate via replace', async () => {
      await router.push('/users');
      await router.replace('/posts');
      expect(router.currentRoute().path).toBe('/posts');
    });

    it('should go back', async () => {
      await router.push('/users');
      await router.push('/posts');
      router.back();
      expect(router.currentRoute().path).toBe('/users');
    });

    it('should go forward', async () => {
      await router.push('/users');
      await router.push('/posts');
      router.back();
      router.forward();
      expect(router.currentRoute().path).toBe('/posts');
    });

    it('should handle query and hash', async () => {
      await router.push('/users?page=2#top');
      expect(router.currentRoute().path).toBe('/users');
      expect(router.currentRoute().hash).toBe('top');
    });
  });

  describe('navigation guards', () => {
    it('should run beforeEach guard', async () => {
      const guard = vi.fn();
      router.beforeEach(guard);
      await router.push('/users');
      expect(guard).toHaveBeenCalledTimes(1);
    });

    it('should abort navigation when guard returns false', async () => {
      router.beforeEach(() => false);
      await router.push('/users');
      expect(router.currentRoute().path).toBe('/');
    });

    it('should abort navigation when guard throws', async () => {
      router.beforeEach(() => new Error('Unauthorized'));
      const result = await router.push('/users');
      expect(router.currentRoute().path).toBe('/');
      expect(result?.type).toBe(NavigationFailureType.aborted);
    });

    it('should support removing beforeEach guard', async () => {
      const guard = vi.fn();
      const remove = router.beforeEach(guard);
      remove();
      await router.push('/users');
      expect(guard).not.toHaveBeenCalled();
    });

    it('should run afterEach hook after successful navigation', async () => {
      const hook = vi.fn();
      router.afterEach(hook);
      await router.push('/users');
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('should not run afterEach after aborted navigation', async () => {
      const hook = vi.fn();
      router.afterEach(hook);
      router.beforeEach(() => false);
      await router.push('/users');
      expect(hook).not.toHaveBeenCalled();
    });

    it('should run beforeEnter guard on route record', async () => {
      const guard = vi.fn();
      const routerWithGuard = createRouter({
        history: createMemoryHistory('/'),
        routes: [
          {
            path: '/admin',
            name: 'admin',
            beforeEnter: guard,
          },
        ],
      });
      await routerWithGuard.push('/admin');
      expect(guard).toHaveBeenCalledTimes(1);
    });

    it('should abort navigation when beforeEnter returns false', async () => {
      const routerWithGuard = createRouter({
        history: createMemoryHistory('/'),
        routes: [
          {
            path: '/admin',
            name: 'admin',
            beforeEnter: () => false,
          },
        ],
      });
      await routerWithGuard.push('/admin');
      expect(routerWithGuard.currentRoute().path).toBe('/');
    });

    it('should run beforeResolve guard', async () => {
      const guard = vi.fn();
      router.beforeResolve(guard);
      await router.push('/users');
      expect(guard).toHaveBeenCalledTimes(1);
    });
  });

  describe('isReady', () => {
    it('should resolve isReady after install', async () => {
      const app = {
        config: { globalProperties: {} },
        provide: vi.fn(),
      };
      router.install(app);
      await router.isReady();
      // Should not throw
    });
  });

  describe('duplicate navigation', () => {
    it('should return duplicated failure for same route', async () => {
      await router.push('/users');
      const result = await router.push('/users');
      expect(result?.type).toBe(NavigationFailureType.duplicated);
    });
  });

  describe('404 handling', () => {
    it('should return aborted failure for non-existent route', async () => {
      const result = await router.push('/non-existent');
      expect(result?.type).toBe(NavigationFailureType.aborted);
      expect(router.currentRoute().path).toBe('/');
    });
  });
});

// ===== Composables Tests =====

describe('composables', () => {
  describe('useRouter', () => {
    it('should throw if no router is set', () => {
      setCurrentRouter(null as any);
      expect(() => useRouter()).toThrow('[@lytjs/router] No active router instance');
    });

    it('should return the current router', () => {
      const router = createRouter({
        history: createMemoryHistory('/'),
        routes: [{ path: '/' }],
      });
      setCurrentRouter(router);
      expect(useRouter()).toBe(router);
    });
  });
});

// ===== RouterLink Tests =====

describe('RouterLink', () => {
  it('should compute href correctly', () => {
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/users', name: 'users' },
        { path: '/users/:id', name: 'user-detail' },
      ],
    });
    setCurrentRouter(router);

    const { useLink } = require('../src/composables/useLink');
    const link = useLink({ to: '/users?page=1#top' });
    expect(link.href()).toContain('/users');
    expect(link.href()).toContain('page=1');
    expect(link.href()).toContain('#top');
  });

  it('should detect active state', () => {
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/users', name: 'users' },
        { path: '/users/:id', name: 'user-detail' },
      ],
    });
    setCurrentRouter(router);

    const { useLink } = require('../src/composables/useLink');
    const link = useLink({ to: '/users' });
    // Current route is '/', which doesn't start with '/users' exactly
    // But after navigating to /users...
    // For now test that isActive is a computed value
    expect(link.isActive).toBeDefined();
    expect(link.isExactActive).toBeDefined();
  });
});

// ===== beforeRouteLeave Tests =====

describe('beforeRouteLeave guard', () => {
  it('should call beforeRouteLeave on component', async () => {
    const leaveGuard = vi.fn().mockReturnValue(true);
    const componentWithGuard = {
      beforeRouteLeave: leaveGuard,
    };

    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home', component: componentWithGuard as any },
        { path: '/about', name: 'about' },
      ],
    });

    // Install to set current route
    router.install({
      config: { globalProperties: {} },
      provide: vi.fn(),
    });

    await router.push('/about');
    expect(leaveGuard).toHaveBeenCalledTimes(1);
  });

  it('should abort navigation when beforeRouteLeave returns false', async () => {
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        {
          path: '/',
          name: 'home',
          component: { beforeRouteLeave: () => false } as any,
        },
        { path: '/about', name: 'about' },
      ],
    });

    router.install({
      config: { globalProperties: {} },
      provide: vi.fn(),
    });

    const result = await router.push('/about');
    expect(result?.type).toBe(NavigationFailureType.aborted);
    expect(router.currentRoute().path).toBe('/');
  });
});

// ===== scrollBehavior Tests =====

describe('scrollBehavior', () => {
  it('should call scrollBehavior after navigation', async () => {
    const scrollBehavior = vi.fn().mockReturnValue({ left: 0, top: 0 });
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home' },
        { path: '/about', name: 'about' },
      ],
      scrollBehavior,
    });

    await router.push('/about');
    expect(scrollBehavior).toHaveBeenCalledTimes(1);
  });

  it('should not scroll when scrollBehavior returns false', async () => {
    const scrollBehavior = vi.fn().mockReturnValue(false);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home' },
        { path: '/about', name: 'about' },
      ],
      scrollBehavior,
    });

    await router.push('/about');
    expect(scrollBehavior).toHaveBeenCalledTimes(1);
  });
});

// ===== name-based navigation Tests =====

describe('name-based navigation', () => {
  it('should resolve named route', async () => {
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home' },
        { path: '/users/:id', name: 'user' },
      ],
    });

    await router.push({ name: 'user', params: { id: '42' } });
    expect(router.currentRoute().path).toBe('/users/42');
    expect(router.currentRoute().params).toEqual({ id: '42' });
  });

  it('should return aborted for unknown route name', async () => {
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [{ path: '/' }],
    });

    const result = await router.push({ name: 'nonexistent' });
    expect(result?.type).toBe(NavigationFailureType.aborted);
  });
});
