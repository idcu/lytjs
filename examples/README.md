# LytJS 示例项目

本目录包含使用 LytJS 构建的示例，覆盖响应式、组件、模板、状态管理、SSR、插件等场景。

> ⚠️ **示例也受门禁约束**：`node scripts/check-examples.mjs` 会校验本目录下所有
> `@lytjs/*` 裸导入都能在本仓解析，且不得用相对路径穿透到包源码。
> 改动示例后请跑一次（它也是 `node scripts/gate.mjs` 的 fast 档之一）。

---

## 一、从哪个开始

| 顺序 | 示例 | 说明 | 怎么跑 |
|---|---|---|---|
| 1 | [`getting-started/demo.mjs`](./getting-started/demo.mjs) | **最小可运行**：ref/computed、v-if/v-for、子组件 props+emit、SSR→挂载→交互 | `node examples/getting-started/demo.mjs` |
| 2 | [`counter/index.html`](./counter/) | 计数器：`createApp` + `ref` + `computed` + 模板 | 浏览器 / dev server 打开 |
| 3 | [`complete-todo/main.ts`](./complete-todo/) | 待办应用：组件拆分 + `watch` | `pnpm dev` 后打开 |
| 4 | [`ssr-complete-example.ts`](./ssr-complete-example.ts) | 服务端渲染：`createVNode` 建树 + `renderToString` / `renderToStream` + 状态序列化 | `npx tsx examples/ssr-complete-example.ts` |
| 5 | [`plugins-demo/main.ts`](./plugins-demo/) | 插件系统：`definePlugin` + schema 校验 + `app.use()` | `pnpm dev` 后打开 |

`docs/GETTING_STARTED.md` 有配套的文字说明。

---

## 二、完整清单

### 可运行（推荐）

| 示例 | 要点 |
|---|---|
| [`getting-started/`](./getting-started/) | Node 直跑；SSR 与客户端初始结构一致 |
| [`counter/`](./counter/) | `createApp` + 模板 + 响应式 |
| [`complete-todo/`](./complete-todo/) | 组件化 + 状态 |
| [`admin-dashboard/`](./admin-dashboard/) | 复杂布局 + 组件组合 |
| [`plugins-demo/`](./plugins-demo/) | `definePlugin` / `app.use` / schema 校验 |
| [`slots-demo/`](./slots-demo/) | 具名插槽 / 作用域插槽 / 插槽内 v-for |
| [`hello/`](./hello/) · [`my-first/`](./my-first/) | 最小 `createApp` 示例 |
| [`ssr-complete-example.ts`](./ssr-complete-example.ts) | SSR + 流式渲染 |
| [`using-lytjs-as-dep/`](./using-lytjs-as-dep/) | 把 LytJS 当外部依赖用（含 Vite 配置） |
| [`ui-components/`](./ui-components/) | UI 组件展示（静态页） |

### 「响应式库」用法（不经过 createApp）

下面这些示例直接用 `@lytjs/reactivity` 的 `signal` / `computed` / `effect`
配合手写 DOM 更新。**这是合法用法**——响应式是独立可用的，不强制走组件系统；
但它们是「把 LytJS 当响应式库」，不是「用 LytJS 写组件」，读的时候请注意区分。

- [`todo/`](./todo/)
- [`ecommerce-cart/`](./ecommerce-cart/)
- [`user-management/`](./user-management/)
- [`weather-dashboard/`](./weather-dashboard/)

> 这几个示例里的表单校验用的是**本地最小实现**（`createFormManager` 的等价内联版本），
> 因为 `@lytjs/plugin-form` 已迁出主仓（见下）。

### 纯 VNode 构建（不是可直接打开的应用）

- [`admin-dashboard-example.ts`](./admin-dashboard-example.ts)
- [`data-visualization-example.ts`](./data-visualization-example.ts)
- [`social-media-example.ts`](./social-media-example.ts)

这些文件用 `createVNode` 手工搭组件树并导出组件，**没有调用 `createApp().mount()`**，
用途是展示 VNode 构造方式与样式组织，不是完整应用。需要可运行的版本请看
`admin-dashboard/` 与 `counter/`。

---

## 三、`@lytjs/plugin-*` 已不在主仓

2026-09-21 起，13 个 `@lytjs/plugin-*`（theme / logger / auth / storage / i18n /
form / chart / animation …）的源码已迁到**独立仓库 `lytjs-plugins`**，
主仓 `packages/plugins/` 只保留说明（见其 `README.md`）。

⇒ **主仓示例不应再 `import '@lytjs/plugin-xxx'`**，否则打开即
`Failed to resolve import`。要用这些插件请从 npm 安装。

主仓里**真实可用**的插件机制是：

```ts
import { createApp, definePlugin } from '@lytjs/core';

const myPlugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  schema: {
    type: 'object',
    object: { properties: { debug: { type: 'boolean', default: false } } },
  },
  install(app, options) {
    app.config.globalProperties.$my = { debug: options.debug };
  },
});

const app = createApp(App);
app.use(myPlugin, { debug: true });   // 选项会先过 schema 校验
app.mount('#app');
```

完整可运行版本见 [`plugins-demo/main.ts`](./plugins-demo/main.ts)。

---

## 四、怎么跑

### 前置：构建产物

示例通过 `@lytjs/*` 包名引用本仓的包，需要先有 `dist`：

```bash
# 在仓库根目录
npx tsx scripts/smart-build.ts
```

### 直接跑 Node 示例

```bash
node examples/getting-started/demo.mjs
npx tsx examples/ssr-complete-example.ts
```

### 跑浏览器示例

```bash
cd examples
pnpm dev          # 或 npx vite
```

然后打开 `http://localhost:5173/counter/index.html` 之类的地址。

> 本机 `pnpm` 可能因 native binary 校验失败而不可用（见
> `evaluation/PROJECT_STATUS_2026-11-02.md` §三），此时用 `npx vite`。

### 单独打开 HTML

`counter/`、`hello/` 等示例可以直接双击打开，但它们用 bare specifier
（`import { ... } from '@lytjs/core'`）导入，**浏览器原生不支持**。
需要 dev server 或 import map。

---

## 五、常用代码片段

### 1. 创建应用

```typescript
import { createApp, ref } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    return { count };
  },
  template: '<div>Count: {{ count }}</div>',
};

createApp(App).mount('#app');
```

### 2. 使用 UI 组件

```typescript
import { createApp } from '@lytjs/core';
import LytUI, { Button, Input } from '@lytjs/ui';

const App = {
  components: { Button, Input },
  template: `
    <div>
      <Input placeholder="请输入" />
      <Button type="primary">提交</Button>
    </div>
  `,
};

const app = createApp(App);
app.use(LytUI);
app.mount('#app');
```

### 3. 使用状态管理

```typescript
import { createApp } from '@lytjs/core';
import { defineStore, createPinia } from '@lytjs/store';

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++;
    },
  },
});

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
```

### 4. 使用路由

```typescript
import { createApp } from '@lytjs/core';
import { createRouter, RouterLink, RouterView } from '@lytjs/router';

const Home = { template: '<h1>首页</h1>' };
const About = { template: '<h1>关于</h1>' };

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

const App = {
  components: { RouterLink, RouterView },
  template: `
    <div>
      <RouterLink to="/">首页</RouterLink>
      <RouterLink to="/about">关于</RouterLink>
      <RouterView />
    </div>
  `,
};

const app = createApp(App);
app.use(router);
app.mount('#app');
```

---

## 六、三种渲染入口怎么选

| 入口 | 适用场景 | 说明 |
|---|---|---|
| `@lytjs/core` | **默认选择** | 含运行时模板编译器，支持 `template` 字符串（+52 KB gzip） |
| `@lytjs/core/runtime` | AOT 预编译 / 只写 `render()` / SSR | 不含编译器，体积小；`template` 会给出明确告警 |
| `@lytjs/core-signal` · `@lytjs/core-vnode` | 明确只用 Vapor / 只用 VDOM | 单一模式入口 |

```typescript
// 默认：模板可用
import { createApp, ref } from '@lytjs/core';

// 不要编译器（更小）
import { createApp } from '@lytjs/core/runtime';
```

> ⚠️ 早期示例注释里写过「支持 template 的 createApp 只在 `@lytjs/core-signal`」——
> **该说法已过时**，`@lytjs/core` 主入口早就带编译器了。

---

## 七、关于 workspace 依赖

示例用 `workspace:*` 引用本仓的包（monorepo 结构），好处是改源码立即生效、
版本一致、可做更激进的 tree-shaking。

**若要把示例当自己项目的起点**，请把 `package.json` 里的 `workspace:*`
改成具体版本号（如 `^7.0.0`）。

---

## 八、相关资源

- [快速上手](../docs/GETTING_STARTED.md)
- [项目状态总览](../evaluation/PROJECT_STATUS_2026-11-02.md)
- [主 README](../README.md)
