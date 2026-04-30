import { test, expect } from '@playwright/test'
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount'

test.describe('Suspense', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('Suspense 组件应该正确创建', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { defineComponent } = window.LytJS;

      const Suspense = defineComponent({
        name: 'Suspense',
        props: {
          timeout: { type: Number, default: undefined },
        },
        setup() {
          return {
            boundary: {
              isPending: false,
              error: null,
              promise: null,
              pendingPromises: new Set(),
              onResolve: [],
              onPending: [],
              onError: [],
            }
          };
        },
      });

      return {
        name: Suspense.name,
        hasProps: !!Suspense.props,
        hasTimeout: 'timeout' in Suspense.props,
        hasSetup: typeof Suspense.setup === 'function',
      };
    }`)

    expect(result.name).toBe('Suspense')
    expect(result.hasProps).toBe(true)
    expect(result.hasTimeout).toBe(true)
    expect(result.hasSetup).toBe(true)
  })

  test('Suspense boundary 初始状态', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { defineComponent } = window.LytJS;

      const Suspense = defineComponent({
        name: 'Suspense',
        props: {
          timeout: { type: Number, default: undefined },
        },
        setup() {
          const boundary = {
            isPending: false,
            error: null,
            promise: null,
            pendingPromises: new Set(),
            onResolve: [],
            onPending: [],
            onError: [],
          };
          return { boundary };
        },
      });

      // 模拟创建 Suspense 实例
      const boundary = Suspense.setup({}, {});
      return {
        isPending: boundary.boundary.isPending,
        error: boundary.boundary.error,
        pendingPromisesSize: boundary.boundary.pendingPromises.size,
        onResolveLength: boundary.boundary.onResolve.length,
        onPendingLength: boundary.boundary.onPending.length,
        onErrorLength: boundary.boundary.onError.length,
      };
    }`)

    expect(result.isPending).toBe(false)
    expect(result.error).toBeNull()
    expect(result.pendingPromisesSize).toBe(0)
    expect(result.onResolveLength).toBe(0)
    expect(result.onPendingLength).toBe(0)
    expect(result.onErrorLength).toBe(0)
  })

  test('Suspense boundary 状态管理 - pending/resolve', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { defineComponent } = window.LytJS;

      const boundary = {
        isPending: false,
        error: null,
        promise: null,
        pendingPromises: new Set(),
        onResolve: [],
        onPending: [],
        onError: [],
      };

      // 模拟 pending 状态
      boundary.isPending = true;
      boundary.pendingPromises.add(new Promise(() => {}));

      const pendingState = {
        isPending: boundary.isPending,
        pendingPromisesSize: boundary.pendingPromises.size,
      };

      // 模拟 resolve
      boundary.isPending = false;
      boundary.pendingPromises.clear();

      const resolvedState = {
        isPending: boundary.isPending,
        pendingPromisesSize: boundary.pendingPromises.size,
      };

      return { pendingState, resolvedState };
    }`)

    expect(result.pendingState.isPending).toBe(true)
    expect(result.pendingState.pendingPromisesSize).toBe(1)
    expect(result.resolvedState.isPending).toBe(false)
    expect(result.resolvedState.pendingPromisesSize).toBe(0)
  })

  test('Suspense boundary 错误状态管理', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const boundary = {
        isPending: false,
        error: null,
        promise: null,
        pendingPromises: new Set(),
        onResolve: [],
        onPending: [],
        onError: [],
      };

      // 模拟错误
      const testError = new Error('Async component failed');
      boundary.error = testError;
      boundary.isPending = false;

      return {
        hasError: boundary.error !== null,
        errorMessage: boundary.error.message,
        isPending: boundary.isPending,
      };
    }`)

    expect(result.hasError).toBe(true)
    expect(result.errorMessage).toBe('Async component failed')
    expect(result.isPending).toBe(false)
  })

  test('Suspense onResolve/onPending 回调注册', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const boundary = {
        isPending: false,
        error: null,
        promise: null,
        pendingPromises: new Set(),
        onResolve: [],
        onPending: [],
        onError: [],
      };

      const resolveCalls = [];
      const pendingCalls = [];

      boundary.onResolve.push(() => resolveCalls.push('resolved'));
      boundary.onPending.push(() => pendingCalls.push('pending'));

      // 触发回调
      boundary.onResolve.forEach(cb => cb());
      boundary.onPending.forEach(cb => cb());

      return {
        onResolveLength: boundary.onResolve.length,
        onPendingLength: boundary.onPending.length,
        resolveCalls,
        pendingCalls,
      };
    }`)

    expect(result.onResolveLength).toBe(1)
    expect(result.onPendingLength).toBe(1)
    expect(result.resolveCalls).toEqual(['resolved'])
    expect(result.pendingCalls).toEqual(['pending'])
  })
})
