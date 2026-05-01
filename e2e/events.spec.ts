import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('事件处理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('应该正确处理点击事件', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const count = ref(0);

      const app = createApp({
        render: () => h('button', {
          onClick: () => { count.value++; }
        }, 'Clicked: ' + count.value)
      });
      app.mount('#app');
    }`)

    // 验证初始文本
    let text = await getText(page)
    expect(text).toBe('Clicked: 0')

    // 点击按钮
    await page.click('button')
    await nextTick(page)

    text = await getText(page)
    expect(text).toBe('Clicked: 1')

    // 再次点击
    await page.click('button')
    await nextTick(page)

    text = await getText(page)
    expect(text).toBe('Clicked: 2')
  })

  test('事件处理器应该能更新数据并反映到视图', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const items = ref(['item1']);

      const app = createApp({
        render: () => h('div', null, [
          h('button', {
            id: 'add-btn',
            onClick: () => {
              items.value.push('item' + (items.value.length + 1));
            }
          }, 'Add Item'),
          h('ul', null,
            items.value.map(item => h('li', null, item))
          ),
          h('span', { id: 'count' }, 'Count: ' + items.value.length)
        ])
      });
      app.mount('#app');
    }`)

    // 验证初始状态
    let countText = await getText(page, '#count')
    expect(countText).toBe('Count: 1')

    let listItems = await page.locator('li').count()
    expect(listItems).toBe(1)

    // 点击添加按钮
    await page.click('#add-btn')
    await nextTick(page)

    countText = await getText(page, '#count')
    expect(countText).toBe('Count: 2')

    listItems = await page.locator('li').count()
    expect(listItems).toBe(2)

    // 再添加一个
    await page.click('#add-btn')
    await nextTick(page)

    countText = await getText(page, '#count')
    expect(countText).toBe('Count: 3')
  })

  test('应该支持 input 事件处理', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const text = ref('');

      const app = createApp({
        render: () => h('div', null, [
          h('input', {
            id: 'text-input',
            type: 'text',
            value: text.value,
            onInput: (e) => { text.value = e.target.value; }
          }),
          h('p', { id: 'output' }, 'You typed: ' + text.value)
        ])
      });
      app.mount('#app');
    }`)

    // 输入文本
    await page.fill('#text-input', 'hello lytjs')
    await nextTick(page)

    const output = await getText(page, '#output')
    expect(output).toBe('You typed: hello lytjs')
  })

  test('应该支持多个事件处理器', async ({ page }) => {
    await evaluateInBrowser(page, `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const log = ref([]);

      const app = createApp({
        render: () => h('div', null, [
          h('button', {
            id: 'multi-btn',
            onClick: () => { log.value = [...log.value, 'clicked']; },
            onMouseEnter: () => { log.value = [...log.value, 'hovered']; },
          }, 'Multi Event'),
          h('p', { id: 'event-log' }, log.value.join(', '))
        ])
      });
      app.mount('#app');
    }`)

    // 点击按钮
    await page.click('#multi-btn')
    await nextTick(page)

    const logText = await getText(page, '#event-log')
    expect(logText).toContain('clicked')
  })
})
