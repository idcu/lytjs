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
  subscribeStore,
  unsubscribeStore,
  onStoreChange,
  registerRouter,
  unregisterRouter,
  isRouterRegistered,
  getCurrentRoute,
  watchRouteChanges,
  unwatchRouteChanges,
  getRouteHistory,
  clearRouteHistory,
  getComponentTree,
  registerRootComponent,
  unregisterRootComponent,
  registerSignal,
  unregisterSignal,
  getSignalNodes,
  getSignalNode,
  getDependencyGraph,
  createSnapshot,
  getSnapshots,
  getTimeTravelState,
  restoreSnapshot,
  clearSnapshots,
  getPerformanceStats,
  getPerformanceRecords,
  clearPerformanceRecords,
  runBenchmark,
  runAsyncBenchmark,
  getBenchmarkResults,
  getLatestBenchmarkResult,
  clearBenchmarkResults,
  compareBenchmarkResults,
  createRegressionDetector,
  LARGE_SCALE_SCENARIOS,
  getMemoryUsage,
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

  describe('subscribeStore / unsubscribeStore', () => {
    it('should return false for unregistered store', () => {
      expect(subscribeStore('nonexistent')).toBe(false);
    });

    it('should return false for store without $subscribe', () => {
      registerStore('plain', { count: 1 });
      expect(subscribeStore('plain')).toBe(false);
    });

    it('should subscribe to store with $subscribe', () => {
      let subscribed = false;
      const mockUnsubscribe = vi.fn();
      const store = {
        count: 0,
        $subscribe: vi.fn((cb: any) => {
          subscribed = true;
          return mockUnsubscribe;
        }),
      };
      registerStore('sub', store);
      const result = subscribeStore('sub');

      expect(result).toBe(true);
      expect(store.$subscribe).toHaveBeenCalled();
      expect(subscribed).toBe(true);
    });

    it('should unsubscribe from store', () => {
      const mockUnsubscribe = vi.fn();
      const store = {
        count: 0,
        $subscribe: vi.fn(() => mockUnsubscribe),
      };
      registerStore('sub2', store);
      subscribeStore('sub2');
      unsubscribeStore('sub2');

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should re-subscribe if already subscribed', () => {
      const mockUnsubscribe1 = vi.fn();
      const mockUnsubscribe2 = vi.fn();
      let callCount = 0;
      const store = {
        count: 0,
        $subscribe: vi.fn(() => {
          callCount++;
          return callCount === 1 ? mockUnsubscribe1 : mockUnsubscribe2;
        }),
      };
      registerStore('resub', store);
      subscribeStore('resub');
      subscribeStore('resub');

      // 第一次订阅的 unsubscribe 应该被调用
      expect(mockUnsubscribe1).toHaveBeenCalled();
      // $subscribe 应该被调用两次
      expect(store.$subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('onStoreChange', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = onStoreChange(callback);

      expect(typeof unsubscribe).toBe('function');

      // 取消注册后回调不应再被触发
      unsubscribe();
    });

    it('should trigger callback when subscribed store changes', () => {
      let subscribeCallback: any = null;
      const store = {
        count: 0,
        $state: { count: 0 },
        $subscribe: vi.fn((cb: any) => {
          subscribeCallback = cb;
          return vi.fn();
        }),
      };
      registerStore('changeStore', store);

      const callback = vi.fn();
      onStoreChange(callback);
      subscribeStore('changeStore');

      // 模拟 Store 变更
      if (subscribeCallback) {
        subscribeCallback({}, { count: 42 });
      }

      expect(callback).toHaveBeenCalledWith('changeStore', { count: 42 });
    });

    it('should not trigger callback after unsubscribing', () => {
      let subscribeCallback: any = null;
      const store = {
        count: 0,
        $state: { count: 0 },
        $subscribe: vi.fn((cb: any) => {
          subscribeCallback = cb;
          return vi.fn();
        }),
      };
      registerStore('unsubStore', store);

      const callback = vi.fn();
      const unsubscribe = onStoreChange(callback);
      subscribeStore('unsubStore');

      // 取消回调注册
      unsubscribe();

      // 模拟 Store 变更
      if (subscribeCallback) {
        subscribeCallback({}, { count: 99 });
      }

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Route Inspector', () => {
  beforeEach(() => {
    unregisterRouter();
    clearRouteHistory();
  });

  afterEach(() => {
    unregisterRouter();
    clearRouteHistory();
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

  describe('watchRouteChanges / unwatchRouteChanges', () => {
    it('should return false when router not registered', () => {
      expect(watchRouteChanges()).toBe(false);
    });

    it('should return false when router has no afterEach', () => {
      registerRouter({ currentRoute: () => ({}) });
      expect(watchRouteChanges()).toBe(false);
    });

    it('should watch route changes with afterEach', () => {
      const afterEachCallbacks: any[] = [];
      const mockRouter = {
        currentRoute: () => ({ path: '/', name: null }),
        afterEach: vi.fn((cb: any) => {
          afterEachCallbacks.push(cb);
        }),
      };
      registerRouter(mockRouter);

      const result = watchRouteChanges();
      expect(result).toBe(true);
      expect(mockRouter.afterEach).toHaveBeenCalled();
    });

    it('should record route history on navigation', () => {
      const afterEachCallbacks: any[] = [];
      const mockRouter = {
        currentRoute: () => ({ path: '/', name: null }),
        afterEach: vi.fn((cb: any) => {
          afterEachCallbacks.push(cb);
        }),
      };
      registerRouter(mockRouter);
      watchRouteChanges();

      // 模拟导航到 /home
      afterEachCallbacks[0]({
        path: '/home',
        name: 'home',
        params: { id: '1' },
        query: { tab: 'overview' },
        matched: [{ path: '/home', name: 'home' }],
      });

      // 模拟导航到 /about
      afterEachCallbacks[0]({
        path: '/about',
        name: 'about',
        params: {},
        query: {},
        matched: [{ path: '/about', name: 'about' }],
      });

      const history = getRouteHistory();
      expect(history).toHaveLength(2);
      expect(history[0].path).toBe('/home');
      expect(history[0].name).toBe('home');
      expect(history[1].path).toBe('/about');
    });

    it('should unwatch route changes', () => {
      const mockRouter = {
        currentRoute: () => ({ path: '/', name: null }),
        afterEach: vi.fn(),
      };
      registerRouter(mockRouter);
      watchRouteChanges();
      unwatchRouteChanges();

      // 重新监听应该再次调用 afterEach
      watchRouteChanges();
      expect(mockRouter.afterEach).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRouteHistory', () => {
    it('should return empty array initially', () => {
      expect(getRouteHistory()).toEqual([]);
    });

    it('should return copy of history (not reference)', () => {
      const history1 = getRouteHistory();
      const history2 = getRouteHistory();
      expect(history1).not.toBe(history2);
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

describe('信号检查器', () => {
  beforeEach(() => {
    clearSnapshots();
    clearSignalRegistry();
  });

  describe('registerSignal', () => {
    it('应该注册信号', () => {
      const mockSignal = { value: 0 };
      registerSignal(mockSignal as any, 'count', 'signal');
      
      const signals = getSignalNodes();
      expect(signals).toHaveLength(1);
      expect(signals[0].name).toBe('count');
      expect(signals[0].type).toBe('signal');
    });
  });

  describe('getSignalNodes', () => {
    it('应该返回所有信号节点', () => {
      registerSignal({ value: 0 } as any, 'count', 'signal');
      registerSignal({ value: '' } as any, 'name', 'signal');
      
      const nodes = getSignalNodes();
      expect(nodes).toHaveLength(2);
    });

    it('应该返回空数组当没有信号注册时', () => {
      const nodes = getSignalNodes();
      expect(nodes).toEqual([]);
    });
  });

  describe('快照功能', () => {
    it('应该创建快照', () => {
      registerSignal({ value: 42 } as any, 'count', 'signal');
      
      const snapshotId = createSnapshot('test-snapshot');
      
      expect(snapshotId).toBeDefined();
      expect(typeof snapshotId).toBe('string');
    });

    it('应该获取所有快照', () => {
      registerSignal({ value: 0 } as any, 'count', 'signal');
      
      createSnapshot('snapshot-1');
      createSnapshot('snapshot-2');
      
      const snapshots = getSnapshots();
      expect(snapshots).toHaveLength(2);
    });

    it('应该清除所有快照', () => {
      registerSignal({ value: 0 } as any, 'count', 'signal');
      
      createSnapshot('to-be-cleared');
      clearSnapshots();
      
      const snapshots = getSnapshots();
      expect(snapshots).toHaveLength(0);
    });

    it('应该获取时间旅行状态', () => {
      registerSignal({ value: 0 } as any, 'count', 'signal');
      
      createSnapshot('snapshot-1');
      createSnapshot('snapshot-2');
      
      const state = getTimeTravelState();
      expect(state.snapshots).toHaveLength(2);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });
  });

  describe('依赖图', () => {
    it('应该返回依赖图', () => {
      registerSignal({ value: 0 } as any, 'count', 'signal');
      
      const graph = getDependencyGraph();
      expect(graph).toBeDefined();
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
    });
  });
});

describe('性能监控', () => {
  beforeEach(() => {
    clearPerformanceRecords();
  });

  describe('getPerformanceStats', () => {
    it('应该返回性能统计信息', () => {
      const stats = getPerformanceStats();
      expect(stats).toBeDefined();
      expect(stats.totalRecords).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('getPerformanceRecords', () => {
    it('应该返回性能记录数组', () => {
      const records = getPerformanceRecords();
      expect(Array.isArray(records)).toBe(true);
    });
  });

  describe('clearPerformanceRecords', () => {
    it('应该清除所有性能记录', () => {
      clearPerformanceRecords();
      const records = getPerformanceRecords();
      expect(records).toHaveLength(0);
    });
  });
});

describe('基准测试', () => {
  beforeEach(() => {
    clearBenchmarkResults();
  });

  describe('runBenchmark', () => {
    it('应该运行同步基准测试', () => {
      const result = runBenchmark({
        name: 'test-benchmark',
        iterations: 10,
        warmup: 2,
        fn: () => {
          let sum = 0;
          for (let i = 0; i < 100; i++) {
            sum += i;
          }
        },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('test-benchmark');
      expect(result.iterations).toBe(10);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
      expect(result.averageDuration).toBeGreaterThanOrEqual(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('runAsyncBenchmark', () => {
    it('应该运行异步基准测试', async () => {
      const result = await runAsyncBenchmark({
        name: 'async-benchmark',
        iterations: 5,
        warmup: 1,
        asyncFn: async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
        },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('async-benchmark');
      expect(result.iterations).toBe(5);
    });
  });

  describe('getBenchmarkResults', () => {
    it('应该获取所有基准测试结果', () => {
      runBenchmark({
        name: 'result-test',
        iterations: 5,
        fn: () => {},
      });

      const results = getBenchmarkResults();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('result-test');
    });

    it('应该按名称筛选基准测试结果', () => {
      runBenchmark({ name: 'test-1', iterations: 5, fn: () => {} });
      runBenchmark({ name: 'test-2', iterations: 5, fn: () => {} });

      const results = getBenchmarkResults('test-1');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test-1');
    });
  });

  describe('getLatestBenchmarkResult', () => {
    it('应该获取最新的基准测试结果', () => {
      runBenchmark({ name: 'latest-test', iterations: 5, fn: () => {} });
      
      const latest = getLatestBenchmarkResult('latest-test');
      expect(latest).toBeDefined();
      expect(latest?.name).toBe('latest-test');
    });

    it('应该返回 undefined 当没有结果时', () => {
      const latest = getLatestBenchmarkResult('non-existent');
      expect(latest).toBeUndefined();
    });
  });

  describe('compareBenchmarkResults', () => {
    it('应该比较两个基准测试结果', () => {
      const result1 = runBenchmark({ 
        name: 'compare-test', 
        iterations: 10, 
        fn: () => {} 
      });
      
      const result2 = runBenchmark({ 
        name: 'compare-test', 
        iterations: 10, 
        fn: () => {} 
      });

      const comparison = compareBenchmarkResults(result1, result2);
      expect(comparison).toBeDefined();
      expect(comparison.durationDiff).toBeDefined();
      expect(comparison.improved).toBeDefined();
    });
  });

  describe('clearBenchmarkResults', () => {
    it('应该清除所有基准测试结果', () => {
      runBenchmark({ name: 'clear-test', iterations: 5, fn: () => {} });
      
      clearBenchmarkResults();
      
      const results = getBenchmarkResults();
      expect(results).toHaveLength(0);
    });

    it('应该按名称清除基准测试结果', () => {
      runBenchmark({ name: 'keep-this', iterations: 5, fn: () => {} });
      runBenchmark({ name: 'clear-this', iterations: 5, fn: () => {} });
      
      clearBenchmarkResults('clear-this');
      
      const keepResults = getBenchmarkResults('keep-this');
      const clearResults = getBenchmarkResults('clear-this');
      
      expect(keepResults).toHaveLength(1);
      expect(clearResults).toHaveLength(0);
    });
  });

  describe('createRegressionDetector', () => {
    it('应该创建性能回归检测器', () => {
      const detector = createRegressionDetector(0.1);
      
      expect(detector).toBeDefined();
      expect(typeof detector.addResult).toBe('function');
      expect(typeof detector.getHistory).toBe('function');
      expect(typeof detector.clear).toBe('function');
    });
  });

  describe('LARGE_SCALE_SCENARIOS', () => {
    it('应该提供预定义的大规模测试场景', () => {
      expect(Array.isArray(LARGE_SCALE_SCENARIOS)).toBe(true);
      expect(LARGE_SCALE_SCENARIOS.length).toBeGreaterThan(0);
      
      LARGE_SCALE_SCENARIOS.forEach(scenario => {
        expect(typeof scenario.name).toBe('string');
        expect(typeof scenario.nodeCount).toBe('number');
        expect(typeof scenario.description).toBe('string');
      });
    });
  });
});

// 辅助函数 - 清除信号注册表（用于测试）
function clearSignalRegistry() {
  const signals = getSignalNodes();
  signals.forEach(signal => {
    unregisterSignal(signal.name);
  });
}
