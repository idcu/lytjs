import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('响应式系统', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('ref 应该创建响应式引用', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { ref } = window.LytJS;
      const count = ref(0);
      return {
        initialValue: count.value,
        isRef: typeof count.value !== 'undefined',
      };
    }`)

    expect(result.initialValue).toBe(0)
    expect(result.isRef).toBe(true)
  })

  test('ref 响应式更新应该触发视图变化', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const count = ref(0);

      const app = createApp({
        render: () => h('div', null, 'Count: ' + count.value)
      });
      app.mount('#app');

      window.__updateCount = () => {
        count.value++;
      };
    }`)

    // 验证初始值
    let text = await getText(page)
    expect(text).toBe('Count: 0')

    // 更新 ref 值
    await evaluateInBrowser(page, `(args) => {
      window.__updateCount();
    }`)
    await nextTick(page)

    text = await getText(page)
    expect(text).toBe('Count: 1')

    // 再次更新
    await evaluateInBrowser(page, `(args) => {
      window.__updateCount();
    }`)
    await nextTick(page)

    text = await getText(page)
    expect(text).toBe('Count: 2')
  })

  test('reactive 应该创建响应式对象', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { reactive } = window.LytJS;
      const state = reactive({ name: 'LytJS', version: 6 });
      return {
        name: state.name,
        version: state.version,
      };
    }`)

    expect(result.name).toBe('LytJS')
    expect(result.version).toBe(6)
  })

  test('reactive 响应式更新应该触发视图变化', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, reactive } = window.LytJS;
      const state = reactive({ message: 'Hello' });

      const app = createApp({
        render: () => h('div', null, state.message)
      });
      app.mount('#app');

      window.__updateMessage = (msg) => {
        state.message = msg;
      };
    }`)

    let text = await getText(page)
    expect(text).toBe('Hello')

    await evaluateInBrowser(page, `(args) => {
      window.__updateMessage('World');
    }`)
    await nextTick(page)

    text = await getText(page)
    expect(text).toBe('World')
  })

  test('computed 应该创建计算属性', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { ref, computed } = window.LytJS;
      const count = ref(1);
      const doubled = computed(() => count.value * 2);

      return {
        initialDoubled: doubled.value,
      };
    }`)

    expect(result.initialDoubled).toBe(2)
  })

  test('computed 应该在依赖变化时自动更新', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { ref, computed } = window.LytJS;
      const count = ref(3);
      const doubled = computed(() => count.value * 2);

      window.__getDoubled = () => doubled.value;
      window.__setCount = (val) => { count.value = val; };
    }`)

    let result = await evaluateInBrowser(page, `(args) => {
      return window.__getDoubled();
    }`)
    expect(result).toBe(6)

    await evaluateInBrowser(page, `(args) => {
      window.__setCount(5);
    }`)

    result = await evaluateInBrowser(page, `(args) => {
      return window.__getDoubled();
    }`)
    expect(result).toBe(10)
  })

  test('watch 应该监听 ref 变化', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { ref, watch, nextTick } = window.LytJS;
      const count = ref(0);
      const changes = [];

      watch(count, (newVal, oldVal) => {
        changes.push({ newVal, oldVal });
      });

      window.__getChanges = () => changes;
      window.__setCount = (val) => { count.value = val; };
    }`)

    await evaluateInBrowser(page, `(args) => {
      window.__setCount(1);
      window.__setCount(2);
      window.__setCount(3);
    }`)

    // 等待 watch 回调执行（轮询等待，替代固定延时）
    await page.waitForFunction(
      () => (window as any).__getChanges && (window as any).__getChanges().length >= 1,
      { timeout: 5000 }
    )

    const changes = await evaluateInBrowser(page, `(args) => {
      return window.__getChanges();
    }`)

    expect(changes.length).toBeGreaterThanOrEqual(1)
    // 验证最后一次变化
    const lastChange = changes[changes.length - 1]
    expect(lastChange.newVal).toBe(3)
  })

  test('watch 应该监听 reactive 对象属性变化', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { reactive, watch } = window.LytJS;
      const state = reactive({ name: 'initial' });
      const changes = [];

      watch(
        () => state.name,
        (newVal, oldVal) => {
          changes.push({ newVal, oldVal });
        }
      );

      window.__getChanges = () => changes;
      window.__setName = (val) => { state.name = val; };
    }`)

    await evaluateInBrowser(page, `(args) => {
      window.__setName('updated');
    }`)

    // 等待 watch 回调执行（轮询等待，替代固定延时）
    await page.waitForFunction(
      () => (window as any).__getChanges && (window as any).__getChanges().length >= 1,
      { timeout: 5000 }
    )

    const changes = await evaluateInBrowser(page, `(args) => {
      return window.__getChanges();
    }`)

    expect(changes.length).toBeGreaterThanOrEqual(1)
    expect(changes[0].newVal).toBe('updated')
  })
})
