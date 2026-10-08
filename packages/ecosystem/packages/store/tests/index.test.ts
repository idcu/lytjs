/**
 * @lytjs/store unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineStore, clearStoreCache } from '../src/defineStore';
import { createPinia, getActivePinia, setActivePinia } from '../src/pinia';
import { storeToRefs } from '../src/storeToRefs';
import { ref, computed, isRef } from '@lytjs/reactivity';

describe('@lytjs/store', () => {
  // Clear store cache before each test
  beforeEach(() => {
    clearStoreCache();
    setActivePinia(null);
  });

  describe('createPinia', () => {
    it('should create a pinia instance', () => {
      const pinia = createPinia();
      expect(pinia).toBeDefined();
      expect(pinia.state).toBeDefined();
    });

    it('should install pinia to an app', () => {
      const pinia = createPinia();
      const app = {
        provide: vi.fn(),
        config: { globalProperties: {} },
      };
      pinia.install(app);
      expect(app.provide).toHaveBeenCalledWith('__lytjs_pinia__', pinia);
      expect(app.config.globalProperties.$pinia).toBe(pinia);
    });

    it('should set active pinia on install', () => {
      const pinia = createPinia();
      const app = { provide: vi.fn() };
      pinia.install(app);
      expect(getActivePinia()).toBe(pinia);
    });

    it('should support plugins', () => {
      const pinia = createPinia();
      const plugin = { install: vi.fn() };
      pinia.use(plugin);
      expect(plugin.install).toHaveBeenCalledWith(pinia);
    });
  });

  describe('defineStore (options)', () => {
    it('should create a store definition', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      expect(useCounter).toBeDefined();
      expect(typeof useCounter).toBe('function');
    });

    it('should initialize state correctly', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      expect(store.$id).toBe('counter');
      expect(store.count).toBe(0);
    });

    it('should return the same store instance (singleton)', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store1 = useCounter();
      const store2 = useCounter();
      expect(store1).toBe(store2);
    });

    it('should support getters', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
        getters: {
          doubleCount() {
            return this.count * 2;
          },
        },
      });
      const store = useCounter();
      expect(store.doubleCount).toBe(0);
      store.count = 5;
      expect(store.doubleCount).toBe(10);
    });

    it('should support actions', async () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
        actions: {
          increment() {
            this.count++;
          },
          incrementBy(n: number) {
            this.count += n;
          },
          async asyncIncrement() {
            await new Promise((resolve) => setTimeout(resolve, 10));
            this.count++;
          },
        },
      });
      const store = useCounter();
      store.increment();
      expect(store.count).toBe(1);
      store.incrementBy(5);
      expect(store.count).toBe(6);
      await store.asyncIncrement();
      expect(store.count).toBe(7);
    });

    it('should support $patch with object', () => {
      const useStore = defineStore('test', {
        state: () => ({ a: 1, b: 2 }),
      });
      const store = useStore();
      store.$patch({ a: 10 });
      expect(store.a).toBe(10);
      expect(store.b).toBe(2);
    });

    it('should support $patch with function', () => {
      const useStore = defineStore('test', {
        state: () => ({ a: 1, b: 2 }),
      });
      const store = useStore();
      store.$patch((state) => {
        state.a = 100;
        state.b = 200;
      });
      expect(store.a).toBe(100);
      expect(store.b).toBe(200);
    });

    it('should support $reset', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      store.count = 100;
      expect(store.count).toBe(100);
      store.$reset();
      expect(store.count).toBe(0);
    });

    it('should support $subscribe', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      const callback = vi.fn();
      const unsubscribe = store.$subscribe(callback);

      store.count = 5;
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].storeId).toBe('counter');

      unsubscribe();
      store.count = 10;
      // Should not be called again after unsubscribe
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support $onAction', async () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
        actions: {
          increment() {
            this.count++;
          },
        },
      });
      const store = useCounter();
      const callback = vi.fn();
      const unsubscribe = store.$onAction(callback);

      store.increment();
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].name).toBe('increment');

      unsubscribe();
      store.increment();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call after callback in $onAction', async () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
        actions: {
          increment() {
            this.count++;
            return this.count;
          },
        },
      });
      const store = useCounter();
      let afterValue: number | undefined;
      store.$onAction((context) => {
        context.after = (result: any) => {
          afterValue = result;
        };
      });

      store.increment();
      expect(afterValue).toBe(1);
    });

    it('should call onError callback when action throws', async () => {
      const useStore = defineStore('test', {
        state: () => ({ value: 0 }),
        actions: {
          failingAction() {
            throw new Error('test error');
          },
        },
      });
      const store = useStore();
      let errorCaught: Error | undefined;
      store.$onAction((context) => {
        context.onError = (err: Error) => {
          errorCaught = err;
        };
      });

      try {
        await store.failingAction();
      } catch {
        // Expected
      }
      expect(errorCaught).toBeDefined();
      expect(errorCaught!.message).toBe('test error');
    });

    it('should support $dispose', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      store.$dispose();

      // After dispose, getting a new store should create a fresh instance
      const newStore = useCounter();
      expect(newStore).not.toBe(store);
    });

    it('should register store in pinia state', () => {
      const pinia = createPinia();
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      useCounter(pinia);
      expect(pinia.state.value.counter).toBeDefined();
      expect(pinia.state.value.counter.count).toBe(0);
    });
  });

  describe('defineStore (setup)', () => {
    it('should create a setup store', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        const doubleCount = { value: 0 }; // Simplified for test
        const increment = () => {
          count.value++;
        };
        return { count, doubleCount, increment };
      });
      expect(useCounter).toBeDefined();
    });

    it('should return the same setup store instance', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        return { count };
      });
      const store1 = useCounter();
      const store2 = useCounter();
      expect(store1).toBe(store2);
    });

    it('should work with reactive values in setup store', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        const increment = () => {
          count.value++;
        };
        return { count, increment };
      });
      const store = useCounter();
      expect(store.count.value).toBe(0);
      store.increment();
      expect(store.count.value).toBe(1);
    });

    it('setup store 应自动解包 ref/computed（Pinia 语义）', () => {
      const useCounter = defineStore('unwrap', () => {
        const count = ref(0);
        const items = ref([1, 2, 3]);
        const double = computed(() => count.value * 2);
        function inc() {
          count.value++;
        }
        return { count, items, double, inc };
      });
      const store = useCounter();
      // 外部访问得到值而非 ref
      expect(isRef(store.count)).toBe(false);
      expect(store.count).toBe(0);
      expect(isRef(store.double)).toBe(false);
      expect(store.double).toBe(0);
      // 解包后可直接调用数组方法
      expect(store.items.map((x: number) => x)).toEqual([1, 2, 3]);
      // 直接赋值写穿透到 ref
      store.count = 10;
      expect(store.count).toBe(10);
      expect(store.double).toBe(20);
      // action 内 .value++ 仍驱动响应式
      store.inc();
      expect(store.count).toBe(11);
      expect(store.double).toBe(22);
    });

    it('should support $subscribe in setup store', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        const increment = () => {
          count.value++;
        };
        return { count, increment };
      });
      const store = useCounter();
      const callback = vi.fn();
      const unsubscribe = store.$subscribe(callback);

      store.increment();
      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should support $patch in setup store', () => {
      const useStore = defineStore('test', () => {
        const a = { value: 1 };
        const b = { value: 2 };
        return { a, b };
      });
      const store = useStore();
      store.$patch({ a: 10 });
      expect(store.a).toBe(10);
    });

    it('should support $onAction with after callback in setup store', async () => {
      const useStore = defineStore('test', () => {
        const result = { value: 0 };
        const compute = async () => {
          result.value = 42;
          return result.value;
        };
        return { result, compute };
      });
      const store = useStore();
      let afterCalled = false;
      const unsubscribe = store.$onAction((context) => {
        context.after = (returnValue: any) => {
          afterCalled = true;
          expect(returnValue).toBe(42);
        };
      });

      await store.compute();
      expect(afterCalled).toBe(true);
      unsubscribe();
    });

    it('should support $dispose in setup store', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        return { count };
      });
      const store = useCounter();
      store.$dispose();
      const newStore = useCounter();
      expect(newStore).not.toBe(store);
    });
  });

  describe('storeToRefs', () => {
    it('should extract refs from a store', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0, name: 'test' }),
      });
      const store = useCounter();
      const refs = storeToRefs(store);

      expect(refs.count).toBeDefined();
      expect(refs.name).toBeDefined();
    });

    it('should skip internal properties', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      const refs = storeToRefs(store);

      expect(refs.$id).toBeUndefined();
      expect(refs.$state).toBeUndefined();
      expect(refs.$patch).toBeUndefined();
    });

    it('should maintain reactivity', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      const { count } = storeToRefs(store);

      store.count = 10;
      expect(count.value).toBe(10);
    });
  });

  describe('complex store scenarios', () => {
    it('should handle multiple stores', () => {
      const useUser = defineStore('user', {
        state: () => ({ name: 'John', age: 30 }),
      });
      const useSettings = defineStore('settings', {
        state: () => ({ theme: 'dark' }),
      });

      const user = useUser();
      const settings = useSettings();

      expect(user.name).toBe('John');
      expect(settings.theme).toBe('dark');
    });

    it('should handle getters that depend on other getters', () => {
      const useStore = defineStore('test', {
        state: () => ({ price: 100, quantity: 2 }),
        getters: {
          subtotal() {
            return this.price * this.quantity;
          },
          total() {
            return this.subtotal * 1.1; // 10% tax
          },
        },
      });

      const store = useStore();
      expect(store.subtotal).toBe(200);
      expect(store.total).toBeCloseTo(220, 10);

      store.price = 50;
      expect(store.subtotal).toBe(100);
      expect(store.total).toBeCloseTo(110, 10);
    });

    it('should handle async actions', async () => {
      const useStore = defineStore('test', {
        state: () => ({ loading: false, data: null as string | null }),
        actions: {
          async fetchData() {
            this.loading = true;
            await new Promise((resolve) => setTimeout(resolve, 10));
            this.data = 'fetched';
            this.loading = false;
          },
        },
      });

      const store = useStore();
      expect(store.loading).toBe(false);
      expect(store.data).toBeNull();

      const promise = store.fetchData();
      expect(store.loading).toBe(true);

      await promise;
      expect(store.loading).toBe(false);
      expect(store.data).toBe('fetched');
    });
  });

  // 补测定义在 defineStore 里但此前无用例触达的真实分支（2026-10-09 分支覆盖率补口）
  describe('defineStore · 分支补测', () => {
    it('options：action 应能经 this 读 getter 并调用其他 action', () => {
      const useStore = defineStore('this-ctx', {
        state: () => ({ count: 2 }),
        getters: {
          double() {
            return this.count * 2;
          },
        },
        actions: {
          bump(n: number) {
            this.count += n;
            return this.double;
          },
          bumpTwice() {
            return this.bump(3) + this.double;
          },
        },
      });
      const store = useStore();
      expect(store.bump(1)).toBe(6); // count=3 ⇒ double=6（经 this 读 getter）
      expect(store.bumpTwice()).toBe(24); // count=6 ⇒ 12+12（经 this 调另一 action）
      expect(store.count).toBe(6);
    });

    it('options：$patch(function) 应通知订阅者', () => {
      const useStore = defineStore('patch-fn', { state: () => ({ a: 1 }) });
      const store = useStore();
      const sub = vi.fn();
      store.$subscribe(sub);
      store.$patch((s) => {
        s.a = 100;
      });
      expect(store.a).toBe(100);
      expect(sub).toHaveBeenCalledTimes(1);
      expect(sub.mock.calls[0][0].type).toBe('patch function');
    });

    it('options：$patch(object) 应通知订阅者且忽略未知键', () => {
      const useStore = defineStore('patch-obj', { state: () => ({ a: 1 }) });
      const store = useStore();
      const sub = vi.fn();
      store.$subscribe(sub);
      store.$patch({ a: 10, unknownKey: 1 } as never);
      expect(store.a).toBe(10);
      expect((store.$state as Record<string, unknown>).unknownKey).toBeUndefined();
      expect(sub).toHaveBeenCalledTimes(1);
      expect(sub.mock.calls[0][0].type).toBe('patch object');
    });

    it('options：未提供 state 的 store 应可用（空初始状态）', () => {
      const useActions = defineStore('no-state', {
        actions: {
          ping() {
            return 'pong';
          },
        },
      });
      const store = useActions();
      expect(store.$state).toEqual({});
      expect(store.ping()).toBe('pong');
      store.$patch({ anything: 1 } as never); // 键不在 state ⇒ 跳过且不抛
      expect(store.$state).toEqual({});
    });

    it('setup：action 同步抛错应触发 $onAction 的 onError 并继续向外抛', () => {
      const useStore = defineStore('setup-throw', () => {
        const boom = () => {
          throw new Error('setup boom');
        };
        return { boom };
      });
      const store = useStore();
      let caught: Error | undefined;
      store.$onAction((ctx) => {
        ctx.onError = (e) => {
          caught = e as Error;
        };
      });
      expect(() => store.boom()).toThrow('setup boom');
      expect(caught?.message).toBe('setup boom');
    });

    it('setup：显式传入 pinia 应把 store 注册进 pinia.state', () => {
      const pinia = createPinia();
      const useStore = defineStore('setup-pinia', () => {
        const n = ref(1);
        return { n };
      });
      const store = useStore(pinia);
      expect(pinia.state.value['setup-pinia']).toBeDefined();
      expect(store.n).toBe(1);
    });

    it('setup：$patch(function) 应写穿透到 store（与 options 语义一致）', () => {
      const useStore = defineStore('setup-patch-fn', () => {
        const a = ref(1);
        return { a };
      });
      const store = useStore();
      store.$patch((s) => {
        (s as Record<string, unknown>).a = 99;
      });
      expect(store.a).toBe(99);
    });

    it('setup：$patch(object) 应写穿透并通知订阅者（单事件）', () => {
      const useStore = defineStore('setup-patch-obj', () => {
        const a = ref(1);
        return { a };
      });
      const store = useStore();
      const sub = vi.fn();
      store.$subscribe(sub);
      store.$patch({ a: 5 } as never);
      expect(store.a).toBe(5);
      expect(sub).toHaveBeenCalledTimes(1);
      expect(sub.mock.calls[0][0].type).toBe('patch object');
    });
  });
});
