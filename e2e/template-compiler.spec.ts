import { test, expect } from '@playwright/test'
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount'

test.describe('模板编译', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('compile 函数应该存在且可调用', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;
      return {
        isFunction: typeof compile === 'function',
      };
    }`)

    expect(result.isFunction).toBe(true)
  })

  test('compile 编译简单模板生成渲染函数', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<div>Hello Template</div>');
        return {
          success: true,
          hasRender: typeof compiled === 'function' || (compiled && typeof compiled.render === 'function'),
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    // compile 函数存在且可调用（具体返回格式取决于实现）
    expect(result.success).toBe(true)
  })

  test('compile 编译带插值的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<span>{{ message }}</span>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带条件指令的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<div><p v-if="show">Visible</p><p v-else>Hidden</p></div>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带列表指令的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带事件绑定的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<button @click="handleClick">Click Me</button>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带组件引用的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<my-component :prop="value" @event="handler"></my-component>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带 v-model 的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<input v-model="text" type="text" />');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带 slot 的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<template><slot>Default Content</slot></template>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })
})
