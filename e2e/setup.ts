import { test, expect } from '@playwright/test';

/**
 * E2E 全局 setup 测试
 * 验证测试基础设施是否就绪
 */
test.describe('E2E Setup', () => {
  test('should load LytJS global bundle', async ({ page }) => {
    await page.goto('/');
    // 验证 LytJS 全局对象已加载
    const hasLytJS = await page.evaluate(() => {
      return typeof (window as any).LytJS === 'object';
    });
    expect(hasLytJS).toBe(true);
  });

  test('should expose core APIs on window.LytJS', async ({ page }) => {
    await page.goto('/');
    const apis = await page.evaluate(() => {
      const L = (window as any).LytJS;
      return {
        createApp: typeof L.createApp === 'function',
        h: typeof L.h === 'function',
        ref: typeof L.ref === 'function',
        reactive: typeof L.reactive === 'function',
        computed: typeof L.computed === 'function',
        watch: typeof L.watch === 'function',
        onMounted: typeof L.onMounted === 'function',
        onUnmounted: typeof L.onUnmounted === 'function',
        nextTick: typeof L.nextTick === 'function',
        defineComponent: typeof L.defineComponent === 'function',
      };
    });
    expect(apis.createApp).toBe(true);
    expect(apis.h).toBe(true);
    expect(apis.ref).toBe(true);
    expect(apis.reactive).toBe(true);
    expect(apis.computed).toBe(true);
    expect(apis.watch).toBe(true);
    expect(apis.onMounted).toBe(true);
    expect(apis.onUnmounted).toBe(true);
    expect(apis.nextTick).toBe(true);
    expect(apis.defineComponent).toBe(true);
  });
});
