import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

/**
 * v-model E2E 测试
 *
 * v-model 在 LytJS 中是编译器级别的 transform（transformModel），
 * 将 `v-model="text"` 编译为：
 *   - modelValue: text
 *   - onUpdate:modelValue: $event => (text = $event)
 *
 * 在 E2E 测试中，我们通过 h() 函数手动模拟编译器输出，
 * 使用 modelValue + onUpdate:modelValue props 实现双向绑定。
 */
test.describe('v-model 双向绑定', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await unmount(page);
  });

  test('v-model (input) - 初始值应正确显示', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const text = ref('Hello LytJS');

      const app = createApp({
        setup() {
          return { text };
        },
        render() {
          return h('div', null, [
            // 模拟 v-model="text" 的编译器输出
            h('input', {
              id: 'model-input',
              type: 'text',
              modelValue: this.text,
              'onUpdate:modelValue': (val) => { this.text = val; },
            }),
            h('p', { id: 'model-display' }, this.text),
          ]);
        }
      });
      app.mount('#app');

      window.__getModelText = () => text.value;
      window.__setModelText = (val) => { text.value = val; };
    }`,
    );

    // 验证初始值
    const inputValue = await page.inputValue('#model-input');
    expect(inputValue).toBe('Hello LytJS');

    const displayText = await getText(page, '#model-display');
    expect(displayText).toBe('Hello LytJS');
  });

  test('v-model (input) - input 事件应更新绑定值', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const text = ref('');

      const app = createApp({
        setup() {
          return { text };
        },
        render() {
          return h('div', null, [
            h('input', {
              id: 'model-input',
              type: 'text',
              modelValue: this.text,
              'onUpdate:modelValue': (val) => { this.text = val; },
            }),
            h('p', { id: 'model-display' }, this.text),
          ]);
        }
      });
      app.mount('#app');

      window.__getModelText = () => text.value;
    }`,
    );

    // 通过 Playwright 填入输入值
    await page.fill('#model-input', 'User typed text');
    await nextTick(page);

    // 验证显示文本是否同步更新
    const displayText = await getText(page, '#model-display');
    expect(displayText).toBe('User typed text');

    // 验证 ref 值是否更新
    const modelText = await evaluateInBrowser(
      page,
      `(args) => {
      return window.__getModelText();
    }`,
    );
    expect(modelText).toBe('User typed text');
  });

  test('v-model (input) - 程序化更新 ref 值应反映到 input 元素', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const text = ref('initial');

      const app = createApp({
        setup() {
          return { text };
        },
        render() {
          return h('div', null, [
            h('input', {
              id: 'model-input',
              type: 'text',
              modelValue: this.text,
              'onUpdate:modelValue': (val) => { this.text = val; },
            }),
          ]);
        }
      });
      app.mount('#app');

      window.__setModelText = (val) => { text.value = val; };
    }`,
    );

    // 验证初始值
    let inputValue = await page.inputValue('#model-input');
    expect(inputValue).toBe('initial');

    // 程序化更新
    await evaluateInBrowser(
      page,
      `(args) => {
      window.__setModelText('programmatic update');
    }`,
    );
    await nextTick(page);

    // 验证 input 元素值已更新
    inputValue = await page.inputValue('#model-input');
    expect(inputValue).toBe('programmatic update');
  });

  test('v-model (textarea) - 多行文本双向绑定', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const content = ref('Line 1');

      const app = createApp({
        setup() {
          return { content };
        },
        render() {
          return h('div', null, [
            h('textarea', {
              id: 'model-textarea',
              modelValue: this.content,
              'onUpdate:modelValue': (val) => { this.content = val; },
            }),
            h('p', { id: 'model-text-display' }, this.content),
          ]);
        }
      });
      app.mount('#app');

      window.__getContent = () => content.value;
    }`,
    );

    // 验证初始值
    const textareaValue = await page.inputValue('#model-textarea');
    expect(textareaValue).toBe('Line 1');

    // 填入新值
    await page.fill('#model-textarea', 'Line 1\nLine 2\nLine 3');
    await nextTick(page);

    // 验证同步
    const displayText = await getText(page, '#model-text-display');
    expect(displayText).toBe('Line 1\nLine 2\nLine 3');
  });

  test('v-model (checkbox) - 布尔值双向绑定', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const checked = ref(false);

      const app = createApp({
        setup() {
          return { checked };
        },
        render() {
          return h('div', null, [
            h('input', {
              id: 'model-checkbox',
              type: 'checkbox',
              modelValue: this.checked,
              'onUpdate:modelValue': (val) => { this.checked = val; },
            }),
            h('span', { id: 'model-checkbox-display' }, this.checked ? 'checked' : 'unchecked'),
          ]);
        }
      });
      app.mount('#app');

      window.__getChecked = () => checked.value;
      window.__setChecked = (val) => { checked.value = val; };
    }`,
    );

    // 初始状态 - 未选中
    let isChecked = await page.isChecked('#model-checkbox');
    expect(isChecked).toBe(false);

    let displayText = await getText(page, '#model-checkbox-display');
    expect(displayText).toBe('unchecked');

    // 点击选中
    await page.check('#model-checkbox');
    await nextTick(page);

    isChecked = await page.isChecked('#model-checkbox');
    expect(isChecked).toBe(true);

    displayText = await getText(page, '#model-checkbox-display');
    expect(displayText).toBe('checked');

    // 程序化取消选中
    await evaluateInBrowser(
      page,
      `(args) => {
      window.__setChecked(false);
    }`,
    );
    await nextTick(page);

    isChecked = await page.isChecked('#model-checkbox');
    expect(isChecked).toBe(false);

    displayText = await getText(page, '#model-checkbox-display');
    expect(displayText).toBe('unchecked');
  });

  test('v-model - 多个输入框独立绑定', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref } = window.LytJS;
      const firstName = ref('');
      const lastName = ref('');

      const app = createApp({
        setup() {
          return { firstName, lastName };
        },
        render() {
          return h('div', null, [
            h('input', {
              id: 'first-name',
              type: 'text',
              placeholder: 'First Name',
              modelValue: this.firstName,
              'onUpdate:modelValue': (val) => { this.firstName = val; },
            }),
            h('input', {
              id: 'last-name',
              type: 'text',
              placeholder: 'Last Name',
              modelValue: this.lastName,
              'onUpdate:modelValue': (val) => { this.lastName = val; },
            }),
            h('p', { id: 'full-name' }, this.firstName + ' ' + this.lastName),
          ]);
        }
      });
      app.mount('#app');
    }`,
    );

    // 填入 first name
    await page.fill('#first-name', 'John');
    await nextTick(page);

    let fullName = await getText(page, '#full-name');
    expect(fullName).toBe('John ');

    // 填入 last name
    await page.fill('#last-name', 'Doe');
    await nextTick(page);

    fullName = await getText(page, '#full-name');
    expect(fullName).toBe('John Doe');

    // 验证两个输入框独立
    const firstNameValue = await page.inputValue('#first-name');
    const lastNameValue = await page.inputValue('#last-name');
    expect(firstNameValue).toBe('John');
    expect(lastNameValue).toBe('Doe');
  });

  test('v-model - 与 computed 配合使用', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, ref, computed } = window.LytJS;
      const text = ref('hello');

      const upperText = computed(() => text.value.toUpperCase());

      const app = createApp({
        setup() {
          return { text, upperText };
        },
        render() {
          return h('div', null, [
            h('input', {
              id: 'computed-input',
              type: 'text',
              modelValue: this.text,
              'onUpdate:modelValue': (val) => { this.text = val; },
            }),
            h('p', { id: 'computed-upper' }, this.upperText),
          ]);
        }
      });
      app.mount('#app');
    }`,
    );

    // 初始 computed 值
    let upperText = await getText(page, '#computed-upper');
    expect(upperText).toBe('HELLO');

    // 更新 input
    await page.fill('#computed-input', 'world');
    await nextTick(page);

    upperText = await getText(page, '#computed-upper');
    expect(upperText).toBe('WORLD');
  });

  test('v-model - 编译器 transform 应正确生成 modelValue 和 onUpdate:modelValue', async ({
    page,
  }) => {
    // 验证编译器对 v-model 的 transform 输出
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { compile } = window.LytJS;

      const compiled = compile('<input v-model="text" type="text" />');
      const code = compiled.code;

      return {
        code: code,
        hasModelValue: code.includes('modelValue'),
        hasOnUpdateModelValue: code.includes('onUpdate:modelValue'),
        hasTextInput: code.includes('text'),
      };
    }`,
    );

    // 编译器应将 v-model 转换为 modelValue + onUpdate:modelValue
    expect(result.hasModelValue).toBe(true);
    expect(result.hasOnUpdateModelValue).toBe(true);
  });
});
