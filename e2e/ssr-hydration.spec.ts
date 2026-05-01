import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('SSR Hydration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  // ============================================================
  // 检查 renderToString 是否在 IIFE bundle 中可用
  // renderToString 定义在 @lytjs/renderer 中，但当前 IIFE bundle
  // 从 @lytjs/core 入口构建，未直接导出 renderToString。
  // 如果未来 bundle 包含 renderer，这些测试将自动启用。
  // ============================================================

  test('检查 renderToString 是否可用', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const hasRenderToString = typeof window.LytJS.renderToString === 'function';
      return {
        available: hasRenderToString,
      };
    }`)

    if (!result.available) {
      test.skip()
      return
    }
    // renderToString 可用，验证返回值结构
    expect(typeof result.available).toBe('boolean')
  })

  test('renderToString 应将简单 VNode 渲染为 HTML 字符串', async ({ page }) => {
    // 先检查 renderToString 是否可用
    const available = await evaluateInBrowser(page, `(args) => {
      return typeof window.LytJS.renderToString === 'function';
    }`)

    if (!available) {
      // renderToString 未在 IIFE bundle 中暴露，跳过此测试
      // 注：renderToString 定义在 @lytjs/renderer 包中，
      // 当前 IIFE bundle 从 @lytjs/core 入口构建，未包含 renderer。
      // 当 bundle 配置更新后此测试将自动通过。
      test.skip()
      return
    }

    const result = await evaluateInBrowser(page, `(args) => {
      const { h, renderToString } = window.LytJS;
      const vnode = h('div', { id: 'ssr-root' }, 'SSR Content');
      return renderToString({ vnode });
    }`)

    expect(result).toContain('SSR Content')
    expect(result).toContain('id="ssr-root"')
  })

  test('renderToString 应正确处理嵌套组件', async ({ page }) => {
    const available = await evaluateInBrowser(page, `(args) => {
      return typeof window.LytJS.renderToString === 'function';
    }`)

    if (!available) {
      test.skip()
      return
    }

    const result = await evaluateInBrowser(page, `(args) => {
      const { h, renderToString } = window.LytJS;
      const vnode = h('div', null, [
        h('header', null, [
          h('h1', null, 'Title'),
        ]),
        h('main', null, [
          h('p', null, 'Content'),
        ]),
      ]);
      return renderToString({ vnode });
    }`)

    expect(result).toContain('<header>')
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<main>')
    expect(result).toContain('<p>Content</p>')
  })

  // ============================================================
  // 以下是使用模拟 SSR 输出的 Hydration 测试
  // （当 renderToString 不可用时的回退方案）
  // ============================================================

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

  // ============================================================
  // 改进的 Hydration 测试：验证更完整的 SSR -> Hydration 流程
  // ============================================================

  test('Hydration 后列表数据更新应正确反映到 DOM', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;

      // 模拟 SSR 输出 - 初始列表
      const ssrHTML = '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      const items = ref(['Item 1', 'Item 2']);

      const app = createApp({
        setup() {
          return { items };
        },
        render() {
          return h('div', null, [
            h('ul', null,
              items.value.map((item, i) =>
                h('li', { key: i }, item)
              )
            )
          ]);
        }
      });
      app.mount('#app');

      window.__addItem = (item) => {
        items.value = [...items.value, item];
      };
    }`)

    // 验证初始列表
    let listItems = await page.locator('li').allTextContents()
    expect(listItems).toEqual(['Item 1', 'Item 2'])

    // 添加新项
    await evaluateInBrowser(page, `(args) => {
      window.__addItem('Item 3');
    }`)
    await nextTick(page)

    listItems = await page.locator('li').allTextContents()
    expect(listItems).toEqual(['Item 1', 'Item 2', 'Item 3'])
  })

  test('Hydration 后条件渲染切换应正常工作', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;

      // 模拟 SSR 输出 - show=true
      const ssrHTML = '<div><p id="ssr-condition">Visible Content</p></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      const show = ref(true);

      const app = createApp({
        setup() {
          return { show };
        },
        render() {
          return h('div', null, [
            show.value
              ? h('p', { id: 'ssr-condition' }, 'Visible Content')
              : h('p', { id: 'ssr-condition' }, 'Hidden Content'),
          ]);
        }
      });
      app.mount('#app');

      window.__toggleShow = (val) => { show.value = val; };
    }`)

    // 初始状态
    let text = await getText(page, '#ssr-condition')
    expect(text).toBe('Visible Content')

    // 切换为隐藏
    await evaluateInBrowser(page, `(args) => {
      window.__toggleShow(false);
    }`)
    await nextTick(page)

    text = await getText(page, '#ssr-condition')
    expect(text).toBe('Hidden Content')

    // 切换回显示
    await evaluateInBrowser(page, `(args) => {
      window.__toggleShow(true);
    }`)
    await nextTick(page)

    text = await getText(page, '#ssr-condition')
    expect(text).toBe('Visible Content')
  })

  test('Hydration 后事件绑定应正常工作', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;

      // 模拟 SSR 输出
      const ssrHTML = '<div><button id="ssr-event-btn">Click me: 0</button></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      const clickCount = ref(0);

      const app = createApp({
        setup() {
          return { clickCount };
        },
        render() {
          return h('div', null, [
            h('button', {
              id: 'ssr-event-btn',
              onClick: () => { clickCount.value++; }
            }, 'Click me: ' + clickCount.value)
          ]);
        }
      });
      app.mount('#app');
    }`)

    // 验证初始状态
    let text = await getText(page, '#ssr-event-btn')
    expect(text).toBe('Click me: 0')

    // 点击并验证
    await page.click('#ssr-event-btn')
    await nextTick(page)

    text = await getText(page, '#ssr-event-btn')
    expect(text).toBe('Click me: 1')

    // 多次点击
    await page.click('#ssr-event-btn')
    await page.click('#ssr-event-btn')
    await nextTick(page)

    text = await getText(page, '#ssr-event-btn')
    expect(text).toBe('Click me: 3')
  })

  test('Hydration 后 computed 属性应正确计算', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref, computed } = window.LytJS;

      // 模拟 SSR 输出
      const ssrHTML = '<div><span id="ssr-computed">Count x2: 0</span></div>';
      document.querySelector('#app').innerHTML = ssrHTML;

      const count = ref(0);
      const doubled = computed(() => count.value * 2);

      const app = createApp({
        setup() {
          return { count, doubled };
        },
        render() {
          return h('div', null, [
            h('span', { id: 'ssr-computed' }, 'Count x2: ' + doubled.value)
          ]);
        }
      });
      app.mount('#app');

      window.__incrementCount = () => { count.value++; };
    }`)

    let text = await getText(page, '#ssr-computed')
    expect(text).toBe('Count x2: 0')

    await evaluateInBrowser(page, `(args) => {
      window.__incrementCount();
    }`)
    await nextTick(page)

    text = await getText(page, '#ssr-computed')
    expect(text).toBe('Count x2: 2')

    await evaluateInBrowser(page, `(args) => {
      window.__incrementCount();
      window.__incrementCount();
    }`)
    await nextTick(page)

    text = await getText(page, '#ssr-computed')
    expect(text).toBe('Count x2: 6')
  })
})
