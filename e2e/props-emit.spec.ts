import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('组件通信 - Props', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await unmount(page);
  });

  test('父组件向子组件传递 props 并正确渲染', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent } = window.LytJS;

      const ChildComp = defineComponent({
        props: { message: String, count: Number },
        render() {
          const { message, count } = this.props;
          return h('div', { class: 'child' }, message + ' - ' + count);
        }
      });

      const app = createApp({
        render() {
          return h(ChildComp, { message: 'Hello Props', count: 42 });
        }
      });
      app.mount('#app');
    }`,
    );

    const html = await getHTML(page);
    expect(html).toContain('Hello Props - 42');
  });

  test('props 响应式更新时子组件自动更新', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const message = ref('initial');

      const ChildComp = defineComponent({
        props: { text: String },
        render() {
          return h('span', { id: 'child-text' }, this.props.text);
        }
      });

      const app = createApp({
        setup() {
          return { message };
        },
        render() {
          return h(ChildComp, { text: message.value });
        }
      });
      app.mount('#app');

      window.__updateMessage = (val) => { message.value = val; };
    }`,
    );

    let text = await getText(page, '#child-text');
    expect(text).toBe('initial');

    await evaluateInBrowser(
      page,
      `(args) => {
      window.__updateMessage('updated');
    }`,
    );
    await nextTick(page);

    text = await getText(page, '#child-text');
    expect(text).toBe('updated');
  });

  test('props 默认值在未传递时生效', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent } = window.LytJS;

      const ChildComp = defineComponent({
        props: {
          title: { type: String, default: 'Default Title' },
          count: { type: Number, default: 0 },
        },
        render() {
          return h('div', { id: 'defaults' }, this.props.title + ':' + this.props.count);
        }
      });

      const app = createApp({
        render() {
          return h(ChildComp, {});
        }
      });
      app.mount('#app');
    }`,
    );

    const text = await getText(page, '#defaults');
    expect(text).toBe('Default Title:0');
  });

  test('多个 props 同时传递', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent } = window.LytJS;

      const ChildComp = defineComponent({
        props: { a: String, b: Number, c: Boolean },
        render() {
          return h('div', { id: 'multi-props' },
            String(this.props.a) + '-' + this.props.b + '-' + this.props.c
          );
        }
      });

      const app = createApp({
        render() {
          return h(ChildComp, { a: 'x', b: 99, c: true });
        }
      });
      app.mount('#app');
    }`,
    );

    const text = await getText(page, '#multi-props');
    expect(text).toBe('x-99-true');
  });
});

test.describe('组件通信 - Emit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await unmount(page);
  });

  test('子组件触发 emit 事件，父组件正确接收', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const receivedEvents = ref([]);

      const ChildComp = defineComponent({
        emits: ['custom-event'],
        setup(props, ctx) {
          return {
            triggerEvent: () => {
              ctx.emit('custom-event', 'payload-data');
            }
          };
        },
        render() {
          return h('button', {
            id: 'emit-btn',
            onClick: () => { this.triggerEvent(); }
          }, 'Emit Event');
        }
      });

      const app = createApp({
        setup() {
          return { receivedEvents };
        },
        render() {
          return h(ChildComp, {
            'onCustom-event': (payload) => {
              receivedEvents.value = [...receivedEvents.value, payload];
            }
          });
        }
      });
      app.mount('#app');

      window.__getEvents = () => receivedEvents.value;
    }`,
    );

    await page.click('#emit-btn');
    await nextTick(page);

    const events = await evaluateInBrowser(
      page,
      `(args) => {
      return window.__getEvents();
    }`,
    );
    expect(events).toContain('payload-data');
  });

  test('emit 事件传递多个参数', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const lastArgs = ref(null);

      const ChildComp = defineComponent({
        emits: ['multi-arg'],
        setup(props, ctx) {
          return {
            emitMulti: () => {
              ctx.emit('multi-arg', 1, 'two', { three: true });
            }
          };
        },
        render() {
          return h('button', {
            id: 'multi-emit-btn',
            onClick: () => { this.emitMulti(); }
          }, 'Emit Multi');
        }
      });

      const app = createApp({
        setup() {
          return { lastArgs };
        },
        render() {
          return h(ChildComp, {
            'onMulti-arg': (a, b, c) => {
              lastArgs.value = { a, b, c };
            }
          });
        }
      });
      app.mount('#app');

      window.__getLastArgs = () => lastArgs.value;
    }`,
    );

    await page.click('#multi-emit-btn');
    await nextTick(page);

    const args = await evaluateInBrowser(
      page,
      `(args) => {
      return window.__getLastArgs();
    }`,
    );
    expect(args).toEqual({ a: 1, b: 'two', c: { three: true } });
  });

  test('emit 多次触发累积事件', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const clickCount = ref(0);

      const ChildComp = defineComponent({
        emits: ['increment'],
        setup(props, ctx) {
          return {};
        },
        render() {
          const ctx2 = this;
          return h('button', {
            id: 'inc-btn',
            onClick: () => { ctx2.$emit('increment'); }
          }, 'Increment');
        }
      });

      const app = createApp({
        setup() {
          return { clickCount };
        },
        render() {
          return h('div', null, [
            h(ChildComp, {
              'onIncrement': () => { clickCount.value++; }
            }),
            h('span', { id: 'counter' }, 'Count: ' + clickCount.value)
          ]);
        }
      });
      app.mount('#app');

      window.__getCount = () => clickCount.value;
    }`,
    );

    await page.click('#inc-btn');
    await nextTick(page);
    await page.click('#inc-btn');
    await nextTick(page);
    await page.click('#inc-btn');
    await nextTick(page);

    const count = await evaluateInBrowser(
      page,
      `(args) => {
      return window.__getCount();
    }`,
    );
    expect(count).toBe(3);
  });
});
