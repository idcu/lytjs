/**
 * @lytjs/devtools 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installDevTools,
  getDevTools,
  uninstallDevTools,
  registerStore,
  unregisterStore,
  getStoreStates,
  getStoreState,
  getRegisteredStoreIds,
  clearStoreRegistry,
  registerRouter,
  unregisterRouter,
  isRouterRegistered,
  getCurrentRoute,
  getComponentTree,
  registerRootComponent,
  unregisterRootComponent,
} from '../src/index';

// Mock document for DevTools tests
const mockDocument = {
  getElementById: vi.fn(() => null),
  createElement: vi.fn(() => ({
    style: {},
    appendChild: vi.fn(),
    remove: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  })),
  body: {
    appendChild: vi.fn(),
  },
};

describe('DevTools', () => {
  beforeEach(() => {
    // Reset global state
    uninstallDevTools();
    clearStoreRegistry();
    unregisterRouter();
    unregisterRootComponent();
  });

  afterEach(() => {
    uninstallDevTools();
    clearStoreRegistry();
    unregisterRouter();
    unregisterRootComponent();
  });

  describe('installDevTools', () => {
    it('should install devtools', () => {
      const devtools = installDevTools({ enabled: false });
      expect(devtools).toBeDefined();
      expect(getDevTools()).toBe(devtools);
    });

    it('should return existing instance if already installed', () => {
      const devtools1 = installDevTools({ enabled: false });
      const devtools2 = installDevTools({ enabled: false });
      expect(devtools1).toBe(devtools2);
    });
  });

  describe('getDevTools', () => {
    it('should return null if not installed', () => {
      // Ensure devtools is not installed
      uninstallDevTools();
      expect(getDevTools()).toBeNull();
    });

    it('should return devtools instance after installation', () => {
      installDevTools({ enabled: false });
      expect(getDevTools()).toBeDefined();
    });
  });

  describe('uninstallDevTools', () => {
    it('should uninstall devtools', () => {
      installDevTools({ enabled: false });
      expect(getDevTools()).not.toBeNull();
      uninstallDevTools();
      expect(getDevTools()).toBeNull();
    });
  });
});

describe('Store Inspector', () => {
  beforeEach(() => {
    clearStoreRegistry();
  });

  afterEach(() => {
    clearStoreRegistry();
  });

  describe('registerStore', () => {
    it('should register a store', () => {
      const store = { count: 0, $id: 'test' };
      registerStore('test', store);
      expect(getRegisteredStoreIds()).toContain('test');
    });
  });

  describe('getStoreStates', () => {
    it('should return empty array when no stores registered', () => {
      expect(getStoreStates()).toEqual([]);
    });

    it('should return registered store states', () => {
      const store = { count: 42, $id: 'counter' };
      registerStore('counter', store);
      
      const states = getStoreStates();
      expect(states).toHaveLength(1);
      expect(states[0].id).toBe('counter');
      expect(states[0].state.count).toBe(42);
    });
  });

  describe('getStoreState', () => {
    it('should return null for unregistered store', () => {
      expect(getStoreState('nonexistent')).toBeNull();
    });

    it('should return state for registered store', () => {
      const store = { value: 'test' };
      registerStore('myStore', store);
      
      const state = getStoreState('myStore');
      expect(state).not.toBeNull();
      expect(state?.state.value).toBe('test');
    });
  });

  describe('unregisterStore', () => {
    it('should unregister a store', () => {
      registerStore('temp', { count: 0 });
      unregisterStore('temp');
      expect(getRegisteredStoreIds()).not.toContain('temp');
    });
  });

  describe('clearStoreRegistry', () => {
    it('should clear all registered stores', () => {
      registerStore('store1', { count: 1 });
      registerStore('store2', { count: 2 });
      clearStoreRegistry();
      expect(getRegisteredStoreIds()).toHaveLength(0);
    });
  });
});

describe('Route Inspector', () => {
  beforeEach(() => {
    unregisterRouter();
  });

  afterEach(() => {
    unregisterRouter();
  });

  describe('registerRouter', () => {
    it('should register a router', () => {
      const mockRouter = {
        currentRoute: () => ({ path: '/', name: null }),
      };
      registerRouter(mockRouter);
      expect(isRouterRegistered()).toBe(true);
    });
  });

  describe('getCurrentRoute', () => {
    it('should return null when router not registered', () => {
      expect(getCurrentRoute()).toBeNull();
    });

    it('should return current route', () => {
      const mockRouter = {
        currentRoute: () => ({
          path: '/home',
          name: 'home',
          params: {},
          query: {},
          matched: [{ path: '/home', name: 'home' }],
        }),
      };
      registerRouter(mockRouter);
      
      const route = getCurrentRoute();
      expect(route).not.toBeNull();
      expect(route?.path).toBe('/home');
      expect(route?.name).toBe('home');
    });
  });

  describe('isRouterRegistered', () => {
    it('should return false when router not registered', () => {
      expect(isRouterRegistered()).toBe(false);
    });

    it('should return true when router registered', () => {
      registerRouter({ currentRoute: () => ({}) });
      expect(isRouterRegistered()).toBe(true);
    });
  });
});

describe('Component Tree', () => {
  beforeEach(() => {
    unregisterRootComponent();
  });

  afterEach(() => {
    unregisterRootComponent();
  });

  describe('getComponentTree', () => {
    it('should return empty array when no root component', () => {
      expect(getComponentTree()).toEqual([]);
    });

    it('should return component tree', () => {
      const mockComponent = {
        name: 'App',
        props: { title: 'Test' },
        children: [
          { name: 'Header', props: {} },
          { name: 'Content', props: { text: 'Hello' } },
        ],
      };
      registerRootComponent(mockComponent);
      
      const tree = getComponentTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('App');
      expect(tree[0].children).toHaveLength(2);
    });
  });

  describe('registerRootComponent', () => {
    it('should register root component', () => {
      const component = { name: 'Root' };
      registerRootComponent(component);
      expect(getComponentTree()).toHaveLength(1);
    });
  });

  describe('unregisterRootComponent', () => {
    it('should unregister root component', () => {
      registerRootComponent({ name: 'Root' });
      unregisterRootComponent();
      expect(getComponentTree()).toHaveLength(0);
    });
  });
});
