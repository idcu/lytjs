# LytJS 快速上手

> LytJS 是一个 TypeScript 编写的组件式前端框架，提供响应式状态、模板编译、SSR/SSG 和组件化能力。

## 前置条件

- Node.js >= 18
- 仓库已克隆并安装依赖（`npm install`）

## 第一步：构建产物

LytJS 以 monorepo 形式组织，使用前需要先构建各包的 dist 产物：

```bash
# 全量构建（发布集全部包）
npx tsx scripts/smart-build.ts

# 或只构建最小依赖链（core + reactivity + compiler + component + renderer + ssr）
npx tsx scripts/smart-build.ts --only @lytjs/core,@lytjs/ssr
```

构建完成后，每个 `packages/*/dist/` 目录下会有 `.mjs`（ESM）和 `.cjs`（CJS）产物。

## 第二步：运行最小 Demo

```bash
node examples/getting-started/demo.mjs
```

这个 demo 展示了框架的核心能力：`ref` 响应式、`computed` 派生、`v-if`/`v-for` 模板、子组件 props/emit、SSR + 客户端挂载。

## 核心概念

### 1. 创建应用

```js
import { createApp, ref } from '@lytjs/core';

const app = createApp({
  setup() {
    const count = ref(0);
    const inc = () => count.value++;
    return { count, inc };
  },
  template: `
    <div>
      <button @click="inc">+</button>
      <p>{{ count }}</p>
    </div>
  `,
});

app.mount(document.getElementById('app'));
```

**关键点**：

- `createApp()` 返回的应用实例支持 `mount(host)` 挂载到 DOM 元素
- `mount()` 返回 Promise，在 Node 环境中建议 `await`
- 模板编译器在 `createApp()` 调用时自动注入（从 `@lytjs/core` 主入口导入时）

### 2. 响应式状态

```js
import { ref, reactive, computed } from '@lytjs/core';

// ref：基础类型响应式
const count = ref(0);
count.value++; // 通过 .value 读写

// reactive：对象响应式
const state = reactive({ name: 'LytJS', version: 7 });
state.name = 'LytJS Pro'; // 直接修改属性

// computed：派生状态
const double = computed(() => count.value * 2);
```

### 3. 组件化

```js
import { createApp, h, ref } from '@lytjs/core';

// 子组件：通过 props 接收数据，通过 emit 发事件
const Child = {
  name: 'Child',
  props: { message: String },
  emits: ['reply'],
  template: `<button @click="$emit('reply')">{{ message }}</button>`,
};

const App = {
  name: 'App',
  components: { Child },
  setup() {
    const msg = ref('Hello');
    const onReply = () => {
      msg.value = 'Replied!';
    };
    return { msg, onReply };
  },
  template: `
    <div>
      <Child :message="msg" @reply="onReply" />
    </div>
  `,
};

createApp(App).mount(document.getElementById('app'));
```

### 4. 模板语法

| 语法                                 | 说明     |
| ------------------------------------ | -------- |
| `{{ expr }}`                         | 文本插值 |
| `:prop="expr"`                       | 属性绑定 |
| `@event="handler"`                   | 事件绑定 |
| `v-if="cond"` / `v-else`             | 条件渲染 |
| `v-for="(item, i) in list" :key="i"` | 列表渲染 |

### 5. SSR（服务端渲染）

```js
import { createApp, h, installTemplateCompiler } from '@lytjs/core';
import { renderToString } from '@lytjs/ssr';

// ⚠️ 关键：纯 SSR 进程不调 createApp()，需要手动注入模板编译器
installTemplateCompiler();

const html = renderToString(h(App));
// → "<div class="app">...</div>"
```

### 6. 异步 SSR

```js
import { h, installTemplateCompiler } from '@lytjs/core';
import { renderToStringAsync } from '@lytjs/ssr';

// ⚠️ 同步/异步 SSR 都需要注入编译器（除非组件只用 render() 函数）
installTemplateCompiler();

// 支持 async setup() 组件
const AsyncApp = {
  async setup() {
    const data = await fetch('/api/data').then((r) => r.json());
    return { data };
  },
  template: `<div>{{ data }}</div>`,
};

const html = await renderToStringAsync(h(AsyncApp));
```

### 7. 状态管理（Store）

```js
import { createPinia, defineStore } from '@lytjs/store';

const pinia = createPinia();

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});

const store = useCounterStore(pinia);
store.increment();
console.log(store.count); // 1
console.log(store.double); // 2
```

## 包导入路径速查

| 包名                  | 导入路径              | 主要导出                                                                                                        |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@lytjs/core`         | `@lytjs/core`         | `createApp`, `h`, `ref`, `computed`, `installTemplateCompiler`, `renderToString`, `compile`                     |
| `@lytjs/core/runtime` | `@lytjs/core/runtime` | 同上但**不含编译器**（体积小 52KB），不支持 `template` 选项；`rendererMode:'signal'` + 模板字符串会抛可操作错误 |
| `@lytjs/reactivity`   | `@lytjs/reactivity`   | `ref`, `reactive`, `computed`, `watch`, `effectScope`                                                           |
| `@lytjs/component`    | `@lytjs/component`    | `defineComponent`, `defineAsyncComponent`, `provide`, `inject`                                                  |
| `@lytjs/compiler`     | `@lytjs/compiler`     | `compile`, `compileTemplateToRender`                                                                            |
| `@lytjs/ssr`          | `@lytjs/ssr`          | `renderToString`, `renderToStringAsync`, `renderToStream`, `generateStaticPages`                                |
| `@lytjs/store`        | `@lytjs/store`        | `defineStore`, `createPinia`, `storeToRefs`                                                                     |
| `@lytjs/vdom`         | `@lytjs/vdom`         | `createVNode`, `Fragment`, `Text`, `Comment`, `Teleport`, `Suspense`                                            |

> ⚠️ **`h` 不在 `@lytjs/vdom` 里**。`@lytjs/vdom` 只导出 `createVNode`；
> `h` 由 `@lytjs/core` 导出。若组件只用 `createVNode` 构建视图（不写 `template`），
> 可以只依赖 `@lytjs/vdom` + `@lytjs/ssr`，**不必**引入 82KB 的 core 主入口。
> 从 `@lytjs/vdom` 取 `h` 会在运行时报 `does not provide an export named 'h'`
> （2026-11-02 实测踩到）。

## 已知注意事项

1. **SSR 单独使用时必须注入编译器**：`createApp()` 内部会自动注入，但纯 SSR 进程不创建 app，需手动调 `installTemplateCompiler()`。
2. **`mount()` 返回 Promise**：在 Node 环境中不 await 可能导致空白页且不报错。
3. **模板表达式只支持简单属性路径**：`@click="count = count + 1"` 会编译报错，请在 `setup` 里定义方法再绑定。
4. **`@lytjs/core` vs `@lytjs/core/runtime`**：主入口含编译器（82KB gzip），runtime 入口不含（8.9KB gzip）。AOT 预编译或只用 `render()` 函数的用户选 runtime 入口。runtime 入口下 `rendererMode:'signal'` 的模板字符串会**抛错**并指向主入口 / `@lytjs/compiler` / `@lytjs/renderer/signal`（ADR 0030）。

## 项目状态

- 全仓发布集全部包可构建
- 384 文件 / 8432 用例全绿
- 门禁全通过
- 详见 `evaluation/PROJECT_STATUS_2026-11-02.md`
