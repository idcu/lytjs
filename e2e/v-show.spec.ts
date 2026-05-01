import { test, expect } from '@playwright/test'
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount'

/**
 * v-show E2E 测试
 *
 * v-show 在 LytJS 中是编译器级别的 transform（transformShow），
 * 将 `v-show="condition"` 编译为：
 *   - style: condition ? undefined : { display: 'none' }
 *
 * 与 v-if 不同，v-show 不会销毁/重建 DOM 元素，
 * 而是通过切换 CSS display 属性来控制可见性。
 *
 * 在 E2E 测试中，我们通过 h() 函数手动模拟编译器输出，
 * 使用 style prop 实现显示/隐藏切换。
 */
test.describe('v-show 显示/隐藏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('v-show 为 true 时元素应可见', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(true);

      const app = createApp({
        setup() {
          return { visible };
        },
        render() {
          return h('div', null, [
            // 模拟 v-show="visible" 的编译器输出
            // v-show=true 时 style 为 undefined（不设置 display）
            h('p', {
              id: 'show-element',
              style: this.visible ? undefined : { display: 'none' },
            }, 'I am visible'),
          ]);
        }
      });
      app.mount('#app');
    }`)

    // 元素应存在
    const elementCount = await page.locator('#show-element').count()
    expect(elementCount).toBe(1)

    // 元素应可见（没有 display:none）
    const displayStyle = await page.evaluate(() => {
      const el = document.querySelector('#show-element');
      return window.getComputedStyle(el).display;
    })
    expect(displayStyle).not.toBe('none')

    const text = await getText(page, '#show-element')
    expect(text).toBe('I am visible')
  })

  test('v-show 为 false 时元素应隐藏（display: none）', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(false);

      const app = createApp({
        setup() {
          return { visible };
        },
        render() {
          return h('div', null, [
            h('p', {
              id: 'show-element',
              style: this.visible ? undefined : { display: 'none' },
            }, 'I am hidden'),
          ]);
        }
      });
      app.mount('#app');
    }`)

    // 元素应仍然存在于 DOM 中（v-show 不会移除元素）
    const elementCount = await page.locator('#show-element').count()
    expect(elementCount).toBe(1)

    // 元素应有 display:none
    const displayStyle = await page.evaluate(() => {
      const el = document.querySelector('#show-element');
      return window.getComputedStyle(el).display;
    })
    expect(displayStyle).toBe('none')
  })

  test('v-show 切换应正确更新 display 样式', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(true);

      const app = createApp({
        setup() {
          return { visible };
        },
        render() {
          return h('div', null, [
            h('p', {
              id: 'show-element',
              style: this.visible ? undefined : { display: 'none' },
            }, 'Toggle content'),
          ]);
        }
      });
      app.mount('#app');

      window.__toggleVisible = (val) => { visible.value = val; };
    }`)

    // 初始状态 - 可见
    let displayStyle = await page.evaluate(() => {
      const el = document.querySelector('#show-element');
      return window.getComputedStyle(el).display;
    })
    expect(displayStyle).not.toBe('none')

    // 切换为隐藏
    await evaluateInBrowser(page, `(args) => {
      window.__toggleVisible(false);
    }`)
    await nextTick(page)

    displayStyle = await page.evaluate(() => {
      const el = document.querySelector('#show-element');
      return window.getComputedStyle(el).display;
    })
    expect(displayStyle).toBe('none')

    // 切换回可见
    await evaluateInBrowser(page, `(args) => {
      window.__toggleVisible(true);
    }`)
    await nextTick(page)

    displayStyle = await page.evaluate(() => {
      const el = document.querySelector('#show-element');
      return window.getComputedStyle(el).display;
    })
    expect(displayStyle).not.toBe('none')
  })

  test('v-show 多次快速切换应保持正确状态', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(true);

      const app = createApp({
        setup() {
          return { visible };
        },
        render() {
          return h('div', null, [
            h('span', {
              id: 'rapid-toggle',
              style: this.visible ? undefined : { display: 'none' },
            }, 'Content'),
          ]);
        }
      });
      app.mount('#app');

      window.__toggleVisible = (val) => { visible.value = val; };
    }`)

    // 快速切换多次
    for (let i = 0; i < 5; i++) {
      await evaluateInBrowser(page, `(args) => {
        window.__toggleVisible(false);
      }`)
      await nextTick(page)

      let displayStyle = await page.evaluate(() => {
        const el = document.querySelector('#rapid-toggle');
        return window.getComputedStyle(el).display;
      })
      expect(displayStyle).toBe('none')

      await evaluateInBrowser(page, `(args) => {
        window.__toggleVisible(true);
      }`)
      await nextTick(page)

      displayStyle = await page.evaluate(() => {
        const el = document.querySelector('#rapid-toggle');
        return window.getComputedStyle(el).display;
      })
      expect(displayStyle).not.toBe('none')
    }
  })

  test('v-show 与 v-if 对比：v-show 保留 DOM 元素', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const showByVShow = ref(false);
      const showByVIf = ref(false);

      const app = createApp({
        setup() {
          return { showByVShow, showByVIf };
        },
        render() {
          return h('div', null, [
            // v-show: 元素始终在 DOM 中
            h('p', {
              id: 'vshow-element',
              style: this.showByVShow ? undefined : { display: 'none' },
            }, 'v-show element'),
            // v-if: 条件为 false 时元素不存在
            this.showByVIf
              ? h('p', { id: 'vif-element' }, 'v-if element')
              : null,
          ]);
        }
      });
      app.mount('#app');

      window.__setVShow = (val) => { showByVShow.value = val; };
      window.__setVIf = (val) => { showByVIf.value = val; };
    }`)

    // 两者都为 false
    let vshowCount = await page.locator('#vshow-element').count()
    let vifCount = await page.locator('#vif-element').count()
    expect(vshowCount).toBe(1)   // v-show 元素仍在 DOM 中
    expect(vifCount).toBe(0)     // v-if 元素已移除

    // 两者都设为 true
    await evaluateInBrowser(page, `(args) => {
      window.__setVShow(true);
      window.__setVIf(true);
    }`)
    await nextTick(page)

    vshowCount = await page.locator('#vshow-element').count()
    vifCount = await page.locator('#vif-element').count()
    expect(vshowCount).toBe(1)
    expect(vifCount).toBe(1)

    // 两者都设回 false
    await evaluateInBrowser(page, `(args) => {
      window.__setVShow(false);
      window.__setVIf(false);
    }`)
    await nextTick(page)

    vshowCount = await page.locator('#vshow-element').count()
    vifCount = await page.locator('#vif-element').count()
    expect(vshowCount).toBe(1)   // v-show 元素仍在 DOM 中
    expect(vifCount).toBe(0)     // v-if 元素已移除
  })

  test('v-show 多个元素独立控制', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const showA = ref(true);
      const showB = ref(false);
      const showC = ref(true);

      const app = createApp({
        setup() {
          return { showA, showB, showC };
        },
        render() {
          return h('div', null, [
            h('div', {
              id: 'panel-a',
              style: this.showA ? undefined : { display: 'none' },
            }, 'Panel A'),
            h('div', {
              id: 'panel-b',
              style: this.showB ? undefined : { display: 'none' },
            }, 'Panel B'),
            h('div', {
              id: 'panel-c',
              style: this.showC ? undefined : { display: 'none' },
            }, 'Panel C'),
          ]);
        }
      });
      app.mount('#app');

      window.__setShowA = (val) => { showA.value = val; };
      window.__setShowB = (val) => { showB.value = val; };
      window.__setShowC = (val) => { showC.value = val; };
    }`)

    // 初始状态：A 可见，B 隐藏，C 可见
    let displayA = await page.evaluate(() => window.getComputedStyle(document.querySelector('#panel-a')).display)
    let displayB = await page.evaluate(() => window.getComputedStyle(document.querySelector('#panel-b')).display)
    let displayC = await page.evaluate(() => window.getComputedStyle(document.querySelector('#panel-c')).display)

    expect(displayA).not.toBe('none')
    expect(displayB).toBe('none')
    expect(displayC).not.toBe('none')

    // 切换：A 隐藏，B 显示，C 隐藏
    await evaluateInBrowser(page, `(args) => {
      window.__setShowA(false);
      window.__setShowB(true);
      window.__setShowC(false);
    }`)
    await nextTick(page)

    displayA = await page.evaluate(() => window.getComputedStyle(document.querySelector('#panel-a')).display)
    displayB = await page.evaluate(() => window.getComputedStyle(document.querySelector('#panel-b')).display)
    displayC = await page.evaluate(() => window.getComputedStyle(document.querySelector('#panel-c')).display)

    expect(displayA).toBe('none')
    expect(displayB).not.toBe('none')
    expect(displayC).toBe('none')

    // 所有元素都应在 DOM 中
    expect(await page.locator('#panel-a').count()).toBe(1)
    expect(await page.locator('#panel-b').count()).toBe(1)
    expect(await page.locator('#panel-c').count()).toBe(1)
  })

  test('v-show 切换不影响元素的文本内容', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(true);
      const message = ref('Persistent content');

      const app = createApp({
        setup() {
          return { visible, message };
        },
        render() {
          return h('div', null, [
            h('p', {
              id: 'show-content',
              style: this.visible ? undefined : { display: 'none' },
            }, this.message),
          ]);
        }
      });
      app.mount('#app');

      window.__toggleVisible = (val) => { visible.value = val; };
      window.__setMessage = (val) => { message.value = val; };
    }`)

    // 隐藏元素
    await evaluateInBrowser(page, `(args) => {
      window.__toggleVisible(false);
    }`)
    await nextTick(page)

    // 修改文本内容
    await evaluateInBrowser(page, `(args) => {
      window.__setMessage('Updated content');
    }`)
    await nextTick(page)

    // 重新显示
    await evaluateInBrowser(page, `(args) => {
      window.__toggleVisible(true);
    }`)
    await nextTick(page)

    // 文本内容应已更新
    const text = await getText(page, '#show-content')
    expect(text).toBe('Updated content')
  })

  test('v-show 编译器 transform 应正确生成 style 表达式', async ({ page }) => {
    // 验证编译器对 v-show 的 transform 输出
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      const compiled = compile('<div v-show="isVisible">Content</div>');
      const code = compiled.code;

      return {
        code: code,
        hasStyle: code.includes('style'),
        hasDisplayNone: code.includes('display') && code.includes('none'),
        hasCondition: code.includes('isVisible'),
      };
    }`)

    // 编译器应将 v-show 转换为包含 display:none 的条件 style
    expect(result.hasStyle).toBe(true)
    expect(result.hasDisplayNone).toBe(true)
    expect(result.hasCondition).toBe(true)
  })

  test('v-show 与事件处理配合使用', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(true);
      const clickCount = ref(0);

      const app = createApp({
        setup() {
          return { visible, clickCount };
        },
        render() {
          return h('div', null, [
            h('button', {
              id: 'toggle-btn',
              onClick: () => {
                this.visible = !this.visible;
                this.clickCount++;
              },
            }, 'Toggle'),
            h('p', {
              id: 'show-target',
              style: this.visible ? undefined : { display: 'none' },
            }, 'Target (clicks: ' + this.clickCount + ')'),
          ]);
        }
      });
      app.mount('#app');
    }`)

    // 初始可见
    let displayStyle = await page.evaluate(() => {
      return window.getComputedStyle(document.querySelector('#show-target')).display;
    })
    expect(displayStyle).not.toBe('none')

    let text = await getText(page, '#show-target')
    expect(text).toBe('Target (clicks: 0)')

    // 点击切换
    await page.click('#toggle-btn')
    await nextTick(page)

    displayStyle = await page.evaluate(() => {
      return window.getComputedStyle(document.querySelector('#show-target')).display;
    })
    expect(displayStyle).toBe('none')

    text = await getText(page, '#show-target')
    expect(text).toBe('Target (clicks: 1)')

    // 再次点击切换
    await page.click('#toggle-btn')
    await nextTick(page)

    displayStyle = await page.evaluate(() => {
      return window.getComputedStyle(document.querySelector('#show-target')).display;
    })
    expect(displayStyle).not.toBe('none')

    text = await getText(page, '#show-target')
    expect(text).toBe('Target (clicks: 2)')
  })
})
