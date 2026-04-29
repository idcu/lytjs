import { describe, it, expect } from 'vitest'
import { ref, computed, watch, effectScope, onScopeDispose } from '../src/index'

describe('effectScope', () => {
  it('should collect effects', () => {
    const count = ref(0)
    const scope = effectScope()

    scope.run(() => {
      const doubled = computed(() => count.value * 2)
      expect(doubled.value).toBe(0)
    })

    expect(scope.effects.length).toBeGreaterThan(0)
  })

  it('should stop all effects', () => {
    const count = ref(0)
    let watchCalled = false

    const scope = effectScope()
    scope.run(() => {
      watch(count, () => { watchCalled = true })
    })

    scope.stop()
    count.value = 1
    expect(watchCalled).toBe(false)
  })

  it('should support nested scopes', () => {
    const scope = effectScope()
    const innerScope = effectScope()

    scope.run(() => {
      innerScope.run(() => {
        // inner effect
      })
    })

    scope.stop()
    expect(scope.active).toBe(false)
  })

  it('should support onScopeDispose', () => {
    let disposed = false
    const scope = effectScope()

    scope.run(() => {
      onScopeDispose(() => { disposed = true })
    })

    expect(disposed).toBe(false)
    scope.stop()
    expect(disposed).toBe(true)
  })
})
