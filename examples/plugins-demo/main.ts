/**
 * LytJS 插件系统示例
 *
 * ⚠️ 2026-11-02 重写说明：
 *   本示例此前 import 了 6 个 `@lytjs/plugin-*` 包（theme / logger / auth /
 *   storage / i18n / chart），而这些包已于 2026-09-21 **迁出主仓**到独立仓库
 *   `lytjs-plugins`（见 packages/plugins/README.md）。主仓内已无这些包，
 *   该示例在浏览器里打开就是 `Failed to resolve import`。
 *
 *   现改为演示主仓**真实可用**的插件 API：`definePlugin` + `app.use()`。
 *   这正是 `@lytjs/plugin-*` 那些包内部使用的同一套机制。
 *
 * 运行：在 examples/ 下用 Vite（`pnpm dev`）或任意支持 bare-specifier 解析的
 *       dev server 打开 plugins-demo/index.html。
 */
/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { createApp, ref, definePlugin } from '@lytjs/core';

// ─────────────────────────────────────────────────────────────
// 1. 定义插件：主题插件
//
// definePlugin 的关键能力是**带 schema 的配置校验**：
//   · 用户传入的选项会先按 schema 校验 + 填默认值，再交给 install()
//   · 配置不合法会在安装时抛错，而不是等到运行时才炸
// ─────────────────────────────────────────────────────────────
const themePlugin = definePlugin<{ defaultTheme: 'light' | 'dark' }>({
  name: 'demo-theme',
  version: '1.0.0',
  description: '主题切换插件（演示 definePlugin + schema 校验）',
  schema: {
    type: 'object',
    object: {
      properties: {
        defaultTheme: {
          type: 'string',
          string: { enum: ['light', 'dark'] },
          default: 'light',
        },
      },
    },
  },
  install(app: any, options) {
    // options 已经过 schema 校验，defaultTheme 一定有值
    const current = ref<'light' | 'dark'>(options.defaultTheme);

    const apply = (theme: 'light' | 'dark') => {
      current.value = theme;
      document.body.dataset.theme = theme;
    };

    apply(current.value);

    // 挂到 globalProperties —— 组件实例代理会解析 `$theme`
    app.config.globalProperties.$theme = {
      current,
      set: apply,
      toggle: () => apply(current.value === 'light' ? 'dark' : 'light'),
    };

    console.log(`[theme] 已安装，默认主题 = ${options.defaultTheme}`);
  },
});

// ─────────────────────────────────────────────────────────────
// 2. 定义插件：日志插件
// ─────────────────────────────────────────────────────────────
const loggerPlugin = definePlugin<{ level: 'debug' | 'info' | 'warn' | 'error' }>({
  name: 'demo-logger',
  version: '1.0.0',
  description: '日志插件（演示 app.use 时传入选项）',
  schema: {
    type: 'object',
    object: {
      properties: {
        level: {
          type: 'string',
          string: { enum: ['debug', 'info', 'warn', 'error'] },
          default: 'info',
        },
      },
    },
  },
  install(app: any, options) {
    const logs = ref<string[]>([]);
    const order = ['debug', 'info', 'warn', 'error'];
    const minIndex = order.indexOf(options.level);

    const push = (level: string, msg: string) => {
      if (order.indexOf(level) < minIndex) return;
      const line = `[${level}] ${msg}`;
      logs.value = [...logs.value, line];
      console.log(line);
    };

    app.config.globalProperties.$logger = {
      logs,
      debug: (m: string) => push('debug', m),
      info: (m: string) => push('info', m),
      warn: (m: string) => push('warn', m),
      error: (m: string) => push('error', m),
      clear: () => {
        logs.value = [];
      },
    };

    console.log(`[logger] 已安装，级别 = ${options.level}`);
  },
});

// ─────────────────────────────────────────────────────────────
// 3. 应用
// ─────────────────────────────────────────────────────────────
const App = {
  name: 'PluginsDemo',
  template: `
    <div class="container">
      <h1>LytJS 插件系统示例</h1>

      <section class="section">
        <h2>主题插件</h2>
        <p>当前主题：<strong class="theme-name">{{ $theme.current.value }}</strong></p>
        <button class="btn-light" @click="$theme.set('light')">浅色</button>
        <button class="btn-dark" @click="$theme.set('dark')">深色</button>
        <button class="btn-toggle" @click="$theme.toggle()">切换</button>
      </section>

      <section class="section">
        <h2>日志插件</h2>
        <button class="btn-info" @click="$logger.info('这是一条 info 日志')">info</button>
        <button class="btn-warn" @click="$logger.warn('这是一条 warn 日志')">warn</button>
        <button class="btn-error" @click="$logger.error('这是一条 error 日志')">error</button>
        <button class="btn-clear" @click="$logger.clear()">清空</button>
        <ul class="log-list">
          <li v-for="(line, i) in $logger.logs.value" :key="i">{{ line }}</li>
        </ul>
      </section>
    </div>
  `,
};

const app = createApp(App);

// ── 安装插件：选项会先过 schema 校验 ──────────────────────
app.use(themePlugin, { defaultTheme: 'light' });
app.use(loggerPlugin, { level: 'info' });

app.mount('#app');

console.log('LytJS 插件示例初始化完成');
