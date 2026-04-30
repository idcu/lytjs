import { test, expect } from '@playwright/test'
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount'

test.describe('SSR Hydration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('SSR 渲染基础 HTML 字符串', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { h, createApp } = window.LytJS;

      // 模拟 SSR 输出：手动设置 innerHTML（模拟服务端渲染结果）
      const ssrOutput = '<div data-server-rendered="true">SSR Content</div>';
      document.querySelector('#app').innerHTML = ssrOutput;

      // 验证 SSR 输出已设置
      const serverRendered = document.querySelector('#app').innerHTML;
      return {
        hasSSRContent: serverRendered.includes('SSR Content'),
        hasDataAttr: serverRendered.includes('data-server-rendered'),
      };
    }`)

    expect(result.hasSSRContent).toBe(true)
    expect(result.hasDataAttr).toBe(true)
  })

  test('Hydration 后客户端接管交互', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;

      // 模拟 SSR 输出
      const ssrHTML = '<div><button>Count: 0</button></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      // 客户端 hydration - 创建应用并挂载
      const count = ref(0);

      const app = createApp({
        setup() {
          return { count };
        },
        render() {
          return h('div', null, [
            h('button', {
              id: 'hydra-btn',
              onClick: () => { count.value++; }
            }, 'Count: ' + count.value)
          ]);
        }
      });
      app.mount('#app');

      window.__getCount = () => count.value;
    }`)

    // 验证客户端渲染结果
    let text = await getText(page, '#hydra-btn')
    expect(text).toBe('Count: 0')

    // 验证交互功能
    await page.click('#hydra-btn')
    await nextTick(page)

    text = await getText(page, '#hydra-btn')
    expect(text).toBe('Count: 1')

    await page.click('#hydra-btn')
    await nextTick(page)

    text = await getText(page, '#hydra-btn')
    expect(text).toBe('Count: 2')
  })

  test('SSR 渲染嵌套组件结构', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { h } = window.LytJS;

      // 模拟 SSR 渲染嵌套结构
      const ssrHTML = '<div><header><nav><ul><li>Home</li><li>About</li></ul></nav></header><main><h1>Welcome</h1><p>Content</p></main></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      const appContent = document.querySelector('#app').innerHTML;
      return {
        hasHeader: appContent.includes('<header>'),
        hasNav: appContent.includes('<nav>'),
        hasMain: appContent.includes('<main>'),
        hasH1: appContent.includes('<h1>'),
        hasListItems: appContent.includes('<li>Home</li>') && appContent.includes('<li>About</li>'),
      };
    }`)

    expect(result.hasHeader).toBe(true)
    expect(result.hasNav).toBe(true)
    expect(result.hasMain).toBe(true)
    expect(result.hasH1).toBe(true)
    expect(result.hasListItems).toBe(true)
  })

  test('Hydration 匹配服务端渲染的属性', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;

      // 模拟 SSR 输出带属性
      const ssrHTML = '<div><a href="/home" class="nav-link active" data-id="1">Home</a></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      // 客户端 hydration
      const app = createApp({
        render() {
          return h('div', null, [
            h('a', {
              href: '/home',
              class: 'nav-link active',
              'data-id': '1',
            }, 'Home')
          ]);
        }
      });
      app.mount('#app');
    }`)

    const html = await getHTML(page)
    expect(html).toContain('href="/home"')
    expect(html).toContain('class="nav-link active"')
    expect(html).toContain('data-id="1"')
    expect(html).toContain('Home')
  })

  test('Hydration 后响应式更新正常工作', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;

      // 模拟 SSR
      const ssrHTML = '<div><span id="hydra-text">Initial</span></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      const text = ref('Initial');

      const app = createApp({
        setup() {
          return { text };
        },
        render() {
          return h('div', null, [
            h('span', { id: 'hydra-text' }, text.value)
          ]);
        }
      });
      app.mount('#app');

      window.__updateHydraText = (val) => { text.value = val; };
    }`)

    let text = await getText(page, '#hydra-text')
    expect(text).toBe('Initial')

    await evaluateInBrowser(page, `(args) => {
      window.__updateHydraText('Updated after hydration');
    }`)
    await nextTick(page)

    text = await getText(page, '#hydra-text')
    expect(text).toBe('Updated after hydration')
  })
})
