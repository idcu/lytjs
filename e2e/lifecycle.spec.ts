import { test, expect } from '@playwright/test'
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount'

test.describe('生命周期', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('onMounted 应该在组件挂载后被调用', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { createApp, h, onMounted } = window.LytJS;
      const lifecycleLog = [];

      const app = createApp({
        setup() {
          onMounted(() => {
            lifecycleLog.push('mounted');
          });
          return {};
        },
        render() {
          return h('div', null, 'lifecycle test');
        }
      });
      app.mount('#app');

      return {
        log: lifecycleLog,
        hasMounted: lifecycleLog.includes('mounted'),
      };
    }`)

    expect(result.hasMounted).toBe(true)
    expect(result.log).toContain('mounted')
  })

  test('onMounted 应该能访问 DOM 元素', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { createApp, h, onMounted } = window.LytJS;
      let mountedDOMText = '';

      const app = createApp({
        setup() {
          onMounted(() => {
            const el = document.querySelector('#app');
            mountedDOMText = el ? el.textContent : 'no element';
          });
          return {};
        },
        render() () => h('div', null, 'DOM content')
      });
      app.mount('#app');

      return { mountedDOMText };
    }`)

    expect(result.mountedDOMText).toBe('DOM content')
  })

  test('onUnmounted 应该在组件卸载后被调用', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, onMounted, onUnmounted } = window.LytJS;
      const lifecycleLog = [];

      window.__createLifecycleApp = () => {
        const app = createApp({
          setup() {
            onMounted(() => {
              lifecycleLog.push('mounted');
            });
            onUnmounted(() => {
              lifecycleLog.push('unmounted');
            });
            return {};
          },
          render() {
            return h('div', null, 'lifecycle unmount test');
          }
        });
        app.mount('#app');
        return app;
      };

      window.__getLifecycleLog = () => lifecycleLog;
    }`)

    // 创建并挂载应用
    await evaluateInBrowser(page, `(args) => {
      window.__lifecycleApp = window.__createLifecycleApp();
    }`)

    // 验证 onMounted 已调用
    let log = await evaluateInBrowser(page, `(args) => {
      return window.__getLifecycleLog();
    }`)
    expect(log).toContain('mounted')

    // 卸载应用
    await evaluateInBrowser(page, `(args) => {
      window.__lifecycleApp.unmount();
    }`)

    // 验证 onUnmounted 已调用
    log = await evaluateInBrowser(page, `(args) => {
      return window.__getLifecycleLog();
    }`)
    expect(log).toContain('unmounted')
  })

  test('onMounted 应该按注册顺序调用', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { createApp, h, onMounted } = window.LytJS;
      const callOrder = [];

      const app = createApp({
        setup() {
          onMounted(() => { callOrder.push('first'); });
          onMounted(() => { callOrder.push('second'); });
          onMounted(() => { callOrder.push('third'); });
          return {};
        },
        render() {
          return h('div', null, 'order test');
        }
      });
      app.mount('#app');

      return { callOrder };
    }`)

    expect(result.callOrder).toEqual(['first', 'second', 'third'])
  })

  test('onUnmounted 应该按注册顺序调用', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, onMounted, onUnmounted } = window.LytJS;
      const unmountOrder = [];

      window.__createOrderedApp = () => {
        const app = createApp({
          setup() {
            onUnmounted(() => { unmountOrder.push('first'); });
            onUnmounted(() => { unmountOrder.push('second'); });
            onUnmounted(() => { unmountOrder.push('third'); });
            return {};
          },
          render() {
            return h('div', null, 'unmount order test');
          }
        });
        app.mount('#app');
        return app;
      };

      window.__getUnmountOrder = () => unmountOrder;
    }`)

    await evaluateInBrowser(page, `(args) => {
      window.__orderedApp = window.__createOrderedApp();
    }`)

    await evaluateInBrowser(page, `(args) => {
      window.__orderedApp.unmount();
    }`)

    const order = await evaluateInBrowser(page, `(args) => {
      return window.__getUnmountOrder();
    }`)

    expect(order).toEqual(['first', 'second', 'third'])
  })
})
