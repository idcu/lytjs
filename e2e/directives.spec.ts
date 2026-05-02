import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('指令', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await unmount(page);
  });

  test('v-if 条件渲染 - 显示元素', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const show = ref(true);

      window.__toggleShow = (val) => { show.value = val; };

      const app = createApp({
        render: () => h('div', null, [
          h('p', null, 'Always visible'),
          show.value ? h('p', { id: 'conditional' }, 'Conditionally visible') : null,
        ])
      });
      app.mount('#app');
    }`,
    );

    // 条件为 true 时应该显示
    const html = await getHTML(page);
    expect(html).toContain('Always visible');
    expect(html).toContain('Conditionally visible');

    const conditionalEl = await page.locator('#conditional').count();
    expect(conditionalEl).toBe(1);
  });

  test('v-if 条件渲染 - 隐藏元素', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const show = ref(false);

      window.__toggleShow = (val) => { show.value = val; };

      const app = createApp({
        render: () => h('div', null, [
          h('p', null, 'Always visible'),
          show.value ? h('p', { id: 'conditional' }, 'Conditionally visible') : null,
        ])
      });
      app.mount('#app');
    }`,
    );

    // 条件为 false 时应该不显示
    const html = await getHTML(page);
    expect(html).toContain('Always visible');
    expect(html).not.toContain('Conditionally visible');

    const conditionalEl = await page.locator('#conditional').count();
    expect(conditionalEl).toBe(0);
  });

  test('v-if 条件切换', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const visible = ref(true);

      window.__setVisible = (val) => { visible.value = val; };

      const app = createApp({
        render: () => h('div', null, [
          visible.value
            ? h('span', { id: 'panel-a' }, 'Panel A')
            : h('span', { id: 'panel-b' }, 'Panel B'),
        ])
      });
      app.mount('#app');
    }`,
    );

    // 初始状态 - Panel A 可见
    let panelA = await page.locator('#panel-a').count();
    let panelB = await page.locator('#panel-b').count();
    expect(panelA).toBe(1);
    expect(panelB).toBe(0);

    // 切换到 Panel B
    await evaluateInBrowser(
      page,
      `(args) => {
      window.__setVisible(false);
    }`,
    );
    await nextTick(page);

    panelA = await page.locator('#panel-a').count();
    panelB = await page.locator('#panel-b').count();
    expect(panelA).toBe(0);
    expect(panelB).toBe(1);

    // 切换回 Panel A
    await evaluateInBrowser(
      page,
      `(args) => {
      window.__setVisible(true);
    }`,
    );
    await nextTick(page);

    panelA = await page.locator('#panel-a').count();
    panelB = await page.locator('#panel-b').count();
    expect(panelA).toBe(1);
    expect(panelB).toBe(0);
  });

  test('v-for 列表渲染', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const items = ref(['Apple', 'Banana', 'Cherry']);

      window.__setItems = (val) => { items.value = val; };
      window.__addItem = (item) => { items.value = [...items.value, item]; };

      const app = createApp({
        render: () => h('ul', null,
          items.value.map((item, index) =>
            h('li', { key: index }, item)
          )
        )
      });
      app.mount('#app');
    }`,
    );

    // 验证初始列表
    let listItems = await page.locator('li').allTextContents();
    expect(listItems).toEqual(['Apple', 'Banana', 'Cherry']);

    // 添加新项
    await evaluateInBrowser(
      page,
      `(args) => {
      window.__addItem('Durian');
    }`,
    );
    await nextTick(page);

    listItems = await page.locator('li').allTextContents();
    expect(listItems).toEqual(['Apple', 'Banana', 'Cherry', 'Durian']);
  });

  test('v-for 列表渲染 - 空列表', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const items = ref([]);

      const app = createApp({
        render: () => h('ul', null,
          items.value.length > 0
            ? items.value.map((item, index) => h('li', { key: index }, item))
            : h('li', null, 'No items')
        )
      });
      app.mount('#app');
    }`,
    );

    const text = await getText(page);
    expect(text).toBe('No items');
  });

  test('v-for 列表渲染 - 更新整个列表', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const items = ref(['one', 'two']);

      window.__setItems = (val) => { items.value = val; };

      const app = createApp({
        render: () => h('ul', null,
          items.value.map((item, index) =>
            h('li', { key: index }, item)
          )
        )
      });
      app.mount('#app');
    }`,
    );

    let listItems = await page.locator('li').allTextContents();
    expect(listItems).toEqual(['one', 'two']);

    // 替换整个列表
    await evaluateInBrowser(
      page,
      `(args) => {
      window.__setItems(['a', 'b', 'c', 'd']);
    }`,
    );
    await nextTick(page);

    listItems = await page.locator('li').allTextContents();
    expect(listItems).toEqual(['a', 'b', 'c', 'd']);
  });

  test('v-for 渲染对象列表', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const users = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const app = createApp({
        render: () => h('ul', null,
          users.value.map(user =>
            h('li', { key: user.id }, user.name + ' (ID: ' + user.id + ')')
          )
        )
      });
      app.mount('#app');
    }`,
    );

    const listItems = await page.locator('li').allTextContents();
    expect(listItems).toEqual(['Alice (ID: 1)', 'Bob (ID: 2)']);
  });
});
