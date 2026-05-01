import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('组件挂载/卸载', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('createApp 应该正确创建应用实例', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;
      const app = createApp({ render: () => h('div', null, 'test') });
      return {
        hasMount: typeof app.mount === 'function',
        hasUnmount: typeof app.unmount === 'function',
        hasUse: typeof app.use === 'function',
        hasProvide: typeof app.provide === 'function',
        hasInject: typeof app.inject === 'function',
      };
    }`)

    expect(result.hasMount).toBe(true)
    expect(result.hasUnmount).toBe(true)
    expect(result.hasUse).toBe(true)
    expect(result.hasProvide).toBe(true)
    expect(result.hasInject).toBe(true)
  })

  test('createApp 应该挂载组件并渲染到 DOM', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;
      const app = createApp({ render: () => h('div', null, 'Hello LytJS') });
      app.mount('#app');
    }`)

    const text = await getText(page)
    expect(text).toBe('Hello LytJS')

    const html = await getHTML(page)
    expect(html).toBe('<div>Hello LytJS</div>')
  })

  test('组件应该正确渲染文本内容', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;
      const app = createApp({
        render: () => h('div', null, [
          h('h1', null, 'Title'),
          h('p', null, 'Paragraph content'),
          h('span', null, 'Span text'),
        ])
      });
      app.mount('#app');
    }`)

    const html = await getHTML(page)
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<p>Paragraph content</p>')
    expect(html).toContain('<span>Span text</span>')
  })

  test('app.unmount() 应该正确卸载组件', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;
      const app = createApp({ render: () => h('div', null, 'will be removed') });
      app.mount('#app');

      // 验证已挂载
      const mountedHTML = document.querySelector('#app').innerHTML;
      window.__mountedHTML = mountedHTML;

      // 卸载
      app.unmount();

      return {
        mountedHTML: window.__mountedHTML,
        afterUnmountHTML: document.querySelector('#app').innerHTML,
      };
    }`)

    // 通过 evaluateInBrowser 的返回值验证
    const result = await evaluateInBrowser(page, `(args) => {
      return {
        mountedHTML: window.__mountedHTML,
        afterUnmountHTML: document.querySelector('#app').innerHTML,
      };
    }`)

    expect(result.mountedHTML).toContain('will be removed')
    expect(result.afterUnmountHTML).toBe('')
  })

  test('应该支持通过选择器字符串挂载', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;
      const app = createApp({ render: () => h('div', null, 'selector mount') });
      app.mount('#app');
    }`)

    const text = await getText(page)
    expect(text).toBe('selector mount')
  })

  test('应该支持嵌套组件渲染', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h } = window.LytJS;
      const app = createApp({
        render: () => h('div', { class: 'root' }, [
          h('div', { class: 'child-1' }, [
            h('span', null, 'nested-1'),
          ]),
          h('div', { class: 'child-2' }, [
            h('span', null, 'nested-2'),
          ]),
        ])
      });
      app.mount('#app');
    }`)

    const html = await getHTML(page)
    expect(html).toContain('nested-1')
    expect(html).toContain('nested-2')
    expect(html).toContain('class="child-1"')
    expect(html).toContain('class="child-2"')
  })
})
