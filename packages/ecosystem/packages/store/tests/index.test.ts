/**
 * @lytjs/store unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineStore, clearStoreCache } from '../src/defineStore';
import { createPinia, getActivePinia, setActivePinia } from '../src/pinia';
import { storeToRefs } from '../src/storeToRefs';

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
        const increment = () => { count.value++; };
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
        const increment = () => { count.value++; };
        return { count, increment };
      });
      const store = useCounter();
      expect(store.count.value).toBe(0);
      store.increment();
      expect(store.count.value).toBe(1);
    });

    it('should support $subscribe in setup store', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        const increment = () => { count.value++; };
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
      expect(store.total).toBe(220);
      
      store.price = 50;
      expect(store.subtotal).toBe(100);
      expect(store.total).toBe(110);
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
});
