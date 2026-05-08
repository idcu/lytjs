/**
 * @lytjs/store unit tests
 */

import { describe, it, expect } from 'vitest';
import { defineStore } from '../src/defineStore';
import { createPinia } from '../src/pinia';

describe('@lytjs/store', () => {
  describe('createPinia', () => {
    it('should create a pinia instance', () => {
      const pinia = createPinia();
      expect(pinia).toBeDefined();
      expect(pinia.state).toBeDefined();
    });
  });

  describe('defineStore (options)', () => {
    it('should create a store definition', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
        actions: {
          increment() { this.count++; },
        },
      });
      expect(useCounter).toBeDefined();
    });

    it('should initialize state correctly', () => {
      const useCounter = defineStore('counter', {
        state: () => ({ count: 0 }),
      });
      const store = useCounter();
      expect(store.$id).toBe('counter');
      expect(store.$state.count).toBe(0);
    });
  });

  describe('defineStore (setup)', () => {
    it('should create a setup store', () => {
      const useCounter = defineStore('counter', () => {
        const count = { value: 0 };
        return { count };
      });
      expect(useCounter).toBeDefined();
    });
  });
});
