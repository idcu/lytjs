import { describe, it, expect } from 'vitest';
import { ref, computed, watch, effect } from '../src/index';
import { effectScope, onScopeDispose } from '../src/effect-scope';

describe('effectScope', () => {
  it('should collect effects', () => {
    const count = ref(0);
    const scope = effectScope();

    scope.run(() => {
      const doubled = computed(() => count.value * 2);
      expect(doubled.value).toBe(0);
    });

    expect(scope.effects.length).toBeGreaterThan(0);
  });

  it('should stop all effects', () => {
    const count = ref(0);
    let watchCalled = false;

    const scope = effectScope();
    scope.run(() => {
      watch(count, () => {
        watchCalled = true;
      });
    });

    scope.stop();
    count.value = 1;
    expect(watchCalled).toBe(false);
  });

  it('should support nested scopes', () => {
    const scope = effectScope();
    const innerScope = effectScope();

    scope.run(() => {
      innerScope.run(() => {
        // inner effect
      });
    });

    scope.stop();
    expect(scope.active).toBe(false);
  });

  it('should support onScopeDispose', () => {
    let disposed = false;
    const scope = effectScope();

    scope.run(() => {
      onScopeDispose(() => {
        disposed = true;
      });
    });

    expect(disposed).toBe(false);
    scope.stop();
    expect(disposed).toBe(true);
  });

  it('should not throw when stopping a scope that was never run', () => {
    const scope = effectScope();
    expect(() => scope.stop()).not.toThrow();
    expect(scope.active).toBe(false);
  });

  it('should not throw when stopping an already stopped scope', () => {
    const count = ref(0);
    const scope = effectScope();
    scope.run(() => {
      watch(count, () => {});
    });
    scope.stop();
    expect(() => scope.stop()).not.toThrow();
  });

  it('should stop inner scope independently from outer scope', () => {
    const count = ref(0);
    let outerWatchCalled = false;
    let innerWatchCalled = false;

    const outerScope = effectScope();
    const innerScope = effectScope();

    outerScope.run(() => {
      watch(count, () => {
        outerWatchCalled = true;
      });
    });

    innerScope.run(() => {
      watch(count, () => {
        innerWatchCalled = true;
      });
    });

    innerScope.stop();
    count.value = 1;

    expect(innerWatchCalled).toBe(false);
    expect(outerWatchCalled).toBe(true);
  });

  it('should allow re-running effects after scope disposal', () => {
    const count = ref(0);
    let effectValue = 0;

    const scope = effectScope();
    scope.run(() => {
      effect(() => {
        effectValue = count.value;
      });
    });

    expect(effectValue).toBe(0);
    scope.stop();
    count.value = 1;
    expect(effectValue).toBe(0);

    // Re-run scope
    scope.run(() => {
      effect(() => {
        effectValue = count.value;
      });
    });
    expect(effectValue).toBe(1);
  });
});
