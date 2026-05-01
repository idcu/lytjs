import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('依赖注入 - Provide/Inject', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('app.provide 跨层级传递数据到子组件', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, defineComponent } = window.LytJS;

      const GrandChild = defineComponent({
        setup(props, ctx) {
          const theme = ctx.inject ? ctx.inject('theme') : undefined;
          return { theme };
        },
        render() {
          return h('span', { id: 'grandchild' }, 'Theme: ' + this.theme);
        }
      });

      const Child = defineComponent({
        render() {
          return h('div', null, [h(GrandChild)]);
        }
      });

      const app = createApp({
        render() {
          return h(Child);
        }
      });
      app.provide('theme', 'dark');
      app.mount('#app');
    }`)

    const text = await getText(page, '#grandchild')
    expect(text).toBe('Theme: dark')
  })

  test('provide/inject 响应式数据更新时子组件自动更新', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const locale = ref('zh-CN');

      const DeepChild = defineComponent({
        setup(props, ctx) {
          const loc = ctx.inject ? ctx.inject('locale') : undefined;
          return { loc };
        },
        render() {
          return h('span', { id: 'locale-display' }, 'Locale: ' + this.loc);
        }
      });

      const MiddleChild = defineComponent({
        render() {
          return h('div', null, [h(DeepChild)]);
        }
      });

      const app = createApp({
        render() {
          return h(MiddleChild);
        }
      });
      app.provide('locale', locale);
      app.mount('#app');

      window.__updateLocale = (val) => { locale.value = val; };
    }`)

    let text = await getText(page, '#locale-display')
    expect(text).toBe('Locale: zh-CN')

    await evaluateInBrowser(page, `(args) => {
      window.__updateLocale('en-US');
    }`)
    await nextTick(page)

    text = await getText(page, '#locale-display')
    expect(text).toBe('Locale: en-US')
  })

  test('inject 使用默认值当 provide 未提供时', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, defineComponent } = window.LytJS;

      const Child = defineComponent({
        setup(props, ctx) {
          const config = ctx.inject ? ctx.inject('missing-key', 'fallback-value') : 'fallback-value';
          return { config };
        },
        render() {
          return h('span', { id: 'inject-default' }, this.config);
        }
      });

      const app = createApp({
        render() {
          return h(Child);
        }
      });
      app.mount('#app');
    }`)

    const text = await getText(page, '#inject-default')
    expect(text).toBe('fallback-value')
  })

  test('多层级 provide/inject 正确传递', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, defineComponent } = window.LytJS;

      const Level3 = defineComponent({
        setup(props, ctx) {
          const appVal = ctx.inject ? ctx.inject('app-level') : undefined;
          const midVal = ctx.inject ? ctx.inject('mid-level') : undefined;
          return { appVal, midVal };
        },
        render() {
          return h('span', { id: 'level3' }, this.appVal + '|' + this.midVal);
        }
      });

      const Level2 = defineComponent({
        setup(props, ctx) {
          // Level2 也 provide 一个值
          if (ctx.provide) ctx.provide('mid-level', 'from-level2');
          return {};
        },
        render() {
          return h('div', null, [h(Level3)]);
        }
      });

      const app = createApp({
        render() {
          return h(Level2);
        }
      });
      app.provide('app-level', 'from-app');
      app.mount('#app');
    }`)

    const text = await getText(page, '#level3')
    expect(text).toBe('from-app|from-level2')
  })
})
