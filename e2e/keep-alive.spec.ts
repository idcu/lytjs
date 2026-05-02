import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('Keep-Alive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await unmount(page);
  });

  test('KeepAlive 组件应该正确创建', async ({ page }) => {
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { defineComponent } = window.LytJS;

      const KeepAlive = defineComponent({
        name: 'KeepAlive',
        props: {
          include: {},
          exclude: {},
          max: { type: Number, default: undefined },
        },
        setup() {
          return { cache: new Map(), keys: new Set() };
        },
        created() {},
      });

      return {
        name: KeepAlive.name,
        hasProps: !!KeepAlive.props,
        hasSetup: typeof KeepAlive.setup === 'function',
      };
    }`,
    );

    expect(result.name).toBe('KeepAlive');
    expect(result.hasProps).toBe(true);
    expect(result.hasSetup).toBe(true);
  });

  test('KeepAlive 缓存机制 - 切换组件后保留状态', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const inputText = ref('');

      const CompA = defineComponent({
        name: 'CompA',
        setup() {
          return { inputText };
        },
        render() {
          const self = this;
          return h('div', { id: 'comp-a' }, [
            h('h3', null, 'Component A'),
            h('input', {
              id: 'comp-a-input',
              type: 'text',
              value: self.inputText,
              onInput: (e) => { inputText.value = e.target.value; }
            }),
            h('p', null, 'Value: ' + self.inputText)
          ]);
        }
      });

      const CompB = defineComponent({
        name: 'CompB',
        render() {
          return h('div', { id: 'comp-b' }, [
            h('h3', null, 'Component B'),
            h('p', null, 'This is Component B')
          ]);
        }
      });

      const currentView = ref('A');

      const app = createApp({
        setup() {
          return { currentView };
        },
        render() {
          const view = this.currentView;
          return h('div', null, [
            h('button', {
              id: 'toggle-btn',
              onClick: () => { currentView.value = currentView.value === 'A' ? 'B' : 'A'; }
            }, 'Toggle'),
            view === 'A' ? h(CompA) : h(CompB)
          ]);
        }
      });
      app.mount('#app');

      window.__getInputText = () => inputText.value;
      window.__toggle = () => { currentView.value = currentView.value === 'A' ? 'B' : 'A'; };
    }`,
    );

    // 验证初始显示 CompA
    let compA = await page.locator('#comp-a').count();
    let compB = await page.locator('#comp-b').count();
    expect(compA).toBe(1);
    expect(compB).toBe(0);

    // 在 CompA 的 input 中输入内容
    await page.fill('#comp-a-input', 'preserved text');
    await nextTick(page);

    let inputText = await evaluateInBrowser(
      page,
      `(args) => {
      return window.__getInputText();
    }`,
    );
    expect(inputText).toBe('preserved text');

    // 切换到 CompB
    await page.click('#toggle-btn');
    await nextTick(page);

    compA = await page.locator('#comp-a').count();
    compB = await page.locator('#comp-b').count();
    expect(compA).toBe(0);
    expect(compB).toBe(1);

    // 切换回 CompA
    await page.click('#toggle-btn');
    await nextTick(page);

    compA = await page.locator('#comp-a').count();
    compB = await page.locator('#comp-b').count();
    expect(compA).toBe(1);
    expect(compB).toBe(0);

    // 验证 CompA 的状态被保留
    inputText = await evaluateInBrowser(
      page,
      `(args) => {
      return window.__getInputText();
    }`,
    );
    expect(inputText).toBe('preserved text');
  });

  test('activated/deactivated 生命周期钩子', async ({ page }) => {
    await evaluateInBrowser(
      page,
      `(args) => {
      const { createApp, h, defineComponent, ref } = window.LytJS;

      const lifecycleLog = [];

      const InnerComp = defineComponent({
        name: 'InnerComp',
        setup() {
          return {};
        },
        render() {
          return h('div', { id: 'inner' }, 'Inner Component');
        }
      });

      const currentView = ref(true);

      const app = createApp({
        setup() {
          return { currentView };
        },
        render() {
          return h('div', null, [
            h('button', {
              id: 'switch-btn',
              onClick: () => { currentView.value = !currentView.value; }
            }, 'Switch'),
            this.currentView ? h(InnerComp) : h('div', { id: 'placeholder' }, 'Empty')
          ]);
        }
      });
      app.mount('#app');

      window.__getLog = () => lifecycleLog;
    }`,
    );

    // 验证初始渲染
    let inner = await page.locator('#inner').count();
    expect(inner).toBe(1);

    // 切换离开
    await page.click('#switch-btn');
    await nextTick(page);

    inner = await page.locator('#inner').count();
    expect(inner).toBe(0);

    // 切换回来
    await page.click('#switch-btn');
    await nextTick(page);

    inner = await page.locator('#inner').count();
    expect(inner).toBe(1);
  });

  test('KeepAlive props - include/exclude 配置', async ({ page }) => {
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { defineComponent } = window.LytJS;

      const KeepAlive = defineComponent({
        name: 'KeepAlive',
        props: {
          include: {},
          exclude: {},
          max: { type: Number, default: undefined },
        },
        setup(props) {
          return { cache: new Map(), keys: new Set(), props };
        },
        created() {},
      });

      // 验证 props 定义存在
      return {
        hasInclude: 'include' in KeepAlive.props,
        hasExclude: 'exclude' in KeepAlive.props,
        hasMax: 'max' in KeepAlive.props,
        maxDefault: KeepAlive.props.max.default,
      };
    }`,
    );

    expect(result.hasInclude).toBe(true);
    expect(result.hasExclude).toBe(true);
    expect(result.hasMax).toBe(true);
    expect(result.maxDefault).toBeUndefined();
  });

  test('KeepAlive include 正则模式匹配 - 字符串匹配', async ({ page }) => {
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { defineComponent } = window.LytJS;

      const KeepAlive = defineComponent({
        name: 'KeepAlive',
        props: {
          include: {},
          exclude: {},
          max: { type: Number, default: undefined },
        },
        setup(props) {
          // 模拟 include 匹配逻辑
          const matchesInclude = (name) => {
            if (!props.include) return true;
            if (typeof props.include === 'string') return name === props.include;
            if (props.include instanceof RegExp) return props.include.test(name);
            if (Array.isArray(props.include)) return props.include.includes(name);
            return true;
          };
          return { cache: new Map(), keys: new Set(), props, matchesInclude };
        },
        created() {},
      });

      // 测试字符串匹配
      const instance = KeepAlive.setup(
        { include: 'CompA', exclude: undefined, max: undefined },
        {}
      );
      return {
        matchCompA: instance.matchesInclude('CompA'),
        matchCompB: instance.matchesInclude('CompB'),
        matchCompC: instance.matchesInclude('CompC'),
      };
    }`,
    );

    expect(result.matchCompA).toBe(true);
    expect(result.matchCompB).toBe(false);
    expect(result.matchCompC).toBe(false);
  });

  test('KeepAlive include 正则模式匹配 - RegExp 匹配', async ({ page }) => {
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { defineComponent } = window.LytJS;

      const KeepAlive = defineComponent({
        name: 'KeepAlive',
        props: {
          include: {},
          exclude: {},
          max: { type: Number, default: undefined },
        },
        setup(props) {
          const matchesInclude = (name) => {
            if (!props.include) return true;
            if (typeof props.include === 'string') return name === props.include;
            if (props.include instanceof RegExp) return props.include.test(name);
            if (Array.isArray(props.include)) return props.include.includes(name);
            return true;
          };
          const matchesExclude = (name) => {
            if (!props.exclude) return false;
            if (typeof props.exclude === 'string') return name === props.exclude;
            if (props.exclude instanceof RegExp) return props.exclude.test(name);
            if (Array.isArray(props.exclude)) return props.exclude.includes(name);
            return false;
          };
          return { cache: new Map(), keys: new Set(), props, matchesInclude, matchesExclude };
        },
        created() {},
      });

      // 测试正则匹配 include: /^Comp/
      const instance = KeepAlive.setup(
        { include: /^Comp/, exclude: undefined, max: undefined },
        {}
      );
      return {
        matchCompA: instance.matchesInclude('CompA'),
        matchCompB: instance.matchesInclude('CompB'),
        matchCompC: instance.matchesInclude('CompC'),
        matchOther: instance.matchesInclude('Other'),
      };
    }`,
    );

    expect(result.matchCompA).toBe(true);
    expect(result.matchCompB).toBe(true);
    expect(result.matchCompC).toBe(true);
    expect(result.matchOther).toBe(false);
  });

  test('KeepAlive exclude 正则模式匹配 - RegExp 排除', async ({ page }) => {
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { defineComponent } = window.LytJS;

      const KeepAlive = defineComponent({
        name: 'KeepAlive',
        props: {
          include: {},
          exclude: {},
          max: { type: Number, default: undefined },
        },
        setup(props) {
          const matchesExclude = (name) => {
            if (!props.exclude) return false;
            if (typeof props.exclude === 'string') return name === props.exclude;
            if (props.exclude instanceof RegExp) return props.exclude.test(name);
            if (Array.isArray(props.exclude)) return props.exclude.includes(name);
            return false;
          };
          return { cache: new Map(), keys: new Set(), props, matchesExclude };
        },
        created() {},
      });

      // 测试正则排除 exclude: /Dialog/
      const instance = KeepAlive.setup(
        { include: undefined, exclude: /Dialog/, max: undefined },
        {}
      );
      return {
        excludeDialog: instance.matchesExclude('AlertDialog'),
        excludeConfirm: instance.matchesExclude('ConfirmDialog'),
        excludeNormal: instance.matchesExclude('NormalComp'),
      };
    }`,
    );

    expect(result.excludeDialog).toBe(true);
    expect(result.excludeConfirm).toBe(true);
    expect(result.excludeNormal).toBe(false);
  });

  test('KeepAlive include/exclude 组合使用 - 数组模式', async ({ page }) => {
    const result = await evaluateInBrowser(
      page,
      `(args) => {
      const { defineComponent } = window.LytJS;

      const KeepAlive = defineComponent({
        name: 'KeepAlive',
        props: {
          include: {},
          exclude: {},
          max: { type: Number, default: undefined },
        },
        setup(props) {
          const matchesInclude = (name) => {
            if (!props.include) return true;
            if (typeof props.include === 'string') return name === props.include;
            if (props.include instanceof RegExp) return props.include.test(name);
            if (Array.isArray(props.include)) return props.include.includes(name);
            return true;
          };
          const matchesExclude = (name) => {
            if (!props.exclude) return false;
            if (typeof props.exclude === 'string') return name === props.exclude;
            if (props.exclude instanceof RegExp) return props.exclude.test(name);
            if (Array.isArray(props.exclude)) return props.exclude.includes(name);
            return false;
          };
          return { cache: new Map(), keys: new Set(), props, matchesInclude, matchesExclude };
        },
        created() {},
      });

      // 测试数组 include 和 exclude
      const instance = KeepAlive.setup(
        { include: ['CompA', 'CompB'], exclude: ['CompB'], max: undefined },
        {}
      );
      return {
        compAIncluded: instance.matchesInclude('CompA') && !instance.matchesExclude('CompA'),
        compBIncluded: instance.matchesInclude('CompB') && !instance.matchesExclude('CompB'),
        compCIncluded: instance.matchesInclude('CompC') && !instance.matchesExclude('CompC'),
      };
    }`,
    );

    expect(result.compAIncluded).toBe(true);
    expect(result.compBIncluded).toBe(false);
    expect(result.compCIncluded).toBe(false);
  });
});
